import { NextResponse } from 'next/server';
import { authErrorResponse, isSafeOrigin, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const action = readString('action' in body ? body.action : '');
    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found.' }, { status: 404 });
    }

    if (action === 'duplicate') {
      const duplicate = await prisma.tournament.create({
        data: {
          title: `${tournament.title} Copy`,
          description: tournament.description,
          game: tournament.game,
          matchType: tournament.matchType,
          prizePool: tournament.prizePool,
          entryFee: tournament.entryFee,
          bannerImage: tournament.bannerImage,
          gameLogo: tournament.gameLogo,
          registrationDeadline: tournament.registrationDeadline,
          tournamentDate: tournament.tournamentDate,
          startTime: tournament.startTime,
          maxPlayers: tournament.maxPlayers,
          rules: tournament.rules,
          map: tournament.map,
          platform: tournament.platform,
          discordLink: tournament.discordLink,
          whatsappLink: tournament.whatsappLink,
          paymentUrl: tournament.paymentUrl,
          upiId: tournament.upiId,
          qrCodeImage: tournament.qrCodeImage,
          paymentInstructions: tournament.paymentInstructions,
          paymentDeadline: tournament.paymentDeadline,
          status: tournament.status,
          isPublished: false,
          isArchived: false,
        },
      });

      return NextResponse.json({ tournament: duplicate });
    }

    if (['publish', 'unpublish', 'archive', 'restore'].includes(action)) {
      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          isPublished: action === 'publish' || action === 'restore',
          isArchived: action === 'archive' ? true : action === 'restore' ? false : tournament.isArchived,
          status: action === 'archive' ? 'ARCHIVED' : tournament.status,
        },
      });

      return NextResponse.json({ tournament: updated });
    }

    const tournamentDate = readDate('tournamentDate' in body ? body.tournamentDate : '', tournament.tournamentDate);
    const registrationDeadline = readDate(
      'registrationDeadline' in body ? body.registrationDeadline : '',
      tournament.registrationDeadline
    );

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        title: readString('title' in body ? body.title : '') || tournament.title,
        description: readString('description' in body ? body.description : '') || tournament.description,
        game: readString('game' in body ? body.game : '') || tournament.game,
        matchType: readString('matchType' in body ? body.matchType : '') || tournament.matchType,
        prizePool: readString('prizePool' in body ? body.prizePool : '') || tournament.prizePool,
        entryFee: readInt('entryFee' in body ? body.entryFee : tournament.entryFee, tournament.entryFee),
        bannerImage: readString('bannerImage' in body ? body.bannerImage : '') || tournament.bannerImage,
        gameLogo: readString('gameLogo' in body ? body.gameLogo : '') || tournament.gameLogo,
        registrationDeadline,
        tournamentDate,
        startTime: readString('startTime' in body ? body.startTime : '') || tournament.startTime,
        maxPlayers: readInt('maxPlayers' in body ? body.maxPlayers : tournament.maxPlayers, tournament.maxPlayers),
        rules: readString('rules' in body ? body.rules : '') || tournament.rules,
        map: readString('map' in body ? body.map : '') || tournament.map,
        platform: readString('platform' in body ? body.platform : '') || tournament.platform,
        discordLink: readString('discordLink' in body ? body.discordLink : '') || tournament.discordLink,
        whatsappLink: readString('whatsappLink' in body ? body.whatsappLink : '') || tournament.whatsappLink,
        paymentUrl: readString('paymentUrl' in body ? body.paymentUrl : '') || tournament.paymentUrl,
        upiId: readString('upiId' in body ? body.upiId : '') || tournament.upiId,
        qrCodeImage: readString('qrCodeImage' in body ? body.qrCodeImage : '') || tournament.qrCodeImage,
        paymentInstructions:
          readString('paymentInstructions' in body ? body.paymentInstructions : '') || tournament.paymentInstructions,
        paymentDeadline: registrationDeadline,
        status: ['UPCOMING', 'LIVE', 'COMPLETED', 'ARCHIVED'].includes(readString('status' in body ? body.status : ''))
          ? (readString('status' in body ? body.status : '') as 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'ARCHIVED')
          : tournament.status,
      },
    });

    await prisma.notification.createMany({
      data: (
        await prisma.registration.findMany({
          where: { tournamentId: id },
          select: { userId: true },
        })
      ).map((registration) => ({
        userId: registration.userId,
        type: 'TOURNAMENT_UPDATED' as const,
        title: 'Tournament updated',
        message: `${updated.title} details were updated by the admin team.`,
      })),
    });

    return NextResponse.json({ tournament: updated });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.message)) {
      return authErrorResponse(error);
    }

    console.error(error);
    return NextResponse.json({ error: 'Unable to update tournament.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.tournament.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.message)) {
      return authErrorResponse(error);
    }

    console.error(error);
    return NextResponse.json({ error: 'Unable to delete tournament.' }, { status: 500 });
  }
}
