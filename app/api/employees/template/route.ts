import { NextResponse } from "next/server";

export async function GET() {
  const headers = [
    "NIP",
    "Nama Lengkap",
    "Email",
    "Password",
    "Bagian",
    "Jabatan",
    "Nomor Telepon",
    "Alamat",
  ];

  const sampleRows = [
    [
      "198501012010011001",
      "Budi Santoso",
      "budi.santoso@perusahaan.com",
      "Pegawai@123",
      "Teknologi Informasi",
      "Software Engineer",
      "081234567890",
      "Jl. Jenderal Sudirman No. 10, Jakarta",
    ],
    [
      "199002022015022002",
      "Siti Rahmawati",
      "siti.rahmawati@perusahaan.com",
      "Pegawai@123",
      "Operasional",
      "Staff Administrasi",
      "081298765432",
      "Jl. Gatot Subroto No. 25, Jakarta",
    ],
    [
      "199203032018031003",
      "Ahmad Fauzi",
      "ahmad.fauzi@perusahaan.com",
      "Pegawai@123",
      "Keamanan",
      "Petugas Keamanan",
      "081311223344",
      "Jl. Rasuna Said No. 5, Jakarta",
    ],
    [
      "199505052021012005",
      "Dewi Lestari",
      "dewi.lestari@perusahaan.com",
      "Pegawai@123",
      "Pelayanan",
      "Customer Service",
      "081377889900",
      "Jl. M.H. Thamrin No. 8, Jakarta",
    ],
    [
      "199606062022022006",
      "Rian Pratama",
      "rian.pratama@perusahaan.com",
      "Pegawai@123",
      "Keuangan",
      "Staff Akuntansi",
      "081255443322",
      "Jl. Diponegoro No. 15, Bandung",
    ],
  ];

  const csvContent =
    "\uFEFF" +
    [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...sampleRows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\r\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="template_data_pegawai_sams.csv"',
    },
  });
}