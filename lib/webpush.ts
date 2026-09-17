export async function subscribeToWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { error: "Web Push not supported" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      return { success: true, subscription: existingSub };
    }

    // Get public key
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("VAPID public key is missing");
    }

    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Send to backend
    await fetch("/api/web-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription }),
    });

    return { success: true, subscription };
  } catch (error: any) {
    console.error("Failed to subscribe to Web Push:", error);
    return { error: error.message };
  }
}

export async function unsubscribeFromWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { error: "Web Push not supported" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify backend
      await fetch("/api/web-push", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to unsubscribe:", error);
    return { error: error.message };
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
