import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { fetchNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }

  const notifications = await fetchNotifications(session.user.id, 20);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
