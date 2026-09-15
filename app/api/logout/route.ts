import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const host = req.headers.get("host") || "";
  
  const isProd = host.includes("5758inc.my.id");
  const domain = isProd ? ".5758inc.my.id" : ".localhost";
  
  // Clear Auth.js session cookies
  cookieStore.set("authjs.session-token", "", { maxAge: 0, path: "/", domain });
  cookieStore.set("__Secure-authjs.session-token", "", { maxAge: 0, path: "/", domain });
  
  // Also clear without domain just in case it was set locally
  cookieStore.set("authjs.session-token", "", { maxAge: 0, path: "/" });
  cookieStore.set("__Secure-authjs.session-token", "", { maxAge: 0, path: "/" });

  return NextResponse.json({ success: true });
}
