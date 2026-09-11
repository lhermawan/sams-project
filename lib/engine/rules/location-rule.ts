import { AttendanceRuleContract, RuleStage, AttendanceContext, RuleValidationResult } from "../types";
import { prisma } from "@/lib/db";
import { isWithinRadius } from "@/lib/geolocation";

export class LocationRule implements AttendanceRuleContract {
  public getRuleType(): string {
    return "LOCATION";
  }

  public getStage(): RuleStage {
    return "CHECK_IN";
  }

  public async validate(
    context: AttendanceContext,
    configuration: Record<string, any>
  ): Promise<RuleValidationResult> {
    const enforceGeofence = configuration.enforceGeofence ?? true;
    if (!enforceGeofence) {
      return { isPassed: true };
    }

    // Check mock location
    if (context.isMockLocation) {
      return {
        isPassed: false,
        isBlocking: true,
        message: "Terdeteksi penggunaan aplikasi Fake GPS / Mock Location. Absensi ditolak demi keamanan data.",
      };
    }

    const { latitude, longitude } = context;
    if (latitude == null || longitude == null) {
      return {
        isPassed: false,
        isBlocking: true,
        message: "Koordinat GPS lokasi tidak ditemukan. Mohon aktifkan izin GPS perangkat Anda.",
      };
    }

    const office = await prisma.officeLocation.findFirst({
      where: { isActive: true, tenantId: context.tenantId },
    });

    if (!office) {
      return { isPassed: true }; // No active office configured
    }

    const allowedRadius = configuration.radiusMeters ?? office.radius ?? 100;
    const validation = isWithinRadius(
      latitude,
      longitude,
      office.latitude,
      office.longitude,
      allowedRadius
    );

    if (!validation.valid) {
      return {
        isPassed: false,
        isBlocking: true,
        message: `Anda berada di luar radius kantor (${Math.round(validation.distance)}m dari kantor, batas maks: ${allowedRadius}m).`,
        details: { distance: validation.distance, allowedRadius },
      };
    }

    return {
      isPassed: true,
      details: { distance: validation.distance, allowedRadius },
    };
  }
}
