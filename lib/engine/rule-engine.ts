import { prisma } from "@/lib/db";
import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "./types";
import { HandoverRule } from "./rules/handover-rule";
import { LocationRule } from "./rules/location-rule";
import { LateRule } from "./rules/late-rule";
import { PeriodicReportCheckoutRule } from "./rules/periodic-report-checkout-rule";

export class AttendanceRuleEngine {
  private static rulesRegistry: Map<string, AttendanceRuleContract> = new Map();

  static {
    // Register standard rules
    this.register(new HandoverRule());
    this.register(new LocationRule());
    this.register(new LateRule());
    this.register(new PeriodicReportCheckoutRule());
  }

  public static register(rule: AttendanceRuleContract) {
    this.rulesRegistry.set(`${rule.getRuleType()}_${rule.getStage()}`, rule);
  }

  /**
   * Execute all active rules for an employee type at a specific stage.
   */
  public static async executeStage(
    stage: RuleStage,
    context: AttendanceContext
  ): Promise<RuleValidationResult & { combinedDetails?: Record<string, any> }> {
    // Fetch active rules configured in database for this employee type
    const dbRules = await prisma.attendanceRule.findMany({
      where: {
        employeeTypeId: context.employeeTypeId,
        executionStage: stage,
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });

    const combinedDetails: Record<string, any> = {};

    for (const dbRule of dbRules) {
      const handler = this.rulesRegistry.get(`${dbRule.ruleType}_${stage}`);
      if (!handler) {
        continue;
      }

      let config: Record<string, any> = {};
      try {
        config = JSON.parse(dbRule.configuration);
      } catch {
        config = {};
      }

      const result = await handler.validate(context, config);

      // Log execution
      await prisma.attendanceRuleLog.create({
        data: {
          attendanceId: context.attendanceId || null,
          employeeId: context.employeeId,
          ruleType: dbRule.ruleType,
          executionStage: stage,
          isPassed: result.isPassed,
          failureReason: result.message || null,
          contextSnapshot: JSON.stringify({
            details: result.details,
            isBlocking: result.isBlocking,
          }),
        },
      });

      if (result.details) {
        Object.assign(combinedDetails, result.details);
      }

      if (!result.isPassed && result.isBlocking) {
        return {
          isPassed: false,
          isBlocking: true,
          message: result.message,
          combinedDetails,
        };
      }
    }

    return {
      isPassed: true,
      combinedDetails,
    };
  }
}
