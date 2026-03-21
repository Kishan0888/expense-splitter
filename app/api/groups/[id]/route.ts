import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);

  const isMember = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${user.userId}
  `;
  if (!isMember.length) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const [group] = await sql`SELECT * FROM groups WHERE id = ${groupId}`;
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

  const members = await sql`
    SELECT u.id, u.name, u.email
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ${groupId}
    ORDER BY gm.joined_at ASC
  `;

  const expenses = await sql`
    SELECT e.id, e.title, e.amount, e.paid_by, e.split_type, e.created_at,
           u.name as paid_by_name
    FROM expenses e
    JOIN users u ON u.id = e.paid_by
    WHERE e.group_id = ${groupId}
    ORDER BY e.created_at DESC
  `;

  return NextResponse.json({ ...group, members, expenses });
}
