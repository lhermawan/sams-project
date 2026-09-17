import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createManyNotifications } from "@/lib/notification";

// This endpoint should be triggered every minute via an external cron job (e.g. PM2, Linux cron, or Vercel cron)
export async function GET() {
  try {
    const now = new Date();
    // Use Indonesian time for date calculations
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now); // YYYY-MM-DD
    
    // Safer Day of week calculation in Asia/Jakarta
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
    });
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDayStr = formatter.format(now);
    const dayOfWeekInt = dayMap[currentDayStr];

    // Current hour and minute in Jakarta
    // Make sure we format it without AM/PM using hourCycle: 'h23'
    const formatterHour = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hourCycle: "h23", hour: "numeric" });
    const formatterMinute = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", minute: "numeric" });
    
    const currentH = parseInt(formatterHour.format(now));
    const currentM = parseInt(formatterMinute.format(now));
    const currentTotalMinutes = currentH * 60 + currentM;

    // Fetch all active reminder settings
    const reminderSettings = await prisma.reminderSetting.findMany({
      where: { isEnabled: true },
      include: {
        employeeType: {
          include: {
            workSchedules: {
              where: { isWorkDay: true, dayOfWeek: dayOfWeekInt }
            },
            shifts: true,
          }
        }
      }
    });

    let notificationsSent = 0;

    for (const setting of reminderSettings) {
      const type = setting.employeeType;
      if (!type.isActive) continue;

      let targetStartTimeTotal = null;
      let employeeIdsToRemind: string[] = [];

      if (type.scheduleType === "NON_SHIFT") {
        // Use work schedule
        const ws = type.workSchedules[0];
        if (ws && ws.startTime) {
          const [sh, sm] = ws.startTime.split(":").map(Number);
          targetStartTimeTotal = sh * 60 + sm;
        }

        if (targetStartTimeTotal !== null) {
          // Check if current time is exactly `minutesBefore` away from target
          if (currentTotalMinutes === targetStartTimeTotal - setting.minutesBefore) {
            // Find employees of this type who haven't checked in today
            const empsWithoutAttendance = await prisma.employee.findMany({
              where: {
                employeeTypeId: type.id,
                isActive: true,
              },
              include: {
                attendances: {
                  where: {
                    date: new Date(todayStr + "T00:00:00Z")
                  }
                }
              }
            });

            for (const emp of empsWithoutAttendance) {
              if (emp.attendances.length === 0 && emp.userId) {
                employeeIdsToRemind.push(emp.userId);
              }
            }
          }
        }
      } else if (type.scheduleType === "SHIFT") {
        // Check rosters for today
        const rosters = await prisma.employeeShiftRoster.findMany({
          where: {
            rosterDate: new Date(todayStr + "T00:00:00Z"),
            employee: { employeeTypeId: type.id, isActive: true },
          },
          include: {
            shift: true,
            employee: {
              include: {
                attendances: {
                  where: { date: new Date(todayStr + "T00:00:00Z") }
                }
              }
            }
          }
        });

        for (const roster of rosters) {
          if (roster.shift && roster.shift.startTime && roster.employee.attendances.length === 0) {
            const [sh, sm] = roster.shift.startTime.split(":").map(Number);
            const targetTotal = sh * 60 + sm;
            // Handle cross day / next day (simplification: if target < current, it might be tomorrow, but reminders usually happen before target)
            if (currentTotalMinutes === targetTotal - setting.minutesBefore || 
                (currentTotalMinutes === (1440 + targetTotal) - setting.minutesBefore)) {
              if (roster.employee.userId) {
                employeeIdsToRemind.push(roster.employee.userId);
              }
            }
          }
        }
      }

      if (employeeIdsToRemind.length > 0) {
        // Deduplicate userIds (in case they have multiple rosters matching? shouldn't happen)
        employeeIdsToRemind = Array.from(new Set(employeeIdsToRemind));
        
        // Send notification
        await createManyNotifications({
          data: employeeIdsToRemind.map((userId) => ({
            tenantId: setting.tenantId,
            userId,
            type: "REMINDER",
            title: "Pengingat Absensi",
            message: setting.message,
            data: JSON.stringify({ url: "/attendance" })
          }))
        });
        notificationsSent += employeeIdsToRemind.length;
      }
    }

    return NextResponse.json({ success: true, processed: reminderSettings.length, notificationsSent });

  } catch (error: any) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
