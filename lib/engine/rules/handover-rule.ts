import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "../types";
import { prisma } from "@/lib/db";

export class HandoverRule implements AttendanceRuleContract {
  public getRuleType(): string {
    return "HANDOVER";
  }

  public getStage(): RuleStage {
    return "PRE_CHECK_IN";
  }

  public async validate(
    context: AttendanceContext,
    configuration: Record<string, any>
  ): Promise<RuleValidationResult> {
    const requireHandover = configuration.requireHandover ?? true;
    if (!requireHandover) {
      return { isPassed: true };
    }

    const handoverId = context.handoverId;
    if (!handoverId) {
      return {
        isPassed: false,
        isBlocking: true,
        message: "Wajib melakukan dan melampirkan Serah Terima Tugas sebelum absen masuk.",
      };
    }

    const handover = await prisma.attendanceHandover.findUnique({
      where: { id: handoverId },
      include: { photos: true },
    });

    if (!handover || handover.employeeId !== context.employeeId) {
      return {
        isPassed: false,
        isBlocking: true,
        message: "Data serah terima tugas tidak valid atau milik pegawai lain.",
      };
    }

    const minPhotos = configuration.minPhotos ?? 1;
    if (handover.photos.length < minPhotos) {
      return {
        isPassed: false,
        isBlocking: true,
        message: `Serah terima membutuhkan minimal ${minPhotos} foto bukti fisik. Foto saat ini: ${handover.photos.length}.`,
      };
    }

    return {
      isPassed: true,
      details: { handoverId: handover.id, photosCount: handover.photos.length },
    };
  }
}
