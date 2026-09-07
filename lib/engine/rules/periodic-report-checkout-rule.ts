import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "../types";
import { prisma } from "@/lib/db";

export class PeriodicReportCheckoutRule implements AttendanceRuleContract {
  public getRuleType(): string {
    return "PERIODIC_REPORT";
  }

  public getStage(): RuleStage {
    return "PRE_CHECK_OUT";
  }

  public async validate(
    context: AttendanceContext,
    configuration: Record<string, any>
  ): Promise<RuleValidationResult> {
    const attendanceId = context.attendanceId;
    if (!attendanceId) {
      return { isPassed: true };
    }

    const checkoutAction = configuration.checkoutAction ?? "ALLOW_WITH_INCOMPLETE_STATUS";

    // Find incomplete/pending periodic reports
    const incompleteReports = await prisma.periodicReport.findMany({
      where: {
        attendanceId,
        status: { in: ["PENDING", "MISSED"] },
      },
    });

    if (incompleteReports.length > 0) {
      if (checkoutAction === "BLOCK") {
        return {
          isPassed: false,
          isBlocking: true,
          message: `Check-out tidak diizinkan. Terdapat ${incompleteReports.length} laporan patroli yang belum Anda selesaikan.`,
          details: { incompleteCount: incompleteReports.length },
        };
      } else {
        // ALLOW_WITH_INCOMPLETE_STATUS
        return {
          isPassed: true,
          details: {
            markIncomplete: true,
            incompleteCount: incompleteReports.length,
            reason: `Absen pulang disetujui namun terdapat ${incompleteReports.length} laporan patroli yang tidak diselesaikan.`,
          },
        };
      }
    }

    return {
      isPassed: true,
      details: { markIncomplete: false },
    };
  }
}
