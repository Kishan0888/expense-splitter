import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(payload: { userId: number; email: string }) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number; email: string } {
  return jwt.verify(token, SECRET) as { userId: number; email: string };
}

export function getAuthUser(req: NextRequest): { userId: number; email: string } | null {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}
