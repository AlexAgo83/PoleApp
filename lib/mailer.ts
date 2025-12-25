import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(options: MailOptions): Promise<{ sent: boolean; info?: unknown; reason?: string }> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;
  const enabled = process.env.ENABLE_EMAIL_RESET !== "false";

  if (!enabled || !host || !port || !user || !pass || !from) {
    return { sent: false, reason: "mailer not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? undefined,
    });
    return { sent: true, info };
  } catch (error: unknown) {
    console.error("[mailer] send error", error);
    return { sent: false, reason: "send failed" };
  }
}
