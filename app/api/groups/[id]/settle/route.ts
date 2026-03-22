import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendPushToGroupMembers } from '@/lib/push';

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

  // Get names for notification
  const [payer]  = await sql`SELECT name FROM users WHERE id = ${user.userId}`;
  const [payee]  = await sql`SELECT name FROM users WHERE id = ${toUserId}`;
  const [group]  = await sql`SELECT name FROM groups WHERE id = ${groupId}`;

  // Notify the person who received payment
  sendPushToGroupMembers({
    groupId,
    excludeUserId: user.userId,
    payload: {
      title: `✅ Payment settled in ${group?.name || 'your group'}`,
      body: `${payer?.name || 'Someone'} paid ${payee?.name || 'you'} ₹${amount.toFixed(0)}`,
      url: `/groups/${groupId}`,
    },
  }).catch(console.error);

  return NextResponse.json({ success: true });
}
