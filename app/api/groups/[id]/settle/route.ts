import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendSettlementNotification } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const { toUserId, amount } = await req.json();

  if (!toUserId || !amount) return NextResponse.json({ error: 'toUserId and amount required' }, { status: 400 });

  await sql`
    INSERT INTO settlements (group_id, paid_by, paid_to, amount)
    VALUES (${groupId}, ${user.userId}, ${toUserId}, ${amount})
  `;

  const [toUser] = await sql`SELECT name, email FROM users WHERE id = ${toUserId}`;
  const [fromUser] = await sql`SELECT name FROM users WHERE id = ${user.userId}`;
  const [group] = await sql`SELECT name FROM groups WHERE id = ${groupId}`;

  await sendSettlementNotification({
    toEmail: toUser.email,
    toName: toUser.name,
    fromName: fromUser.name,
    amount: Number(amount),
    groupName: group.name,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
