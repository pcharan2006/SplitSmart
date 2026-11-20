const nodemailer = require('nodemailer');

// Sends emails through any SMTP provider (Gmail app password, Brevo, SendGrid, Amazon SES, Resend ...).
// If SMTP_HOST is not set, email is simply "not configured" and nothing is sent.

const isConfigured = () => Boolean(process.env.SMTP_HOST);

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Port 465 uses TLS from the start; 587 upgrades with STARTTLS automatically.
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

// Lets tests swap in a fake transport.
function _setTransporter(t) {
  transporter = t;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function buildResetLink(token) {
  const base = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendPasswordResetEmail({ to, name, token }) {
  const link = buildResetLink(token);
  const from = process.env.EMAIL_FROM || `SplitSmart <${process.env.SMTP_USER || 'no-reply@localhost'}>`;
  await getTransporter().sendMail({
    from,
    to,
    subject: 'Reset your SplitSmart password',
    text:
      `Hi ${name || 'there'},\n\n` +
      `Use this link to choose a new password (it works for 30 minutes):\n${link}\n\n` +
      `If you didn't ask for this, you can ignore this email. Your password won't change.`,
    html:
      `<p>Hi ${escapeHtml(name || 'there')},</p>` +
      `<p>Use this link to choose a new password. It works for 30 minutes:</p>` +
      `<p><a href="${escapeHtml(link)}">Reset my password</a></p>` +
      `<p style="color:#666;font-size:13px">If you didn't ask for this, you can ignore this email. Your password won't change.</p>`,
  });
}

module.exports = { isConfigured, sendPasswordResetEmail, buildResetLink, _setTransporter };
