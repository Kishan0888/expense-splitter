import nodemailer from 'nodemailer';

function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendExpenseNotification(params: {
  toEmail: string;
  toName: string;
  groupName: string;
  expenseTitle: string;
  totalAmount: number;
  yourShare: number;
  paidByName: string;
}) {
  if (!process.env.SMTP_USER) return; // skip if email not configured
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"SplitEase" <${process.env.SMTP_USER}>`,
    to: params.toEmail,
    subject: `New expense in ${params.groupName}: ${params.expenseTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #111; border-radius: 12px; padding: 24px; color: #fff; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #4ade80;">SplitEase</h1>
        </div>
        <h2 style="color: #111; font-size: 18px;">New expense added</h2>
        <p style="color: #555;">Hi ${params.toName},</p>
        <p style="color: #555;"><strong>${params.paidByName}</strong> added a new expense in <strong>${params.groupName}</strong>.</p>
        <div style="background: #f9f9f9; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <div style="font-size: 15px; color: #111; font-weight: 600; margin-bottom: 6px;">${params.expenseTitle}</div>
          <div style="color: #555;">Total: <strong>₹${params.totalAmount.toFixed(2)}</strong></div>
          <div style="color: #e11d48; margin-top: 8px; font-size: 16px; font-weight: 700;">Your share: ₹${params.yourShare.toFixed(2)}</div>
        </div>
        <p style="color: #aaa; font-size: 12px;">Log in to SplitEase to view your full balance summary.</p>
      </div>
    `,
  });
}

export async function sendSettlementNotification(params: {
  toEmail: string;
  toName: string;
  fromName: string;
  amount: number;
  groupName: string;
}) {
  if (!process.env.SMTP_USER) return;
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"SplitEase" <${process.env.SMTP_USER}>`,
    to: params.toEmail,
    subject: `Payment received from ${params.fromName} in ${params.groupName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <div style="background: #111; border-radius: 12px; padding: 24px; color: #fff; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #4ade80;">SplitEase</h1>
        </div>
        <h2 style="color: #111; font-size: 18px;">Payment recorded</h2>
        <p style="color: #555;">Hi ${params.toName},</p>
        <p style="color: #555;"><strong>${params.fromName}</strong> has settled ₹${params.amount.toFixed(2)} with you in <strong>${params.groupName}</strong>.</p>
        <div style="background: #f0fdf4; border-radius: 10px; padding: 20px; margin: 20px 0; color: #166534; font-weight: 700; font-size: 18px;">
          +₹${params.amount.toFixed(2)} received
        </div>
        <p style="color: #aaa; font-size: 12px;">Log in to SplitEase to see your updated balances.</p>
      </div>
    `,
  });
}
