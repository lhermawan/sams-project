import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isWithinRadius } from "@/lib/geolocation";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { latitude, longitude, notes, photos } = await req.json();

    const report = await prisma.periodicReport.findUnique({
      where: { id },
      include: {
        attendance: {
          include: {
            employee: {
              include: {
                employeeType: {
                  include: {
                    rules: { where: { ruleType: "PERIODIC_REPORT", isActive: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!report || report.employeeId !== session.user.employeeId) {
      return NextResponse.json(
        { error: "Laporan patroli tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    if (report.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Laporan checkpoint patroli ini sudah pernah dikirimkan sebelumnya." },
        { status: 400 }
      );
    }

    // Get minPhotos from rule config
    const rule = report.attendance.employee.employeeType?.rules[0];
    let minPhotos = 3;
    if (rule) {
      try {
        const config = JSON.parse(rule.configuration);
        minPhotos = config.minPhotos ?? 3;
      } catch {}
    }

    if (!Array.isArray(photos) || photos.length < minPhotos) {
      return NextResponse.json(
        {
          error: `Wajib melampirkan minimal ${minPhotos} foto bukti patroli pos/lingkungan. Anda melampirkan ${photos?.length || 0} foto.`,
        },
        { status: 422 }
      );
    }

    const now = new Date();

    // Check distance if office location is configured
    let distanceMeters = 0;
    const office = await prisma.officeLocation.findFirst({ where: { isActive: true } });
    if (office && latitude && longitude) {
      const val = isWithinRadius(latitude, longitude, office.latitude, office.longitude, office.radius);
      distanceMeters = val.distance;
    }

    // Save photos
    const uploadDir = join(process.cwd(), "public", "uploads", "attendance");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {}

    const savedPhotosData: { photoUrl: string; fileHash: string; fileSizeBytes: number }[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photoStr = photos[i];
      let photoUrl = photoStr;
      let hash = "";
      let size = 0;

      if (typeof photoStr === "string" && photoStr.startsWith("data:image")) {
        const base64Data = photoStr.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        hash = crypto.createHash("sha256").update(buffer).digest("hex");
        size = buffer.length;
        const filename = `patrol_${report.id}_${Date.now()}_${i + 1}.jpg`;
        await writeFile(join(uploadDir, filename), buffer);
        photoUrl = `/uploads/attendance/${filename}`;
      } else {
        hash = crypto.createHash("sha256").update(photoStr).digest("hex");
        size = 1000;
      }

      savedPhotosData.push({
        photoUrl,
        fileHash: hash,
        fileSizeBytes: size,
      });
    }

    // Determine status (SUBMITTED or LATE)
    const isLate = now > new Date(report.toleranceEndAt);
    const newStatus = isLate ? "LATE" : "SUBMITTED";

    const updated = await prisma.periodicReport.update({
      where: { id: report.id },
      data: {
        submittedAt: now,
        latitude: latitude || null,
        longitude: longitude || null,
        distanceMeters,
        reportNotes: notes || null,
        status: newStatus,
        photos: {
          create: savedPhotosData.map((p) => ({
            photoUrl: p.photoUrl,
            fileHash: p.fileHash,
            fileSizeBytes: p.fileSizeBytes,
            mimeType: "image/jpeg",
          })),
        },
      },
      include: {
        photos: true,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PATROL_REPORT_SUBMITTED",
        entity: "PeriodicReport",
        entityId: updated.id,
        newData: JSON.stringify({
          checkpointSequence: updated.checkpointSequence,
          status: newStatus,
          photoCount: updated.photos.length,
          submittedAt: now,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: isLate
        ? `Laporan checkpoint ke-${updated.checkpointSequence} berhasil dikirim (Status: Terlambat).`
        : `Laporan checkpoint ke-${updated.checkpointSequence} berhasil diverifikasi tepat waktu.`,
      data: {
        id: updated.id,
        checkpointSequence: updated.checkpointSequence,
        status: updated.status,
        submittedAt: updated.submittedAt,
        photosCount: updated.photos.length,
      },
    });
  } catch (err: any) {
    console.error("POST /api/reports/periodic/[id]/submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
