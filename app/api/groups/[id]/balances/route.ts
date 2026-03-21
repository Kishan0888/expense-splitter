import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { computeGroupBalances, simplifyDebts } from '@/lib/simplify';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sql = getDb();
    const groupId = Number(params.id);

    const memberCheck = await sql`
      SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${user.userId}
    `;
    if (!memberCheck.length) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

    const balances = await computeGroupBalances(sql, groupId);
    const transactions = simplifyDebts(balances);

    const response = NextResponse.json({
      balances: balances.map(b => ({
        userId: Number(b.userId),
        name: String(b.name),
        netBalance: Number(b.netBalance.toFixed(2)),
      })),
      transactions: transactions.map(t => ({
        fromUserId: Number(t.fromUserId),
        fromName: String(t.fromName),
        toUserId: Number(t.toUserId),
        toName: String(t.toName),
        amount: Number(t.amount),
      })),
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (err) {
    console.error('GET /balances error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
