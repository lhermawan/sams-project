import webpush from "web-push";
import { prisma } from "@/lib/db";

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@5758inc.my.id",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function sendPushToUsers(
  userIds: string[],
  title: string,
  message: string,
  url?: string
) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notification.");
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body: message,
      url: url || "/",
      icon: "/icon.png", // Assuming icon.png exists in public/
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (error: any) {
        // If the subscription is invalid or expired (status 410 or 404), remove it from DB
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Push subscription ${sub.endpoint} expired/invalid. Removing...`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("Failed to send push notification:", error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error sending push to users:", error);
  }
}
