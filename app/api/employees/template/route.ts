import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data Pegawai");

  // Define columns
  worksheet.columns = [
    { header: "NIP", key: "nip", width: 25 },
    { header: "Nama Lengkap", key: "nama", width: 30 },
    { header: "Bagian", key: "bagian", width: 25 },
    { header: "Jabatan", key: "jabatan", width: 25 },
    { header: "Kode Jenis Pegawai", key: "kode", width: 25 },
    { header: "Nomor Telepon", key: "telepon", width: 20 },
    { header: "Alamat", key: "alamat", width: 40 },
  ];

  // Style header row
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }, // Indigo 600
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Add sample rows
  const sampleRows = [
    {
      nip: "198501012010011001",
      nama: "Budi Santoso",
      bagian: "Teknologi Informasi",
      jabatan: "Software Engineer",
      kode: "SECURITY", // Using user's requested example
      telepon: "081234567890",
      alamat: "Jl. Jenderal Sudirman No. 10, Jakarta",
    },
    {
      nip: "199002022015022002",
      nama: "Siti Rahmawati",
      bagian: "Operasional",
      jabatan: "Staff Administrasi",
      kode: "NS",
      telepon: "081298765432",
      alamat: "Jl. Gatot Subroto No. 25, Jakarta",
    },
  ];

  sampleRows.forEach((row) => {
    worksheet.addRow(row);
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Template_Pegawai.xlsx"',
    },
  });
}