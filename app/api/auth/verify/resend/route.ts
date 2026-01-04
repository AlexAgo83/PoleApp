import { NextResponse } from "next/server";

import { createVerificationToken, canResendVerification } from "@/lib/emailVerification";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

function verificationBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function buildVerificationEmail(email: string, link: string) {
  const subject = "Vérification de votre compte Pole App";
  const text = `Bonjour,

Merci pour votre inscription. Pour activer votre compte, clique sur ce lien :
${link}

Si tu n'es pas à l'origine de cette demande, ignore cet email.`;
  const html = `<p>Bonjour,</p><p>Merci pour votre inscription. Pour activer votre compte, cliquez sur ce lien :</p><p><a href="${link}">${link}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;
  return { subject, text, html };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
    if (!emailRaw) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (!user) return NextResponse.json({ ok: true }, { status: 200 });

    if (user.disabledAt) {
      return NextResponse.json({ ok: false, error: "Compte désactivé" }, { status: 403 });
    }
    if (user.verifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true }, { status: 200 });
    }

    const canResend = await canResendVerification(user.id);
    if (!canResend) {
      return NextResponse.json({ ok: false, error: "Trop de demandes, réessaie dans 10 minutes." }, { status: 429 });
    }

    const { token } = await createVerificationToken(user.id);
    const link = `${verificationBaseUrl()}/auth/verify?token=${token}`;
    const mail = buildVerificationEmail(user.email, link);
    const mailResult = await sendMail({ to: user.email, ...mail });

    await prisma.auditLog.create({
      data: {
        action: "user:verify-email:resend",
        target: user.id,
        details: { sent: mailResult.sent, reason: mailResult.reason },
      },
    });

    return NextResponse.json({ ok: true, sent: mailResult.sent !== false }, { status: 200 });
  } catch (error) {
    console.error("resend verify error", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
