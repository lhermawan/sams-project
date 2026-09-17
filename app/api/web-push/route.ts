import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Handle Subscription
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    const { endpoint, keys: { p256dh, auth: authKey } } = subscription;

    // Check if subscription already exists for this endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      // If it exists but belongs to a different user, update it
      if (existing.userId !== session.user.id) {
        await prisma.pushSubscription.update({
          where: { id: existing.id },
          data: { userId: session.user.id, p256dh, auth: authKey },
        });
      }
      return NextResponse.json({ success: true, message: "Subscription updated" }, { status: 200 });
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth: authKey,
      },
    });

    return NextResponse.json({ success: true, message: "Subscribed successfully" }, { status: 201 });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

// Handle Unsubscription
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, message: "Unsubscribed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Unsubscription error:", error);
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
