import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeTypeId = searchParams.get("employeeTypeId");
  const month = searchParams.get("month"); // Format: MM
  const year = searchParams.get("year");

  if (!employeeTypeId || !month || !year) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = endOfMonth(startDate);

  try {
    const employees = await prisma.employee.findMany({
      where: { employeeTypeId, isActive: true },
      select: { id: true, name: true, nip: true },
      orderBy: { name: 'asc' }
    });

    const rosters = await prisma.employeeShiftRoster.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        rosterDate: { gte: startDate, lte: endDate },
      },
      include: { shift: true },
    });

    const shifts = await prisma.shift.findMany({
      where: { employeeTypeId, isActive: true },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json({ employees, rosters, shifts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeTypeId, month, year } = body;

  if (!employeeTypeId || !month || !year) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  try {
    const employees = await prisma.employee.findMany({
      where: { employeeTypeId, isActive: true },
      orderBy: { name: 'asc' }
    });

    const shifts = await prisma.shift.findMany({
      where: { employeeTypeId, isActive: true },
      orderBy: { startTime: 'asc' }
    });

    if (shifts.length === 0) {
      return NextResponse.json({ error: "No shifts found for this employee type" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employeeShiftRoster.deleteMany({
        where: {
          employeeId: { in: employees.map((e) => e.id) },
          rosterDate: { gte: startDate, lte: endDate },
        },
      });

      const rosterData = [];

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        let shiftIndex = i % shifts.length; 
        let daysSinceOff = 0;
        let forceOffNext = false;

        for (const day of days) {
          if (forceOffNext) {
            rosterData.push({
              employeeId: emp.id,
              rosterDate: day,
              shiftId: null,
              isDayOff: true,
              notes: "Libur (Pasca 24 Jam)"
            });
            forceOffNext = false;
            daysSinceOff = 0;
            // Pindah ke shift berikutnya setelah libur
            shiftIndex = (shiftIndex + 1) % shifts.length;
            continue;
          }

          // Siklus libur standar:
          // Jika ada banyak shift (misal Pagi, Siang, Malam), kerja 3 hari lalu libur 1 hari
          if (daysSinceOff >= shifts.length && shifts.length > 1) {
            rosterData.push({
              employeeId: emp.id,
              rosterDate: day,
              shiftId: null,
              isDayOff: true,
              notes: "Auto Libur (Rolling)"
            });
            daysSinceOff = 0;
            continue;
          } else if (shifts.length === 1 && daysSinceOff >= 6) {
            // Jika hanya ada 1 shift non-24 jam, libur setiap 7 hari
            rosterData.push({
              employeeId: emp.id,
              rosterDate: day,
              shiftId: null,
              isDayOff: true,
              notes: "Auto Libur Mingguan"
            });
            daysSinceOff = 0;
            continue;
          }

          const shift = shifts[shiftIndex];
          rosterData.push({
            employeeId: emp.id,
            rosterDate: day,
            shiftId: shift.id,
            isDayOff: false,
            notes: null
          });
          
          if (shift.is24Hours) {
            forceOffNext = true;
          } else {
            daysSinceOff++;
            shiftIndex = (shiftIndex + 1) % shifts.length;
          }
        }
      }

      await tx.employeeShiftRoster.createMany({
        data: rosterData
      });
    });

    return NextResponse.json({ message: "Roster generated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeId, rosterDate, shiftId, isDayOff } = body;

  try {
    const updated = await prisma.employeeShiftRoster.upsert({
      where: {
        employeeId_rosterDate: {
          employeeId,
          rosterDate: new Date(rosterDate)
        }
      },
      update: {
        shiftId,
        isDayOff,
        notes: isDayOff ? "Manual Edit (Libur)" : "Manual Edit"
      },
      create: {
        employeeId,
        rosterDate: new Date(rosterDate),
        shiftId,
        isDayOff,
        notes: isDayOff ? "Manual Edit (Libur)" : "Manual Edit"
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
