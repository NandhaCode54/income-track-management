import nodemailer from 'nodemailer';
import { env } from '../../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: MailOptions): Promise<void> => {
  await transporter.sendMail({ from: env.EMAIL_FROM, ...options });
};

export const emailTemplates = {
  verifyEmail: (name: string, link: string) => ({
    subject: 'Verify your Family Finance Manager account',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${name},</h2>
        <p>Please verify your email address to activate your account.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">This link expires in 24 hours.</p>
      </div>
    `,
  }),

  resetPassword: (name: string, link: string) => ({
    subject: 'Reset your Family Finance Manager password',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Hi ${name},</h2>
        <p>You requested a password reset. Click the button below to create a new password.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">This link expires in 30 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  }),

  familyInvite: (inviterName: string, familyName: string, link: string) => ({
    subject: `You're invited to join ${familyName} on Family Finance Manager`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join the <strong>${familyName}</strong> workspace on Family Finance Manager.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Accept Invitation
        </a>
        <p style="color:#6b7280;font-size:14px;margin-top:16px">This invitation expires in 48 hours.</p>
      </div>
    `,
  }),
};
