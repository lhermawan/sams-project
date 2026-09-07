import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" },
    });
    return NextResponse.json(holidays);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { name, date, description } = await req.json();
    if (!name || !date) {
      return NextResponse.json({ error: "Nama dan tanggal wajib diisi" }, { status: 400 });
    }
    const holiday = await prisma.holiday.create({
      data: { name, date: new Date(date), description },
    });
    return NextResponse.json({ success: true, holiday }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    await prisma.holiday.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
