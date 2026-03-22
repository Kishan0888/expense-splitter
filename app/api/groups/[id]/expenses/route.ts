import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendPushToGroupMembers } from '@/lib/push';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sql = getDb();
    const groupId = Number(params.id);
    const body = await req.json();
    const title = String(body.title || '').trim();
    const amount = Number(body.amount);

    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });

    const members = await sql`SELECT user_id FROM group_members WHERE group_id = ${groupId}`;
    if (!members.length) return NextResponse.json({ error: 'Group has no members' }, { status: 404 });

    const memberCount = members.length;
    const sharePerPerson = Math.round((amount / memberCount) * 100) / 100;

    const inserted = await sql`
      INSERT INTO expenses (group_id, paid_by, title, amount, split_type)
      VALUES (${groupId}, ${user.userId}, ${title}, ${amount}, 'equal')
      RETURNING id
    `;
    const expenseId = Number(inserted[0].id);

    for (const m of members) {
      await sql`
        INSERT INTO expense_splits (expense_id, user_id, amount)
        VALUES (${expenseId}, ${Number(m.user_id)}, ${sharePerPerson})
      `;
    }

    // Get payer name and group name for notification
    const [payer] = await sql`SELECT name FROM users WHERE id = ${user.userId}`;
    const [group] = await sql`SELECT name FROM groups WHERE id = ${groupId}`;

    // Send push notification to all other group members (non-blocking)
    sendPushToGroupMembers({
      groupId,
      excludeUserId: user.userId,
      payload: {
        title: `💸 New expense in ${group?.name || 'your group'}`,
        body: `${payer?.name || 'Someone'} added "${title}" — ₹${amount.toFixed(0)} (₹${sharePerPerson.toFixed(0)} each)`,
        url: `/groups/${groupId}`,
      },
    }).catch(console.error);

    return NextResponse.json({ success: true, expenseId }, { status: 201 });
  } catch (err) {
    console.error('POST /expenses error:', err);
    return NextResponse.json({ error: 'Server error: ' + String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sql = getDb();
    const groupId = Number(params.id);
    const expenses = await sql`
      SELECT DISTINCT e.id, e.title, e.amount::float AS amount,
        e.paid_by, e.split_type, e.created_at, u.name AS paid_by_name
      FROM expenses e
      JOIN users u ON u.id = e.paid_by
      WHERE e.group_id = ${groupId}
      ORDER BY e.created_at DESC
    `;
    return NextResponse.json(expenses.map((e: Record<string, unknown>) => ({
      id: Number(e.id), title: String(e.title), amount: Number(e.amount),
      paid_by: Number(e.paid_by), paid_by_name: String(e.paid_by_name),
      split_type: String(e.split_type), created_at: String(e.created_at),
    })));
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
