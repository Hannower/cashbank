import nodemailer, { Transporter } from 'nodemailer';

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

/**
 * Creates and returns the Nodemailer transporter based on .env or fallback
 */
async function getTransporter(): Promise<{ transporter: Transporter; from: string }> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'CashBank <nao-responder@cashbank.com>';

  // If real SMTP is configured in .env, use it
  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587 or other ports
      auth: {
        user,
        pass,
      },
    });
    return { transporter, from };
  }

  // Fallback: Create test Ethereal account if no SMTP provided in dev
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return { transporter, from: `CashBank <${testAccount.user}>` };
  } catch (err) {
    console.warn('[EMAIL] Falha ao criar conta Ethereal de teste, usando transporte json');
    const transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return { transporter, from };
  }
}

/**
 * Sends a password reset email to the specified user
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<boolean> {
  try {
    const { transporter, from } = await getTransporter();

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

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Recuperação de Senha - CashBank',
      text,
      html,
    });

    console.log(`[PASSWORD RESET] Email enviado com sucesso para ${to}. MessageId: ${info.messageId}`);

    // If Ethereal test account was used, log the preview URL for immediate developer inspection
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[PASSWORD RESET PREVIEW (Ethereal)]: ${previewUrl}`);
    }

    return true;
  } catch (err) {
    console.error(`[PASSWORD RESET ERROR] Falha ao enviar e-mail para ${to}:`, err);
    throw err;
  }
}
