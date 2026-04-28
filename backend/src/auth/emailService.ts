import nodemailer from 'nodemailer';

// Configure via .env:
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your-app-password   (Gmail: use App Password, not account password)
//   EMAIL_FROM=DG Market <your@gmail.com>
//   FRONTEND_URL=http://localhost:5173

function createTransport() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    // Dev mode: log to console instead of sending
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT ?? '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  const from = process.env.EMAIL_FROM ?? 'DG Market <noreply@dgmarket.et>';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#166534;font-size:24px;margin-bottom:8px">Reset Your Password</h2>
      <p style="color:#374151;margin-bottom:24px">
        We received a request to reset your DG Market password. Click the button below to set a new password.
        This link expires in <strong>15 minutes</strong>.
      </p>
      <a href="${resetLink}"
        style="display:inline-block;background:#166534;color:#fff;font-weight:700;padding:14px 28px;text-decoration:none;border-radius:8px;font-size:14px">
        Reset Password
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">
        If you didn't request this, you can safely ignore this email.<br/>
        Link: ${resetLink}
      </p>
    </div>
  `;

  const transport = createTransport();

  if (!transport) {
    // Dev mode — print to console
    console.log(`\n[PASSWORD RESET] Dev mode — no email sent.`);
    console.log(`Reset link for ${email}: ${resetLink}\n`);
    return;
  }

  await transport.sendMail({ from, to: email, subject: 'Reset your DG Market password', html });
}
