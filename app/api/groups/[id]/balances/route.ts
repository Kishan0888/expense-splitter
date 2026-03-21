import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { computeGroupBalances, simplifyDebts } from '@/lib/simplify';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);

  const isMember = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${user.userId}
  `;
  if (!isMember.length) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const balances = await computeGroupBalances(sql, groupId);
  const transactions = simplifyDebts(balances);

  return NextResponse.json({
    balances: balances.map(b => ({
      userId: b.userId,
      name: b.name,
      email: b.email,
      netBalance: b.netBalance,
    })),
    transactions: transactions.map(t => ({
      fromUserId: t.fromUserId,
      fromName: t.fromName,
      fromEmail: t.fromEmail,
      toUserId: t.toUserId,
      toName: t.toName,
      toEmail: t.toEmail,
      amount: t.amount,
    })),
  });
}
