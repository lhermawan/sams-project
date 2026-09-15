import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "../types";
import { addDays } from "date-fns";

export class EarlyCheckoutRule implements AttendanceRuleContract {
  getRuleType(): string {
    return "EARLY_CHECKOUT_LOCK";
  }

  getStage(): RuleStage {
    return "PRE_CHECK_OUT";
  }

  async validate(context: AttendanceContext, config: any): Promise<RuleValidationResult> {
    if (!context.shift || !context.shift.endTime || !context.workDate) {
      return { isPassed: true }; // No shift end time to validate against
    }

    const toleranceMinutes = typeof config.toleranceMinutes === "number" ? config.toleranceMinutes : 0;
    const now = context.checkOutTime || new Date();

    const [endH, endM] = context.shift.endTime.split(":").map(Number);
    let scheduledEnd = new Date(context.workDate);
    scheduledEnd.setHours(endH, endM, 0, 0);

    // If shift is cross-day or 24 hours, end time is on next day
    if (context.shift.isCrossDay || context.shift.is24Hours) {
      scheduledEnd = addDays(scheduledEnd, 1);
    }

    // Calculate the earliest allowed checkout time
    const earliestCheckout = new Date(scheduledEnd.getTime() - toleranceMinutes * 60000);

    if (now < earliestCheckout) {
      const allowedTimeStr = earliestCheckout.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      return {
        isPassed: false,
        isBlocking: true, // Blocks checkout completely
        message: `Belum masuk waktu absen pulang. Kamu baru bisa checkout mulai jam ${allowedTimeStr} WIB.`,
        details: {
          earliestCheckout,
          now,
          toleranceMinutes
        }
      };
    }

    return { isPassed: true };
  }
}
