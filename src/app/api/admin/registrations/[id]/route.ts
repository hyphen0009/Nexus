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

    const status = readString('status' in body ? body.status : '').toUpperCase();
    const reviewerNote = readString('reviewerNote' in body ? body.reviewerNote : '');

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Status must be APPROVED or REJECTED.' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found.' }, { status: 404 });
    }

    if (status === 'APPROVED') {
      const approvedCount = await prisma.registration.count({
        where: {
          tournamentId: registration.tournamentId,
          status: 'APPROVED',
          NOT: { id: registration.id },
        },
      });

      if (approvedCount >= registration.tournament.maxPlayers) {
        return NextResponse.json({ error: 'This tournament is already full.' }, { status: 409 });
      }
    }

    const updatedRegistration = await prisma.registration.update({
      where: { id },
      data: {
        status: status as 'APPROVED' | 'REJECTED',
        paymentStatus: status as 'APPROVED' | 'REJECTED',
        reviewedAt: new Date(),
        reviewerNote: reviewerNote || null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: updatedRegistration.userId,
        type: status === 'APPROVED' ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED',
        title: status === 'APPROVED' ? 'Registration approved' : 'Registration rejected',
        message:
          status === 'APPROVED'
            ? `${updatedRegistration.tournamentName} is approved. Your match slot is confirmed.`
            : `${updatedRegistration.tournamentName} was rejected. ${reviewerNote || 'Please contact support for details.'}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && ['UNAUTHENTICATED', 'FORBIDDEN'].includes(error.message)) {
      return authErrorResponse(error);
    }

    console.error(error);
    return NextResponse.json({ error: 'Unable to update registration.' }, { status: 500 });
  }
}
