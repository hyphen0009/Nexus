import { NextResponse } from 'next/server';
import { hashPassword, isSafeOrigin, setSessionCookie } from '@/lib/auth';
import { publicUser } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { ensureSeedData } from '@/lib/seed';

export const runtime = 'nodejs';

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  const username = readString('username' in body ? body.username : '');
  const fullName = readString('fullName' in body ? body.fullName : '');
  const email = readString('email' in body ? body.email : '').toLowerCase();
  const phone = readString('phone' in body ? body.phone : '');
  const password = readString('password' in body ? body.password : '');

  if (username.length < 3 || fullName.length < 2 || !isEmail(email) || password.length < 8) {
    return NextResponse.json(
      { error: 'Enter a username, full name, valid email, and a password with at least 8 characters.' },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      username,
      fullName,
      email,
      phone: phone || null,
      passwordHash: hashPassword(password),
    },
  });

  const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  setSessionCookie(response, user);
  return response;
}
