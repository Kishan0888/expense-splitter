import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendExpenseNotification } from '@/lib/email';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const { title, amount, splitType = 'equal', customSplits } = await req.json();

  if (!title || !amount) return NextResponse.json({ error: 'Title and amount required' }, { status: 400 });

  const members = await sql`
    SELECT u.id, u.name, u.email FROM group_members gm
    JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ${groupId}
  `;
  if (!members.length) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const [expense] = await sql`
    INSERT INTO expenses (group_id, paid_by, title, amount, split_type)
    VALUES (${groupId}, ${user.userId}, ${title}, ${amount}, ${splitType})
    RETURNING id
  `;

  const splits: { userId: number; amount: number }[] = [];
  if (splitType === 'equal') {
    const share = amount / members.length;
    for (const m of members) splits.push({ userId: m.id, amount: Math.round(share * 100) / 100 });
  } else if (splitType === 'custom' && customSplits) {
    for (const cs of customSplits) splits.push({ userId: cs.userId, amount: cs.amount });
  }

  for (const s of splits) {
    await sql`INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (${expense.id}, ${s.userId}, ${s.amount})`;
  }

  const payer = members.find((m: {id: number}) => m.id === user.userId);
  for (const m of members) {
    if (m.id === user.userId) continue;
    const share = splits.find((s) => s.userId === m.id);
    if (share) {
      await sendExpenseNotification({
        toEmail:      m.email,
        toName:       m.name,
        groupName:    (await sql`SELECT name FROM groups WHERE id = ${groupId}`)[0]?.name || 'Group',
        expenseTitle: title,
        totalAmount:  amount,
        yourShare:    share.amount,
        paidByName:   payer?.name || 'Someone',
      }).catch(() => {});
    }
  }

  return NextResponse.json({ id: expense.id, splits }, { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sql = getDb();
  const expenses = await sql`
    SELECT e.*, u.name as paid_by_name,
      json_agg(json_build_object('userId', es.user_id, 'amount', es.amount, 'name', u2.name)) as splits
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    JOIN expense_splits es ON es.expense_id = e.id
    JOIN users u2 ON u2.id = es.user_id
    WHERE e.group_id = ${Number(params.id)}
    GROUP BY e.id, u.name
    ORDER BY e.created_at DESC
  `;
  return NextResponse.json(expenses);
}
