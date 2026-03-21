import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const body = await req.json();
  const toUserId = Number(body.toUserId);
  const amount = Number(body.amount);

  if (!toUserId || !amount) return NextResponse.json({ error: 'toUserId and amount required' }, { status: 400 });

  await sql`
    INSERT INTO settlements (group_id, paid_by, paid_to, amount)
    VALUES (${groupId}, ${user.userId}, ${toUserId}, ${amount})
  `;

  return NextResponse.json({ success: true });
}
