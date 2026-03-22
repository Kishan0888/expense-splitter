import { getDb } from './db';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL   = 'mailto:splitease@kishan.dev';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

// Build VAPID JWT manually (no web-push package needed)
async function buildVapidAuth(endpoint: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_EMAIL }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${header}.${payload}`;

  // Import private key
  const privBytes = Buffer.from(VAPID_PRIVATE, 'base64');
  const jwk = {
    kty: 'EC', crv: 'P-256', d: VAPID_PRIVATE,
    x: VAPID_PUBLIC.slice(0, 43), y: VAPID_PUBLIC.slice(43, 86),
  };

  const privateKey = await crypto.subtle.importKey(
    'raw', privBytes, { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  ).catch(async () => {
    // fallback: try jwk import
    return crypto.subtle.importKey('jwk',
      { kty: 'EC', crv: 'P-256', d: VAPID_PRIVATE, x: '', y: '', ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
  });

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = Buffer.from(sig).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `vapid t=${signingInput}.${sigB64},k=${VAPID_PUBLIC}`;
}

export async function sendPushToGroupMembers(params: {
  groupId: number;
  excludeUserId: number;
  payload: PushPayload;
}) {
  if (!VAPID_PRIVATE || !VAPID_PUBLIC) {
    console.warn('VAPID keys not configured — skipping push');
    return;
  }

  try {
    const sql = getDb();

    // Get all push subscriptions for group members except the actor
    const subs = await sql`
      SELECT ps.subscription, ps.endpoint, ps.user_id
      FROM push_subscriptions ps
      JOIN group_members gm ON gm.user_id = ps.user_id
      WHERE gm.group_id = ${params.groupId}
        AND ps.user_id != ${params.excludeUserId}
    `;

    if (!subs.length) return;

    const message = JSON.stringify({
      title: params.payload.title,
      body:  params.payload.body,
      icon:  params.payload.icon  || '/icon-192.svg',
      url:   params.payload.url   || '/dashboard',
    });

    // Send to all subscribers in parallel
    const results = await Promise.allSettled(
      subs.map(async (row: Record<string, string>) => {
        const sub = JSON.parse(row.subscription);
        const auth = await buildVapidAuth(sub.endpoint);

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Authorization': auth,
            'TTL': '86400',
          },
          body: new TextEncoder().encode(message),
        });

        // If subscription expired/invalid, remove it
        if (res.status === 404 || res.status === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Push sent to ${sent}/${subs.length} subscribers`);
  } catch (e) {
    console.error('Push send error:', e);
  }
}
