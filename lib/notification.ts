import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/push";

export async function createNotification(args: {
  data: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: string | null;
  };
}) {
  const notif = await prisma.notification.create(args as any);

  let url;
  const ndata = args.data.data;
  if (ndata) {
    try {
      const parsed = JSON.parse(ndata);
      url = parsed.url;
    } catch {
      if (ndata.startsWith("/")) url = ndata;
    }
  }

  await sendPushToUsers([args.data.userId], args.data.title, args.data.message, url);

  return notif;
}

export async function createManyNotifications(args: {
  data: {
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: string | null;
  }[];
}) {
  if (args.data.length === 0) return;

  await prisma.notification.createMany(args as any);

  for (const n of args.data) {
    let url;
    if (n.data) {
      try {
        const parsed = JSON.parse(n.data);
        url = parsed.url;
      } catch {
        if (n.data.startsWith("/")) url = n.data;
      }
    }
    await sendPushToUsers([n.userId], n.title, n.message, url);
  }
}
