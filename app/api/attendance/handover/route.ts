import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notes, handedOverById, photos, itemChecklist } = await req.json();

    if (!notes || typeof notes !== "string" || notes.trim().length < 5) {
      return NextResponse.json(
        { error: "Catatan serah terima wajib diisi (minimal 5 karakter)." },
        { status: 422 }
      );
    }

    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { error: "Wajib melampirkan minimal 1 foto bukti serah terima inventaris/pos." },
        { status: 422 }
      );
    }

    // Save photos to storage
    const uploadDir = join(process.cwd(), "public", "uploads", "attendance");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // directory already exists or read-only
    }

    const savedPhotoUrls: string[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photoStr = photos[i];
      let finalUrl = photoStr;

      if (typeof photoStr === "string" && photoStr.startsWith("data:image")) {
        try {
          const base64Data = photoStr.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const filename = `handover_${session.user.employeeId}_${Date.now()}_${i + 1}.jpg`;
          await writeFile(join(uploadDir, filename), buffer);
          finalUrl = `/uploads/attendance/${filename}`;
        } catch {
          finalUrl = photoStr;
        }
      }
      savedPhotoUrls.push(finalUrl);
    }

    // Create AttendanceHandover record
    const handover = await prisma.attendanceHandover.create({
      data: {
        employeeId: session.user.employeeId,
        handedOverById: handedOverById || null,
        handoverNotes: notes.trim(),
        itemChecklist: itemChecklist ? JSON.stringify(itemChecklist) : null,
        status: "COMPLETED",
        photos: {
          create: savedPhotoUrls.map((url) => ({
            photoUrl: url,
            mimeType: "image/jpeg",
          })),
        },
          tenantId: session.user.tenantId
    },
      include: {
        photos: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "HANDOVER_SUBMITTED",
        entity: "AttendanceHandover",
        entityId: handover.id,
        newData: JSON.stringify({
          notes: handover.handoverNotes,
          photoCount: handover.photos.length,
        }),
        ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
          tenantId: session.user.tenantId
    },
    });

    return NextResponse.json({
      success: true,
      message: "Serah terima tugas berhasil disimpan. Anda dapat melanjutkan absen masuk.",
      data: {
        id: handover.id,
        status: handover.status,
        photoCount: handover.photos.length,
      },
    });
  } catch (err: any) {
    console.error("POST /api/attendance/handover error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
