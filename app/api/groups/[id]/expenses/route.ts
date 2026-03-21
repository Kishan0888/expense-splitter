import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendExpenseNotification } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const body = await req.json();
  const { title, amount, splitType = 'equal' } = body;

  if (!title || !amount) {
    return NextResponse.json({ error: 'Title and amount required' }, { status: 400 });
  }

  const members = await sql`
    SELECT u.id, u.name, u.email FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${groupId}
  `;

  if (!members.length) {
    return NextResponse.json({ error: 'Group not found or no members' }, { status: 404 });
  }

  const numAmount = Number(amount);
  const memberCount = members.length;
  const sharePerPerson = Math.round((numAmount / memberCount) * 100) / 100;

  const [expense] = await sql`
    INSERT INTO expenses (group_id, paid_by, title, amount, split_type)
    VALUES (${groupId}, ${user.userId}, ${title}, ${numAmount}, ${splitType})
    RETURNING id, title, amount, paid_by, split_type, created_at
  `;

  for (const m of members) {
    await sql`
      INSERT INTO expense_splits (expense_id, user_id, amount)
      VALUES (${expense.id}, ${m.id}, ${sharePerPerson})
    `;
  }

  const payer = members.find((m: { id: number }) => Number(m.id) === user.userId);
  for (const m of members) {
    if (Number(m.id) === user.userId) continue;
    await sendExpenseNotification({
      toEmail:      m.email,
      toName:       m.name,
      groupName:    (await sql`SELECT name FROM groups WHERE id = ${groupId}`)[0]?.name || 'Group',
      expenseTitle: title,
      totalAmount:  numAmount,
      yourShare:    sharePerPerson,
      paidByName:   payer?.name || 'Someone',
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, expense }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);

  const expenses = await sql`
    SELECT e.id, e.title, e.amount, e.paid_by, e.split_type, e.created_at,
           u.name as paid_by_name
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ${groupId}
    ORDER BY e.created_at DESC
  `;

  return NextResponse.json(expenses);
}
