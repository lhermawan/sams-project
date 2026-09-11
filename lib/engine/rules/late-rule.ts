import { prisma } from "@/lib/db";
import { fromZonedTime } from "date-fns-tz";
import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "../types";

export class LateRule implements AttendanceRuleContract {
  public getRuleType(): string {
    return "LATE_TOLERANCE";
  }

  public getStage(): RuleStage {
    return "CHECK_IN";
  }

  public async validate(
    context: AttendanceContext,
    configuration: Record<string, any>
  ): Promise<RuleValidationResult> {
    const gracePeriodMinutes = configuration.gracePeriodMinutes ?? 15;
    const maxLateMinutes = configuration.maxLateMinutes ?? 120;
    const actionOnExceedMax = configuration.actionOnExceedMax ?? "BLOCK_CHECKIN";

    const checkInTime = context.checkInTime || new Date();
    const startTimeStr = context.shift?.startTime || context.schedule?.startTime || "08:00";
    const [startH, startM] = startTimeStr.split(":").map(Number);

    // Calculate shift start timestamp on workDate
    const scheduledStart = new Date(context.workDate);
    scheduledStart.setHours(startH, startM, 0, 0);

    const diffMinutes = Math.round((checkInTime.getTime() - scheduledStart.getTime()) / 60000);

    // If on time or within grace period
    if (diffMinutes <= gracePeriodMinutes) {
      return {
        isPassed: true,
        details: {
          lateMinutes: 0,
          isLate: false,
          gracePeriodMinutes,
        },
      };
    }

    // Actual late minutes calculated from schedule start
    const lateMinutes = Math.max(0, diffMinutes);

    // Check if exceeds maximum allowed late minutes
    if (lateMinutes > maxLateMinutes) {
      if (actionOnExceedMax === "BLOCK_CHECKIN") {
        return {
          isPassed: false,
          isBlocking: true,
          message: `Keterlambatan (${lateMinutes} menit) melebihi batas maksimal yang diizinkan (${maxLateMinutes} menit). Silakan lapor langsung ke HRD / Atasan Anda.`,
          details: { lateMinutes, maxLateMinutes, isExcessiveLate: true },
        };
      } else {
        // ALLOW_FLAG_EXCESSIVE_LATE
        return {
          isPassed: true,
          details: {
            lateMinutes,
            isLate: true,
            isExcessiveLate: true,
            warning: `Terlambat ${lateMinutes} menit (melebihi batas toleransi).`,
          },
        };
      }
    }

    return {
      isPassed: true,
      details: {
        lateMinutes,
        isLate: true,
        isExcessiveLate: false,
        warning: `Terlambat ${lateMinutes} menit (Jadwal: ${startTimeStr} WIB).`,
      },
    };
  }
}
