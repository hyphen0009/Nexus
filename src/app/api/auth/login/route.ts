import { NextResponse } from 'next/server';
import { isSafeOrigin, setSessionCookie, verifyPassword } from '@/lib/auth';
import { publicUser } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed';

export const runtime = 'nodejs';

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  if (!isSafeOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  await ensureSeedData();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = readString('email' in body ? body.email : '').toLowerCase();
  const password = readString('password' in body ? body.password : '');
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ user: publicUser(user) });
  setSessionCookie(response, user);
  return response;
}
