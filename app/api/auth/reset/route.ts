import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, email: true },
    });
    if (!user) {
      // Ne pas divulguer l'existence des comptes
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const tempPassword = Math.random().toString(36).slice(2, 14);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        action: "user:reset-password:self",
        target: user.id,
        details: { email: user.email },
      },
    });

    const bodyText = `Bonjour,

Tu as demandé une réinitialisation de mot de passe.
Voici ton mot de passe temporaire : ${tempPassword}
Connecte-toi avec cet email et change-le dès ta connexion.`;

    void sendMail({
      to: user.email,
      subject: "Réinitialisation de mot de passe",
      text: bodyText,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("reset api error", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
