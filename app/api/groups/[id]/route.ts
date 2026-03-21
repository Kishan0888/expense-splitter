import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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

    const groups = await sql`SELECT id, name, description, created_by, created_at FROM groups WHERE id = ${groupId}`;
    if (!groups.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const group = groups[0];

    const members = await sql`
      SELECT u.id, u.name, u.email
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.joined_at ASC
    `;

    const expenses = await sql`
      SELECT DISTINCT
        e.id, e.title, e.amount::float AS amount,
        e.paid_by, e.split_type, e.created_at,
        u.name AS paid_by_name
      FROM expenses e
      JOIN users u ON u.id = e.paid_by
      WHERE e.group_id = ${groupId}
      ORDER BY e.created_at DESC
    `;

    const response = NextResponse.json({
      id: Number(group.id),
      name: String(group.name),
      description: String(group.description || ''),
      created_by: Number(group.created_by),
      created_at: String(group.created_at),
      members: members.map((m: Record<string, unknown>) => ({
        id: Number(m.id), name: String(m.name), email: String(m.email),
      })),
      expenses: expenses.map((e: Record<string, unknown>) => ({
        id: Number(e.id),
        title: String(e.title),
        amount: Number(e.amount),
        paid_by: Number(e.paid_by),
        paid_by_name: String(e.paid_by_name),
        split_type: String(e.split_type),
        created_at: String(e.created_at),
      })),
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (err) {
    console.error('GET /groups/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
