import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const subscription = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    const sql = getDb();
    const subJson = JSON.stringify(subscription);
    await sql`
      INSERT INTO push_subscriptions (user_id, subscription, endpoint)
      VALUES (${user.userId}, ${subJson}, ${subscription.endpoint})
      ON CONFLICT (endpoint) DO UPDATE SET subscription = ${subJson}, user_id = ${user.userId}
    `;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Push subscribe error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { endpoint } = await req.json();
    const sql = getDb();
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint} AND user_id = ${user.userId}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
