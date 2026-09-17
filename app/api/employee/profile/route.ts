import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.employeeId || !session.user.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentEmployee = await prisma.employee.findFirst({
      where: {
        id: session.user.employeeId,
        tenantId: session.user.tenantId,
      },
      include: { user: true },
    });

    if (!currentEmployee || !currentEmployee.user) {
      return NextResponse.json(
        { error: "Data pegawai tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, phone, address, photo } = body;

    let updatedEmail: string | undefined = undefined;

    // 1. Validasi & Normalisasi Username / Email
    if (email !== undefined) {
      let normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return NextResponse.json(
          { error: "Username atau Email tidak boleh kosong." },
          { status: 400 }
        );
      }

      if (!normalizedEmail.includes("@")) {
        normalizedEmail = `${normalizedEmail}@5758inc.id`;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          { error: "Format email atau username tidak valid." },
          { status: 400 }
        );
      }

      // Cek keunikan dalam mitra yang sama jika ada perubahan
      if (normalizedEmail !== currentEmployee.user.email.toLowerCase()) {
        const existingUser = await prisma.user.findFirst({
          where: {
            tenantId: session.user.tenantId,
            email: normalizedEmail,
            NOT: { id: currentEmployee.userId },
          },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: "Username atau Email sudah terdaftar oleh akun lain di mitra ini." },
            { status: 400 }
          );
        }
        updatedEmail = normalizedEmail;
      }
    }

    // 2. Handle Ganti Foto Profil (Anti-cache & Auto Cleanup)
    let newPhotoUrl: string | undefined = undefined;
    if (photo && typeof photo === "string" && photo.startsWith("data:image")) {
      const uploadDir = join(process.cwd(), "public", "uploads", "profiles");
      await mkdir(uploadDir, { recursive: true });

      // Auto-cleanup foto lama
      if (
        currentEmployee.photoUrl &&
        currentEmployee.photoUrl.startsWith("/uploads/profiles/")
      ) {
        const oldFileName = currentEmployee.photoUrl.replace(
          "/uploads/profiles/",
          ""
        );
        const oldFilePath = join(uploadDir, oldFileName);
        try {
          if (existsSync(oldFilePath)) {
            await unlink(oldFilePath);
          }
        } catch (cleanupErr) {
          console.warn("Gagal menghapus foto profil lama:", cleanupErr);
        }
      }

      const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const timestamp = Date.now();
      const filename = `profile_${currentEmployee.id}_${timestamp}.jpg`;
      await writeFile(join(uploadDir, filename), buffer);
      newPhotoUrl = `/uploads/profiles/${filename}`;
    }

    // 3. Update User & Employee
    if (updatedEmail) {
      await prisma.user.update({
        where: { id: currentEmployee.userId },
        data: { email: updatedEmail },
      });
    }

    const employeeUpdateData: {
      phone?: string | null;
      address?: string | null;
      photoUrl?: string;
    } = {};

    if (phone !== undefined) {
      employeeUpdateData.phone = phone ? String(phone).trim() : null;
    }
    if (address !== undefined) {
      employeeUpdateData.address = address ? String(address).trim() : null;
    }
    if (newPhotoUrl) {
      employeeUpdateData.photoUrl = newPhotoUrl;
    }

    if (Object.keys(employeeUpdateData).length > 0) {
      await prisma.employee.update({
        where: { id: currentEmployee.id },
        data: employeeUpdateData,
      });
    }

    // 4. Catat Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          action: "UPDATE_PROFILE",
          entity: "Employee",
          entityId: currentEmployee.id,
          newData: JSON.stringify({
            email: updatedEmail ?? currentEmployee.user.email,
            phone: employeeUpdateData.phone ?? currentEmployee.phone,
            address: employeeUpdateData.address ?? currentEmployee.address,
            photoUrl: newPhotoUrl ?? currentEmployee.photoUrl,
          }),
        },
      });
    } catch (auditErr) {
      console.error("Audit log profile update error:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui.",
      data: {
        email: updatedEmail ?? currentEmployee.user.email,
        phone:
          employeeUpdateData.phone !== undefined
            ? employeeUpdateData.phone
            : currentEmployee.phone,
        address:
          employeeUpdateData.address !== undefined
            ? employeeUpdateData.address
            : currentEmployee.address,
        photoUrl: newPhotoUrl ?? currentEmployee.photoUrl,
      },
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan pada server saat memperbarui profil." },
      { status: 500 }
    );
  }
}
