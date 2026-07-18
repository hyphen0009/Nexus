import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { authErrorResponse, isSafeOrigin, requireUser } from '@/lib/auth';
import { getRegistrationForUser } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed';

export const runtime = 'nodejs';

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);

function readString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function readTeammates(formData: FormData) {
  const raw = readString(formData.get('teammates'));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const name = 'name' in entry && typeof entry.name === 'string' ? entry.name.trim() : '';
        const gameName = 'gameName' in entry && typeof entry.gameName === 'string' ? entry.gameName.trim() : '';
        const uid = 'uid' in entry && typeof entry.uid === 'string' ? entry.uid.trim() : '';

        if (!name && !gameName && !uid) {
          return null;
        }

        return { name, gameName, uid };
      })
      .filter((entry): entry is { name: string; gameName: string; uid: string } => Boolean(entry));
  } catch {
    return [];
  }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-90) || 'payment-proof.png';
}

function isSupportedImageSignature(type: string, bytes: Buffer) {
  const isPng =
    type === 'image/png' &&
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJpeg =
    type === 'image/jpeg' &&
    bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  return isPng || isJpeg;
}

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    await ensureSeedData();
    const user = await requireUser();
    const formData = await request.formData();
    const tournamentId = readString(formData.get('tournamentId'));
    const teamName = readString(formData.get('teamName'));
    const username = readString(formData.get('username')) || user.username;
    const fullName = readString(formData.get('fullName')) || user.fullName;
    const email = (readString(formData.get('email')) || user.email).toLowerCase();
    const phone = readString(formData.get('phone')) || user.phone || '';
    const teammates = readTeammates(formData);
    const proof = formData.get('paymentScreenshot');

    if (!tournamentId) {
      return NextResponse.json({ error: 'Tournament is required.' }, { status: 400 });
    }

    if (teamName.length < 2 || username.length < 2 || fullName.length < 2 || !isEmail(email) || phone.length < 7) {
      return NextResponse.json(
        { error: 'Enter a team name, valid username, full name, email, and phone number.' },
        { status: 400 }
      );
    }

    if (
      teammates.some(
        (teammate) => teammate.name.length < 2 || teammate.gameName.length < 2 || teammate.uid.length < 2
      )
    ) {
      return NextResponse.json(
        { error: 'Each teammate needs a name, in-game name, and UID.' },
        { status: 400 }
      );
    }

    if (!(proof instanceof File)) {
      return NextResponse.json({ error: 'Payment screenshot is required.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(proof.type) || proof.size > MAX_SCREENSHOT_SIZE) {
      return NextResponse.json({ error: 'Upload a JPG, JPEG, or PNG screenshot under 5 MB.' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!tournament || !tournament.isPublished || tournament.isArchived) {
      return NextResponse.json({ error: 'Tournament is not available for registration.' }, { status: 404 });
    }

    if (tournament.paymentDeadline.getTime() < Date.now()) {
      return NextResponse.json({ error: 'The payment deadline has passed for this tournament.' }, { status: 409 });
    }

    const existingRegistration = await prisma.registration.findUnique({
      where: { userId_tournamentId: { userId: user.id, tournamentId } },
    });

    if (existingRegistration && existingRegistration.status !== 'REJECTED') {
      return NextResponse.json(
        { error: `Your registration is already ${existingRegistration.status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    const approvedCount = await prisma.registration.count({
      where: { tournamentId, status: 'APPROVED' },
    });

    if (approvedCount >= tournament.maxPlayers) {
      return NextResponse.json({ error: 'This tournament is already full.' }, { status: 409 });
    }

    const fileBytes = Buffer.from(await proof.arrayBuffer());

    if (!isSupportedImageSignature(proof.type, fileBytes)) {
      return NextResponse.json({ error: 'The uploaded file does not look like a valid JPG or PNG image.' }, { status: 400 });
    }

    const fileName = `${Date.now()}-${randomUUID()}-${safeFileName(proof.name)}`;
    const proofDataUrl = `data:${proof.type};base64,${fileBytes.toString('base64')}`;

    const registrationData = {
      teamName,
      username,
      fullName,
      email,
      phone,
      tournamentName: tournament.title,
      game: tournament.game,
      matchType: tournament.matchType,
      entryFee: tournament.entryFee,
      paymentScreenshot: proofDataUrl,
      paymentScreenshotName: fileName,
      paymentStatus: 'PENDING' as const,
      status: 'PENDING' as const,
      submittedAt: new Date(),
      registrationDate: new Date(),
      reviewedAt: null,
      reviewerNote: null,
    };

    if (existingRegistration) {
      await prisma.registration.update({
        where: { id: existingRegistration.id },
        data: {
          ...registrationData,
          teammates: {
            deleteMany: {},
            create: teammates,
          },
        },
      });
    } else {
      await prisma.registration.create({
        data: {
          ...registrationData,
          userId: user.id,
          tournamentId,
          teammates: {
            create: teammates,
          },
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'REGISTRATION_SUBMITTED',
        title: 'Registration submitted',
        message: `${tournament.title} is pending payment verification.`,
      },
    });

    const registration = await getRegistrationForUser(tournamentId, user.id);
    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.message)) {
      return authErrorResponse(error);
    }

    console.error(error);
    return NextResponse.json({ error: 'Unable to submit registration right now.' }, { status: 500 });
  }
}
