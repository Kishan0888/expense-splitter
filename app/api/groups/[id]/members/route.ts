import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = getDb();
  const groupId = Number(params.id);
  const { email } = await req.json();

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  // Check requester is a member
  const isMember = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${user.userId}
  `;
  if (!isMember.length) return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });

  // Find the user to add
  const [newMember] = await sql`SELECT id, name, email FROM users WHERE email = ${email.trim()}`;
  if (!newMember) {
    return NextResponse.json(
      { error: `No account found for ${email}. Ask them to register on SplitEase first.` },
      { status: 404 }
    );
  }

  // Check not already a member
  const alreadyMember = await sql`
    SELECT 1 FROM group_members WHERE group_id = ${groupId} AND user_id = ${newMember.id}
  `;
  if (alreadyMember.length) {
    return NextResponse.json({ error: `${newMember.name} is already in this group` }, { status: 409 });
  }

  await sql`
    INSERT INTO group_members (group_id, user_id) VALUES (${groupId}, ${newMember.id})
  `;

  return NextResponse.json({ success: true, member: { id: newMember.id, name: newMember.name, email: newMember.email } });
}
