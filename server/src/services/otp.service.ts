import nodemailer from 'nodemailer';

let etherealTransporter: nodemailer.Transporter | null = null;

const buildEmailHtml = (code: string, name?: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f9ff; margin: 0; padding: 24px; color: #0f172a; }
      .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #bae6fd; padding: 36px 32px; box-shadow: 0 10px 25px rgba(2, 132, 199, 0.08); }
      .header { text-align: center; margin-bottom: 28px; }
      .logo { display: inline-block; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; font-weight: 800; font-size: 22px; padding: 10px 24px; border-radius: 16px; letter-spacing: 1px; }
      .tagline { color: #0284c7; font-size: 12px; font-weight: 700; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
      .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-align: center; }
      .desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; text-align: center; }
      .code-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 20px; padding: 24px; margin-bottom: 24px; text-align: center; }
      .code { font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0369a1; }
      .expiry { font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 500; }
      .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; line-height: 1.8; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="logo">VOXA</div>
        <div class="tagline">Talk. Connect. Belong.</div>
      </div>
      <div class="greeting">Hello${name ? `, ${name}` : ''}! 👋</div>
      <div class="desc">Here is your one-time verification code to sign in to VOXA Messenger:</div>
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="expiry">⏱ Valid for 10 minutes &nbsp;•&nbsp; Do not share this code</div>
      </div>
      <div class="footer">
        If you did not request this OTP, you can safely ignore this email.<br>
        &copy; 2026 VOXA Messenger &nbsp;•&nbsp; Talk. Connect. Belong.
      </div>
    </div>
  </body>
</html>
`;

export const sendEmailOtp = async (
  email: string,
  code: string,
  name?: string
): Promise<{ success: boolean; previewUrl?: string }> => {

  // ── 1. Brevo REST API (sends to ANY recipient email) ─────────────
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'VOXA Messenger',
            email: process.env.BREVO_SENDER_EMAIL || 'pawangowda36@gmail.com',
          },
          to: [{ email, name: name || email }],
          subject: `${code} is your VOXA verification code`,
          htmlContent: buildEmailHtml(code, name),
          textContent: `Your VOXA verification code is: ${code}\n\nValid for 10 minutes. Do not share this.\n\nTalk. Connect. Belong.`,
        }),
      });

      if (!response.ok) {
        const err: any = await response.json();
        console.error('[OTP Service] ❌ Brevo error:', err?.message || response.statusText);
        return { success: false };
      }

      console.log(`[OTP Service] ✅ Email successfully sent via Brevo to: ${email}`);
      return { success: true };
    } catch (err: any) {
      console.error('[OTP Service] ❌ Brevo failed:', err?.message || err);
      return { success: false };
    }
  }

  // ── 2. Gmail/custom SMTP fallback ─────────────────────────────────────────
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass && smtpUser !== 'your_gmail@gmail.com' && smtpPass !== 'xxxx xxxx xxxx xxxx') {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `VOXA Messenger <${smtpUser}>`,
        to: email,
        subject: `${code} is your VOXA verification code`,
        html: buildEmailHtml(code, name),
        text: `Your VOXA verification code is: ${code}\n\nValid for 10 minutes.`,
      });
      console.log(`[OTP Service] ✅ Email sent via Gmail SMTP to: ${email}`);
      return { success: true };
    } catch (err: any) {
      console.error('[OTP Service] ❌ Gmail SMTP failed:', err?.message);
      return { success: false };
    }
  }

  // ── 3. Ethereal fallback (dev preview only) ───────────────────────────────
  if (!etherealTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log(`[OTP Service] ⚠ No provider configured — using Ethereal preview mode`);
  }
  const info = await (etherealTransporter as nodemailer.Transporter).sendMail({
    from: 'VOXA Messenger <no-reply@voxa.app>',
    to: email,
    subject: `${code} is your VOXA verification code`,
    html: buildEmailHtml(code, name),
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`[OTP Service] 🌐 Ethereal preview: ${previewUrl}`);
  return { success: true, previewUrl: previewUrl ? String(previewUrl) : undefined };
};

export const sendSmsOtp = async (phone: string, code: string): Promise<{ success: boolean }> => {
  // Format clean 10-digit or E.164 phone
  const rawDigits = phone.replace(/[^0-9]/g, '');
  const tenDigit = rawDigits.slice(-10);
  const formattedE164 = phone.startsWith('+') ? phone : `+91${tenDigit}`;

  // ── 1. Twilio SMS (Global & Free Trial without DLT restrictions) ───────────
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', process.env.TWILIO_PHONE_NUMBER);
      params.append('To', formattedE164);
      params.append('Body', `[VOXA] Your verification code is: ${code}. Valid for 10 minutes. Talk. Connect. Belong.`);
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      
      const data: any = await response.json();
      if (response.ok) {
        console.log(`[OTP Service] ✅ SMS sent via Twilio to ${formattedE164} (SID: ${data.sid})`);
        return { success: true };
      } else {
        console.error(`[OTP Service] ❌ Twilio error:`, data.message);
      }
    } catch (err: any) {
      console.error('[OTP Service] ❌ Twilio SMS failed:', err?.message || err);
    }
  }

  // ── 2. Fast2SMS (India) ───────────────────────────────────────────────────
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: code,
          numbers: tenDigit,
        }),
      });
      const data: any = await response.json();
      if (data.return || data.status_code === 200) {
        console.log(`[OTP Service] ✅ SMS sent via Fast2SMS to ${tenDigit}`);
        return { success: true };
      } else {
        console.log(`[OTP Service] ℹ Fast2SMS notice: ${data.message}`);
      }
    } catch (err: any) {
      console.error('[OTP Service] ❌ Fast2SMS failed:', err?.message || err);
    }
  }

  return { success: true };
};
