import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0f1e',
          padding: '60px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', backgroundColor: '#22c55e', display: 'flex' }} />
        {/* Left accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '6px', backgroundColor: '#22c55e', display: 'flex' }} />
        {/* Bottom accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px', backgroundColor: '#22c55e', display: 'flex' }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: '#052e16', border: '2px solid #22c55e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 'bold', color: '#22c55e',
          }}>SE</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', color: '#64748b' }}>by Kishan Jaiswal</span>
          </div>
          <div style={{
            marginLeft: 'auto', backgroundColor: '#052e16',
            border: '1px solid #22c55e', borderRadius: '8px',
            padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'flex' }} />
            <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>LIVE</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: '72px', fontWeight: 'bold', color: '#f1f5f9', lineHeight: 1.1, marginBottom: '16px', display: 'flex' }}>
          SplitEase
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: '28px', color: '#64748b', marginBottom: '24px', display: 'flex' }}>
          Smart Expense Splitting with Debt Simplification
        </div>

        {/* Bullet points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px' }}>
          <div style={{ fontSize: '20px', color: '#94a3b8', display: 'flex' }}>
            •  Debt simplification algorithm — N×(N-1) transactions → at most N-1
          </div>
          <div style={{ fontSize: '20px', color: '#94a3b8', display: 'flex' }}>
            •  Web Push Notifications • PWA • Real-time sync • JWT Auth
          </div>
        </div>

        {/* Tech tags */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['Next.js 14', 'PostgreSQL', 'JWT', 'Web Push API', 'Vercel', 'PWA'].map(tag => (
            <div key={tag} style={{
              backgroundColor: '#0f1f10', border: '1px solid #166534',
              borderRadius: '8px', padding: '6px 16px',
              color: '#22c55e', fontSize: '16px', fontWeight: 'bold', display: 'flex',
            }}>{tag}</div>
          ))}
        </div>

        {/* URL at bottom */}
        <div style={{
          position: 'absolute', bottom: '28px', right: '60px',
          fontSize: '16px', color: '#475569', display: 'flex',
        }}>
          expense-splitter-kishanj1093-1933s-projects.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
