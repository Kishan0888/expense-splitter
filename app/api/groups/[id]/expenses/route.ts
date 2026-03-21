import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const body = await req.json();
  const title = String(body.title || '').trim();
  const amount = Number(body.amount);

  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });

  // Get all members
  const members = await sql`
    SELECT u.id, u.name, u.email FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${groupId}
  `;
  if (!members.length) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const memberCount = members.length;
  const sharePerPerson = Math.round((amount / memberCount) * 100) / 100;

  // Insert expense
  const newExpenses = await sql`
    INSERT INTO expenses (group_id, paid_by, title, amount, split_type)
    VALUES (${groupId}, ${user.userId}, ${title}, ${amount}, 'equal')
    RETURNING id
  `;
  const expenseId = Number(newExpenses[0].id);

  // Insert splits for each member
  for (const m of members) {
    await sql`
      INSERT INTO expense_splits (expense_id, user_id, amount)
      VALUES (${expenseId}, ${Number(m.id)}, ${sharePerPerson})
    `;
  }

  return NextResponse.json({ success: true, expenseId }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);

  const expenses = await sql`
    SELECT e.id, e.title, e.amount::float as amount, e.paid_by, e.split_type, e.created_at, u.name as paid_by_name
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ${groupId}
    ORDER BY e.created_at DESC
  `;

  return NextResponse.json(expenses.map((e: Record<string, unknown>) => ({
    id: Number(e.id),
    title: String(e.title),
    amount: Number(e.amount),
    paid_by: Number(e.paid_by),
    paid_by_name: String(e.paid_by_name),
    split_type: String(e.split_type),
    created_at: String(e.created_at),
  })));
}
