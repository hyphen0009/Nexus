import { NextResponse } from 'next/server';
import { authErrorResponse, isSafeOrigin, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readDate(value: unknown, fallback: Date) {
  const parsed = new Date(readString(value));
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    await requireAdmin();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const title = readString('title' in body ? body.title : '');
    const game = readString('game' in body ? body.game : '');
    const paymentUrl = readString('paymentUrl' in body ? body.paymentUrl : '');
    const entryFee = readInt('entryFee' in body ? body.entryFee : 0, 0);

    if (title.length < 3 || game.length < 2 || entryFee < 0 || paymentUrl.length < 8) {
      return NextResponse.json({ error: 'Title, game, entry fee, and payment URL are required.' }, { status: 400 });
    }

    const tournamentDate = readDate('tournamentDate' in body ? body.tournamentDate : '', new Date(Date.now() + 86400000 * 14));
    const deadline = readDate('registrationDeadline' in body ? body.registrationDeadline : '', new Date(tournamentDate.getTime() - 86400000));

    const tournament = await prisma.tournament.create({
      data: {
        title,
        description: readString('description' in body ? body.description : '') || 'Competitive tournament with admin-verified entry.',
        game,
        matchType: readString('matchType' in body ? body.matchType : '') || 'Solo',
        prizePool: readString('prizePool' in body ? body.prizePool : '') || 'TBA',
        entryFee,
        bannerImage: readString('bannerImage' in body ? body.bannerImage : '') || '/assets/esports-arena-banner.png',
        gameLogo: readString('gameLogo' in body ? body.gameLogo : '') || null,
        registrationDeadline: deadline,
        tournamentDate,
        startTime: readString('startTime' in body ? body.startTime : '') || '8:00 PM IST',
        maxPlayers: readInt('maxPlayers' in body ? body.maxPlayers : 64, 64),
        rules: readString('rules' in body ? body.rules : '') || 'Follow admin instructions, fair-play rules, and check-in deadlines.',
        map: readString('map' in body ? body.map : '') || 'TBA',
        platform: readString('platform' in body ? body.platform : '') || 'Cross-platform',
        discordLink: readString('discordLink' in body ? body.discordLink : '') || null,
        whatsappLink: readString('whatsappLink' in body ? body.whatsappLink : '') || null,
        paymentUrl,
        upiId: readString('upiId' in body ? body.upiId : '') || null,
        qrCodeImage: readString('qrCodeImage' in body ? body.qrCodeImage : '') || null,
        paymentInstructions:
          readString('paymentInstructions' in body ? body.paymentInstructions : '') ||
          'Pay the configured entry fee and upload a clear proof screenshot.',
        paymentDeadline: deadline,
        status: 'UPCOMING',
        isPublished: Boolean('isPublished' in body ? body.isPublished : true),
      },
    });

    return NextResponse.json({ tournament }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.message)) {
      return authErrorResponse(error);
    }

    console.error(error);
    return NextResponse.json({ error: 'Unable to create tournament.' }, { status: 500 });
  }
}
