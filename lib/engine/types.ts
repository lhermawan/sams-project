export type RuleStage =
  | "PRE_CHECK_IN"
  | "CHECK_IN"
  | "IN_SHIFT"
  | "PRE_CHECK_OUT"
  | "CHECK_OUT";

export interface RuleValidationResult {
  isPassed: boolean;
  message?: string;
  isBlocking?: boolean;
  details?: Record<string, any>;
}

export interface AttendanceContext {
  employeeId: string;
  employeeTypeId: string;
  workDate: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  latitude?: number | null;
  longitude?: number | null;
  isMockLocation?: boolean;
  handoverId?: string | null;
  notes?: string | null;
  shift?: any;
  schedule?: any;
  attendanceId?: string;
  [key: string]: any;
}

export interface AttendanceRuleContract {
  getRuleType(): string;
  getStage(): RuleStage;
  validate(context: AttendanceContext, configuration: Record<string, any>): Promise<RuleValidationResult>;
}
