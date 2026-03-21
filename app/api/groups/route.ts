import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groups = await sql`
    SELECT g.id, g.name, g.description, g.created_at,
           COUNT(DISTINCT gm2.user_id) as member_count,
           COUNT(DISTINCT e.id) as expense_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ${user.userId}
    LEFT JOIN group_members gm2 ON gm2.group_id = g.id
    LEFT JOIN expenses e ON e.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `;
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, memberEmails } = await req.json();
  if (!name) return NextResponse.json({ error: 'Group name required' }, { status: 400 });

  const sql = getDb();
  const [group] = await sql`
    INSERT INTO groups (name, description, created_by)
    VALUES (${name}, ${description || ''}, ${user.userId})
    RETURNING id, name, description
  `;
  await sql`INSERT INTO group_members (group_id, user_id) VALUES (${group.id}, ${user.userId})`;

  if (memberEmails?.length) {
    for (const email of memberEmails) {
      const [member] = await sql`SELECT id FROM users WHERE email = ${email}`;
      if (member) {
        await sql`
          INSERT INTO group_members (group_id, user_id)
          VALUES (${group.id}, ${member.id})
          ON CONFLICT DO NOTHING
        `;
      }
    }
  }

  return NextResponse.json(group, { status: 201 });
}
