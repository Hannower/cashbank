import nodemailer, { Transporter } from 'nodemailer';

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export interface SendEmailResult {
  success: boolean;
  method: 'resend' | 'brevo' | 'sendgrid' | 'smtp' | 'none';
  messageId?: string;
  reason?: string;
}

/**
 * Sends email via Resend API (HTTPS port 443 - works everywhere in cloud/deploy)
 */
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from.includes('<') ? from : `CashBank <${from}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[EMAIL RESEND ERROR]', data);
      return { success: false, method: 'resend', reason: data.message || `HTTP ${res.status}` };
    }

    console.log(`[PASSWORD RESET] Email enviado com sucesso via Resend para ${to}. ID: ${data.id}`);
    return { success: true, method: 'resend', messageId: data.id };
  } catch (err: any) {
    console.warn('[EMAIL RESEND FAILED]', err.message);
    return { success: false, method: 'resend', reason: err.message };
  }
}

/**
 * Sends email via Brevo / Sendinblue REST API (HTTPS port 443)
 */
async function sendViaBrevo(
  apiKey: string,
  fromEmail: string,
  to: string,
  toName: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'CashBank', email: fromEmail },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[EMAIL BREVO ERROR]', data);
      return { success: false, method: 'brevo', reason: data.message || `HTTP ${res.status}` };
    }

    console.log(`[PASSWORD RESET] Email enviado com sucesso via Brevo para ${to}. ID: ${data.messageId}`);
    return { success: true, method: 'brevo', messageId: data.messageId };
  } catch (err: any) {
    console.warn('[EMAIL BREVO FAILED]', err.message);
    return { success: false, method: 'brevo', reason: err.message };
  }
}

/**
 * Sends email via SendGrid API (HTTPS port 443)
 */
async function sendViaSendGrid(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<SendEmailResult> {
  try {
    const cleanFrom = from.includes('<') ? from.split('<')[1].replace('>', '').trim() : from;
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: cleanFrom, name: 'CashBank' },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[EMAIL SENDGRID ERROR]', errText);
      return { success: false, method: 'sendgrid', reason: `HTTP ${res.status}: ${errText}` };
    }

    console.log(`[PASSWORD RESET] Email enviado com sucesso via SendGrid para ${to}`);
    return { success: true, method: 'sendgrid' };
  } catch (err: any) {
    console.warn('[EMAIL SENDGRID FAILED]', err.message);
    return { success: false, method: 'sendgrid', reason: err.message };
  }
}

/**
 * Creates and returns the Nodemailer transporter based on .env
 */
function getSmtpTransporter(): { transporter: Transporter; from: string } | null {
  const host = (process.env.EMAIL_HOST || process.env.SMTP_HOST || '').trim();
  const rawPort = (process.env.EMAIL_PORT || process.env.SMTP_PORT || '587').split('#')[0].trim();
  const port = parseInt(rawPort, 10) || 587;
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').split('#')[0].trim();
  const rawPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').split('#')[0].trim();
  const isGmail = host.toLowerCase().includes('gmail') || user.toLowerCase().includes('@gmail.com');
  const pass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;
  const from =
    (process.env.EMAIL_FROM || process.env.SMTP_FROM || '').split('#')[0].trim() ||
    `Suporte CashBank <${user || 'suporte@cashbank.com'}>`;

  if ((host || isGmail) && user && pass) {
    const transporter = isGmail
      ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        })
      : nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        });
    return { transporter, from };
  }

  return null;
}

/**
 * Sends a password reset email to the specified user
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<SendEmailResult> {
  const firstName = name ? name.trim().split(' ')[0] : 'usuário';

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - CashBank</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04); overflow: hidden;">
          <!-- Header Brand -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #15803d 0%, #166534 100%); text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">CashBank</span>
                    <span style="font-size: 12px; color: #bbf7d0; display: block; margin-top: 2px;">Controle Financeiro Pessoal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">
                Olá, ${firstName}!
              </h1>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>CashBank</strong>.
              </p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 28px;">
                Para criar uma nova senha e retomar o acesso à sua conta, clique no botão verde abaixo:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #15803d; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3);">
                  Redefinir Minha Senha
                </a>
              </div>

              <!-- Security Warning -->
              <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 10px; padding: 14px 16px; margin: 24px 0 20px;">
                <p style="font-size: 13px; color: #166534; line-height: 1.5; margin: 0;">
                  🔒 <strong>Por segurança:</strong> Este link é válido por <strong>1 hora</strong> e só pode ser utilizado uma única vez.
                </p>
              </div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px;">
                Se você não solicitou a troca de senha, fique tranquilo: basta ignorar este e-mail. Nenhuma alteração foi realizada e sua conta continua protegida.
              </p>

              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                Se o botão acima não funcionar, copie e cole o link a seguir no seu navegador:<br />
                <a href="${resetUrl}" style="color: #15803d; word-break: break-all; text-decoration: underline;">
                  ${resetUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #fafbfc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                © CashBank • Este é um e-mail automático do sistema, por favor não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Olá, ${firstName}!\n\nRecebemos uma solicitação para redefinir a senha da sua conta no CashBank.\n\nAcesse o link a seguir para criar sua nova senha:\n${resetUrl}\n\nEste link é válido por 1 hora. Se você não solicitou a redefinição de senha, ignore este e-mail.\n\nEquipe CashBank`;
  const subject = 'Recuperação de Senha - CashBank';

  // 1. Try Resend if configured (HTTP port 443 - recommended for deploy on Render)
  const resendKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  if (resendKey) {
    const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || 'CashBank <onboarding@resend.dev>';
    const resendResult = await sendViaResend(resendKey, from, to, subject, html, text);
    if (resendResult.success) return resendResult;
  }

  // 2. Try Brevo if configured (HTTP port 443)
  const brevoKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  if (brevoKey) {
    const fromEmail = (process.env.EMAIL_USER || process.env.BREVO_FROM || 'suporte@cashbank.com').trim();
    const brevoResult = await sendViaBrevo(brevoKey, fromEmail, to, firstName, subject, html, text);
    if (brevoResult.success) return brevoResult;
  }

  // 3. Try SendGrid if configured (HTTP port 443)
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'suporte@cashbank.com';
    const sgResult = await sendViaSendGrid(sendgridKey, from, to, subject, html, text);
    if (sgResult.success) return sgResult;
  }

  // 4. Try SMTP (e.g. Gmail in local development or VPS)
  const smtpConfig = getSmtpTransporter();
  if (smtpConfig) {
    try {
      const info = await smtpConfig.transporter.sendMail({
        from: smtpConfig.from,
        to,
        subject,
        text,
        html,
      });
      console.log(`[PASSWORD RESET] Email enviado com sucesso via SMTP para ${to}. ID: ${info.messageId}`);
      return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      console.warn(`[PASSWORD RESET SMTP] Conexão SMTP indisponível ou bloqueada (${err.code || err.message}).`);
      return {
        success: false,
        method: 'smtp',
        reason: err.code === 'ETIMEDOUT' ? 'Porta SMTP bloqueada no servidor' : err.message,
      };
    }
  }

  // 5. No email transport available in this environment
  console.log('[PASSWORD RESET] Nenhum serviço de envio de e-mail ativo para este ambiente.');
  return {
    success: false,
    method: 'none',
    reason: 'Nenhum provedor de e-mail configurado',
  };
}
