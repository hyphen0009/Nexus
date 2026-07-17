import type { Prisma, Tournament, User } from '@prisma/client';
import { prisma } from './prisma';
import { ensureSeedData } from './seed';

type RegistrationRecord = Prisma.RegistrationGetPayload<{
  include: { teammates: true };
}>;

export type TournamentCard = {
  id: string;
  title: string;
  description: string;
  game: string;
  matchType: string;
  prizePool: string;
  entryFee: number;
  entryFeeLabel: string;
  bannerImage: string;
  registrationDeadline: string;
  registrationDeadlineLabel: string;
  tournamentDate: string;
  tournamentDateLabel: string;
  startTime: string;
  maxPlayers: number;
  map: string;
  platform: string;
  status: string;
  isPublished: boolean;
  isArchived: boolean;
  approvedCount: number;
  pendingCount: number;
};

export type TournamentDetails = TournamentCard & {
  rules: string;
  discordLink: string | null;
  whatsappLink: string | null;
  paymentUrl: string;
  upiId: string | null;
  qrCodeImage: string | null;
  paymentInstructions: string;
  paymentDeadline: string;
  paymentDeadlineLabel: string;
};

export type RegistrationView = {
  id: string;
  userId: string;
  tournamentId: string;
  teamName: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  tournamentName: string;
  game: string;
  matchType: string;
  entryFee: number;
  entryFeeLabel: string;
  paymentScreenshot: string;
  paymentScreenshotName: string;
  paymentStatus: string;
  status: string;
  submittedAt: string;
  submittedAtLabel: string;
  registrationDateLabel: string;
  reviewedAtLabel: string | null;
  reviewerNote: string | null;
  teammates: {
    id: string;
    name: string;
    gameName: string;
    uid: string;
  }[];
};

export type AdminTournamentView = TournamentDetails & {
  createdAtLabel: string;
  updatedAtLabel: string;
};

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAtLabel: string;
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatEntryFee(entryFee: number) {
  return `Rs. ${entryFee}`;
}

function toIso(date: Date) {
  return date.toISOString();
}

function formatDate(date: Date) {
  return dateFormatter.format(date);
}

function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function serializeTournamentBase(
  tournament: Tournament,
  counts: { approvedCount: number; pendingCount: number }
): TournamentCard {
  return {
    id: tournament.id,
    title: tournament.title,
    description: tournament.description,
    game: tournament.game,
    matchType: tournament.matchType,
    prizePool: tournament.prizePool,
    entryFee: tournament.entryFee,
    entryFeeLabel: formatEntryFee(tournament.entryFee),
    bannerImage: tournament.bannerImage,
    registrationDeadline: toIso(tournament.registrationDeadline),
    registrationDeadlineLabel: formatDate(tournament.registrationDeadline),
    tournamentDate: toIso(tournament.tournamentDate),
    tournamentDateLabel: formatDate(tournament.tournamentDate),
    startTime: tournament.startTime,
    maxPlayers: tournament.maxPlayers,
    map: tournament.map,
    platform: tournament.platform,
    status: statusLabel(tournament.status),
    isPublished: tournament.isPublished,
    isArchived: tournament.isArchived,
    approvedCount: counts.approvedCount,
    pendingCount: counts.pendingCount,
  };
}

function serializeTournamentDetails(
  tournament: Tournament,
  counts: { approvedCount: number; pendingCount: number }
): TournamentDetails {
  return {
    ...serializeTournamentBase(tournament, counts),
    rules: tournament.rules,
    discordLink: tournament.discordLink,
    whatsappLink: tournament.whatsappLink,
    paymentUrl: tournament.paymentUrl,
    upiId: tournament.upiId,
    qrCodeImage: tournament.qrCodeImage,
    paymentInstructions: tournament.paymentInstructions,
    paymentDeadline: toIso(tournament.paymentDeadline),
    paymentDeadlineLabel: formatDate(tournament.paymentDeadline),
  };
}

function serializeRegistration(registration: RegistrationRecord): RegistrationView {
  return {
    id: registration.id,
    userId: registration.userId,
    tournamentId: registration.tournamentId,
    teamName: registration.teamName,
    username: registration.username,
    fullName: registration.fullName,
    email: registration.email,
    phone: registration.phone,
    tournamentName: registration.tournamentName,
    game: registration.game,
    matchType: registration.matchType,
    entryFee: registration.entryFee,
    entryFeeLabel: formatEntryFee(registration.entryFee),
    paymentScreenshot: registration.paymentScreenshot,
    paymentScreenshotName: registration.paymentScreenshotName,
    paymentStatus: statusLabel(registration.paymentStatus),
    status: statusLabel(registration.status),
    submittedAt: toIso(registration.submittedAt),
    submittedAtLabel: formatDateTime(registration.submittedAt),
    registrationDateLabel: formatDate(registration.registrationDate),
    reviewedAtLabel: registration.reviewedAt ? formatDateTime(registration.reviewedAt) : null,
    reviewerNote: registration.reviewerNote,
    teammates: registration.teammates.map((teammate) => ({
      id: teammate.id,
      name: teammate.name,
      gameName: teammate.gameName,
      uid: teammate.uid,
    })),
  };
}

async function getCounts(tournamentId: string) {
  const [approvedCount, pendingCount] = await Promise.all([
    prisma.registration.count({ where: { tournamentId, status: 'APPROVED' } }),
    prisma.registration.count({ where: { tournamentId, status: 'PENDING' } }),
  ]);

  return { approvedCount, pendingCount };
}

export async function getPublishedTournaments() {
  await ensureSeedData();

  const tournaments = await prisma.tournament.findMany({
    where: { isPublished: true, isArchived: false },
    orderBy: [{ tournamentDate: 'asc' }],
  });

  return Promise.all(tournaments.map(async (tournament) => serializeTournamentBase(tournament, await getCounts(tournament.id))));
}

export async function getFeaturedTournaments() {
  const tournaments = await getPublishedTournaments();
  return tournaments.slice(0, 3);
}

export async function getRecentApprovedTeams(limit = 4) {
  await ensureSeedData();

  const registrations = await prisma.registration.findMany({
    where: { status: 'APPROVED' },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      teamName: true,
      tournamentName: true,
    },
  });

  return registrations;
}

export async function getTournamentDetails(id: string) {
  await ensureSeedData();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament || tournament.isArchived || !tournament.isPublished) {
    return null;
  }

  return serializeTournamentDetails(tournament, await getCounts(tournament.id));
}

export async function getApprovedRegistrationsForTournament(tournamentId: string) {
  await ensureSeedData();

  const registrations = await prisma.registration.findMany({
    where: { tournamentId, status: 'APPROVED' },
    orderBy: { submittedAt: 'asc' },
    include: { teammates: true },
  });

  return registrations.map(serializeRegistration);
}

export async function getRegistrationForUser(tournamentId: string, userId: string) {
  await ensureSeedData();

  const registration = await prisma.registration.findUnique({
    where: { userId_tournamentId: { userId, tournamentId } },
    include: { teammates: true },
  });

  return registration ? serializeRegistration(registration) : null;
}

export async function getUserRegistrations(userId: string) {
  await ensureSeedData();

  const registrations = await prisma.registration.findMany({
    where: { userId },
    orderBy: { submittedAt: 'desc' },
    include: { teammates: true },
  });

  return registrations.map(serializeRegistration);
}

export async function getUserNotifications(userId: string): Promise<NotificationView[]> {
  await ensureSeedData();

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    type: statusLabel(notification.type),
    title: notification.title,
    message: notification.message,
    isRead: Boolean(notification.readAt),
    createdAtLabel: formatDateTime(notification.createdAt),
  }));
}

export async function getPlatformStats() {
  await ensureSeedData();

  const [tournamentCount, approvedRegistrations, pendingRegistrations, playerCount] = await Promise.all([
    prisma.tournament.count({ where: { isPublished: true, isArchived: false } }),
    prisma.registration.count({ where: { status: 'APPROVED' } }),
    prisma.registration.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: 'USER' } }),
  ]);

  return {
    tournamentCount,
    approvedRegistrations,
    pendingRegistrations,
    playerCount,
  };
}

export async function getAdminSnapshot() {
  await ensureSeedData();

  const [registrations, tournaments, stats] = await Promise.all([
    prisma.registration.findMany({
      orderBy: { submittedAt: 'desc' },
      include: { teammates: true },
    }),
    prisma.tournament.findMany({
      orderBy: [{ isArchived: 'asc' }, { tournamentDate: 'asc' }],
    }),
    getPlatformStats(),
  ]);

  const adminTournaments = await Promise.all(
    tournaments.map(async (tournament): Promise<AdminTournamentView> => {
      const counts = await getCounts(tournament.id);
      return {
        ...serializeTournamentDetails(tournament, counts),
        createdAtLabel: formatDateTime(tournament.createdAt),
        updatedAtLabel: formatDateTime(tournament.updatedAt),
      };
    })
  );

  return {
    registrations: registrations.map(serializeRegistration),
    tournaments: adminTournaments,
    stats,
  };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}
