import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
};

type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
  exp: number;
};

const SESSION_COOKIE = 'nexcup_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET must be set to a long random value in production.');
    }

    return 'development-secret-change-before-production-32';
  }

  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
  return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

function createSessionToken(payload: SessionPayload) {
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');

  if (!body || !signature) {
    return null;
  }

  const expected = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SessionPayload;

    if (!payload.sub || !payload.email || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const hashBuffer = Buffer.from(hash, 'hex');
  const candidate = scryptSync(password, salt, 64);

  return hashBuffer.length === candidate.length && timingSafeEqual(hashBuffer, candidate);
}

export function setSessionCookie(response: NextResponse, user: SessionUser) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp,
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
    },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return user;
}

export function isSafeOrigin(request: Request) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host');
    const requestHost = forwardedHost ?? request.headers.get('host') ?? requestUrl.host;

    return isMatchingOrigin(originUrl, requestUrl.protocol, requestHost);
  } catch {
    return false;
  }
}

function isMatchingOrigin(originUrl: URL, expectedProtocol: string, expectedHost: string) {
  if (originUrl.protocol !== expectedProtocol) {
    return false;
  }

  const [expectedHostname, expectedPort = ''] = splitHost(expectedHost);
  const [originHostname, originPort = ''] = splitHost(originUrl.host);

  if (originPort !== expectedPort) {
    return false;
  }

  return normalizeHostname(originHostname) === normalizeHostname(expectedHostname);
}

function splitHost(host: string) {
  if (host.startsWith('[')) {
    const closingIndex = host.indexOf(']');
    const hostname = host.slice(1, closingIndex);
    const port = host.slice(closingIndex + 2);
    return [hostname, port] as const;
  }

  const separatorIndex = host.lastIndexOf(':');

  if (separatorIndex === -1 || host.indexOf(':') !== separatorIndex) {
    return [host, ''] as const;
  }

  return [host.slice(0, separatorIndex), host.slice(separatorIndex + 1)] as const;
}

function normalizeHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase();

  if (normalized === '127.0.0.1' || normalized === '::1' || normalized === '[::1]') {
    return 'localhost';
  }

  return normalized;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
    return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  }

  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
}
