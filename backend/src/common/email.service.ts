/**
 * email.service.ts — Production Gmail SMTP Email Delivery Service
 *
 * Sends reminder and notification emails via Gmail SMTP (Nodemailer over Port 587 STARTTLS).
 * Resolves recipient email addresses dynamically from authenticated user accounts.
 * NEVER exposes email passwords or secrets in logs, errors, or API responses.
 */
import nodemailer from 'nodemailer';
import { appConfig } from '../config/app.config';
import { logger } from '../utils/logger';

export interface SendEmailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export type EmailDeliveryStatus = 'SENT' | 'FAILED' | 'SIMULATED';

export interface EmailResult {
  success:    boolean;
  status:     EmailDeliveryStatus;
  messageId?: string;
  error?:     string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = appConfig.emailHost;
    const port = appConfig.emailPort;
    const user = appConfig.emailUser;
    const pass = appConfig.emailPassword;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        family: 4,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
        },
      } as any);
      this.isConfigured = true;
      logger.info(`📧 Email service initialized with Gmail SMTP host: ${host}:${port} (Sender: ${user})`);
      this.verifyConnection().catch(() => {});
    } else {
      this.isConfigured = false;
      logger.info('📧 Email service operating in SIMULATED mode (SMTP credentials missing in .env)');
    }
  }

  /**
   * Verify SMTP server connection and authentication credentials.
   * Safe — never prints password.
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('[EMAIL SMTP VERIFICATION] ⚠️ SMTP credentials not set in .env. Operating in SIMULATED mode.');
      return { success: false, error: 'SMTP credentials not set in .env' };
    }

    try {
      await this.transporter.verify();
      logger.info('====================================================');
      logger.info('[EMAIL SERVICE]');
      logger.info('Provider:  Gmail SMTP');
      logger.info(`Host:      ${appConfig.emailHost}:${appConfig.emailPort}`);
      logger.info(`Sender:    ${appConfig.emailUser}`);
      logger.info('Status:    AUTHENTICATED & READY');
      logger.info('====================================================');
      return { success: true };
    } catch (err: any) {
      const safeError = err.message || 'SMTP Authentication / Connection failed';
      logger.error('====================================================');
      logger.error('[EMAIL SMTP VERIFICATION] ❌ CONNECTION FAILED!');
      logger.error(`Host:     ${appConfig.emailHost}:${appConfig.emailPort}`);
      logger.error(`Sender:   ${appConfig.emailUser}`);
      logger.error(`Error:    ${safeError}`);
      logger.error('====================================================');
      return { success: false, error: safeError };
    }
  }

  /**
   * Send a general email via Gmail SMTP.
   * Returns exact status: SENT, FAILED, or SIMULATED.
   */
  async sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
    const from = appConfig.emailFrom || 'LifeVault Reminders <chibaroshan2387@gmail.com>';

    if (!this.isConfigured || !this.transporter) {
      logger.info('[EMAIL SIMULATOR] ────────────────────────────────');
      logger.info(`To:      ${opts.to}`);
      logger.info(`From:    ${from}`);
      logger.info(`Subject: ${opts.subject}`);
      logger.info(`Status:  SIMULATED`);
      logger.info('──────────────────────────────────────────────────');
      return { success: true, status: 'SIMULATED' };
    }

    try {
      logger.info('[EMAIL SERVICE] Sending through Gmail SMTP', { to: opts.to, subject: opts.subject });

      const info = await this.transporter.sendMail({
        from,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
        text:    opts.text,
      });

      const messageId = info.messageId || '';
      logger.info('[EMAIL SERVICE] Email accepted by Gmail SMTP', { messageId, to: opts.to });
      return { success: true, status: 'SENT', messageId };
    } catch (err: any) {
      const safeError = err.message || 'Gmail SMTP delivery failed';
      logger.error('❌ Gmail SMTP Error:', safeError);
      return { success: false, status: 'FAILED', error: safeError };
    }
  }

  /**
   * Send a test email directly to specified recipient.
   */
  async sendTestEmail(targetRecipient?: string): Promise<EmailResult> {
    const recipient = targetRecipient || appConfig.emailUser || 'chibaroshan2387@gmail.com';
    const subject   = '⏰ LifeVault Test Email (Gmail SMTP)';
    const text      = `Hello,\n\nThis is a test notification email sent directly from LifeVault AI using Gmail SMTP.\n\nRecipient: ${recipient}\nProvider: Gmail SMTP\nStatus: SENT`;
    const html      = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #6366f1; border-radius: 12px; padding: 24px; max-width: 500px; }
    .title { font-size: 20px; font-weight: 700; color: #a5b4fc; margin-bottom: 12px; }
    .badge { background: #10b981; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">⏰ LifeVault Test Email</div>
    <p>Your Gmail SMTP email configuration is active and working successfully!</p>
    <p><strong>Recipient:</strong> ${recipient}</p>
    <p><strong>Provider:</strong> Gmail SMTP (Port 587)</p>
    <p><span class="badge">STATUS: SENT</span></p>
  </div>
</body>
</html>
`;

    const result = await this.sendEmail({ to: recipient, subject, html, text });

    logger.info('\n[EMAIL TEST]');
    logger.info('-----------');
    logger.info(`Provider:  Gmail SMTP`);
    logger.info(`Recipient: ${recipient}`);
    logger.info(`Status:    ${result.status}`);
    if (result.messageId) {
      logger.info(`Message ID: ${result.messageId}`);
    }
    if (result.error) {
      logger.info(`Error:     ${result.error}`);
    }
    logger.info('');

    return result;
  }

  /**
   * Send a branded Smart Reminder notification email via Gmail SMTP.
   * Resolves to dynamically passed user recipient email address.
   */
  async sendReminderEmail(
    toEmail:    string,
    userName:   string,
    docName:    string,
    eventLabel: string,
    subtitle:   string,
    documentId: string,
    eventDateFormatted?: string,
  ): Promise<EmailResult> {
    const appUrl = appConfig.corsOrigin || 'http://localhost:4200';
    const docUrl = `${appUrl}/documents/${documentId}`;
    const dateStr = eventDateFormatted || 'Upcoming';

    const subject = `⏰ LifeVault Reminder: ${eventLabel} for "${docName}"`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0f1d; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.18)); padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .brand { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .brand span { background: #6366f1; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 20px; margin-left: 8px; vertical-align: middle; }
    .content { padding: 28px; }
    .greeting { font-size: 16px; margin-bottom: 16px; color: #cbd5e1; font-weight: 600; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(99,102,241,0.25); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .event-title { font-size: 18px; font-weight: 700; color: #a5b4fc; margin-bottom: 8px; }
    .row { font-size: 14px; color: #cbd5e1; margin-bottom: 6px; }
    .doc-name { color: #818cf8; font-weight: 600; }
    .status-badge { display: inline-block; background: rgba(239,68,68,0.18); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin: 12px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 12px; box-shadow: 0 4px 14px rgba(99,102,241,0.4); }
    .footer { padding: 20px 28px; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">LifeVault <span>AI</span></div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${userName || 'User'},</div>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px; line-height: 1.5;">This is an automated Smart Reminder from your LifeVault document vault.</p>
      
      <div class="card">
        <div class="event-title">⏰ ${eventLabel}</div>
        <div class="row">📄 <strong>Document:</strong> <span class="doc-name">${docName}</span></div>
        <div class="row">📅 <strong>Event Date:</strong> ${dateStr}</div>
        <div><span class="status-badge">${subtitle}</span></div>
        <p style="font-size: 13px; color: #94a3b8; margin: 10px 0 16px;">Your reminder was configured to notify you before this event.</p>
        <div>
          <a href="${docUrl}" class="btn" target="_blank">Open LifeVault to View Document →</a>
        </div>
      </div>
    </div>
    <div class="footer">
      Sent by LifeVault AI Smart Reminder System • <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">Open Vault</a>
    </div>
  </div>
</body>
</html>
`;

    const text = `LifeVault Smart Reminder\n\nHello ${userName || 'User'},\n\nThis is a reminder from LifeVault.\n\nDocument: ${docName}\nEvent: ${eventLabel}\nDate: ${dateStr}\nStatus: ${subtitle}\n\nView document: ${docUrl}\n\nRegards,\nLifeVault`;

    return this.sendEmail({ to: toEmail, subject, html, text });
  }
}

export const emailService = new EmailService();
