export interface Balance {
  userId: number;
  name: string;
  email: string;
  netBalance: number;
}

export interface Transaction {
  fromUserId: number;
  fromName: string;
  fromEmail: string;
  toUserId: number;
  toName: string;
  toEmail: string;
  amount: number;
}

export function simplifyDebts(balances: Balance[]): Transaction[] {
  const creditors: { b: Balance; amount: number }[] = [];
  const debtors:   { b: Balance; amount: number }[] = [];

  for (const b of balances) {
    if (b.netBalance > 0.01)       creditors.push({ b, amount: b.netBalance });
    else if (b.netBalance < -0.01) debtors.push({ b, amount: -b.netBalance });
  }

  creditors.sort((a, z) => z.amount - a.amount);
  debtors.sort((a, z) => z.amount - a.amount);

  const transactions: Transaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const cr = creditors[0];
    const db = debtors[0];
    const amount = Math.min(cr.amount, db.amount);

    transactions.push({
      fromUserId:  db.b.userId,
      fromName:    db.b.name,
      fromEmail:   db.b.email,
      toUserId:    cr.b.userId,
      toName:      cr.b.name,
      toEmail:     cr.b.email,
      amount:      Math.round(amount * 100) / 100,
    });

    cr.amount -= amount;
    db.amount -= amount;

    if (cr.amount < 0.01) creditors.shift();
    if (db.amount < 0.01) debtors.shift();
  }

  return transactions;
}

export async function computeGroupBalances(
  sql: ReturnType<typeof import('./db').getDb>,
  groupId: number
): Promise<Balance[]> {
  const members = await sql`
    SELECT u.id, u.name, u.email
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${groupId}
  `;

  const balanceMap: Record<number, Balance> = {};
  for (const m of members) {
    balanceMap[m.id] = { userId: m.id, name: m.name, email: m.email, netBalance: 0 };
  }

  const splits = await sql`
    SELECT e.paid_by, es.user_id, es.amount
    FROM expenses e
    JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.group_id = ${groupId}
  `;

  for (const row of splits) {
    const paidBy = Number(row.paid_by);
    const userId = Number(row.user_id);
    const amount = Number(row.amount);
    if (balanceMap[paidBy] !== undefined) balanceMap[paidBy].netBalance += amount;
    if (balanceMap[userId] !== undefined)  balanceMap[userId].netBalance  -= amount;
  }

  const settlements = await sql`
    SELECT paid_by, paid_to, amount
    FROM settlements
    WHERE group_id = ${groupId}
  `;

  for (const s of settlements) {
    const paidBy = Number(s.paid_by);
    const paidTo = Number(s.paid_to);
    const amount = Number(s.amount);
    // paidBy paid money OUT so their debt reduces (netBalance goes toward 0 from negative)
    if (balanceMap[paidBy] !== undefined) balanceMap[paidBy].netBalance += amount;
    // paidTo received money so their credit reduces (netBalance goes toward 0 from positive)
    if (balanceMap[paidTo] !== undefined) balanceMap[paidTo].netBalance -= amount;
  }

  return Object.values(balanceMap);
}
