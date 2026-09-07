"use client";

import { useState } from "react";
import {
  UserCheck,
  UserX,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Loader2,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
  Phone,
  MapPin,
  Briefcase,
  Mail,
  Calendar,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
} from "lucide-react";

export interface Employee {
  id: string;
  nip: string;
  name: string;
  department: string;
  position: string;
  phone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  isActive: boolean;
  user: {
    email: string;
    isActive: boolean;
  };
}

export default function EmployeeTable({ employees: initialEmployees }: { employees: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  // Modals state
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [deleteEmp, setDeleteEmp] = useState<Employee | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    nip: "",
    email: "",
    department: "",
    position: "",
    phone: "",
    address: "",
    isActive: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");

  // CSV Import State
  const [importModal, setImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{
    insertedCount: number;
    updatedCount: number;
    totalProcessed: number;
  } | null>(null);

  const parseCSVText = (text: string) => {
    const lines: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        if (current.trim().length > 0) lines.push(current);
        current = "";
        if (char === "\r" && text[i + 1] === "\n") i++;
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) lines.push(current);
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";

    const splitLine = (l: string) => {
      const cells: string[] = [];
      let c = "";
      let q = false;
      for (let i = 0; i < l.length; i++) {
        const ch = l[i];
        if (ch === '"') {
          if (q && l[i + 1] === '"') {
            c += '"';
            i++;
          } else {
            q = !q;
          }
        } else if (ch === delim && !q) {
          cells.push(c.trim());
          c = "";
        } else {
          c += ch;
        }
      }
      cells.push(c.trim());
      return cells;
    };

    const rawHeaders = splitLine(lines[0]).map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    const dataRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i]);
      if (values.every((v) => !v)) continue;
      const row: any = {};
      rawHeaders.forEach((h, idx) => {
        const val = values[idx] ?? "";
        if (h.includes("nip") || h.includes("id")) row.nip = val;
        else if (h.includes("nama")) row.name = val;
        else if (h.includes("email")) row.email = val;
        else if (h.includes("pass")) row.password = val;
        else if (h.includes("bagian") || h.includes("dept") || h.includes("divisi"))
          row.department = val;
        else if (h.includes("jabat") || h.includes("posisi")) row.position = val;
        else if (h.includes("telp") || h.includes("phone") || h.includes("hp")) row.phone = val;
        else if (h.includes("alamat")) row.address = val;
      });

      if (row.name || row.nip) {
        dataRows.push(row);
      }
    }
    return dataRows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setIsParsing(true);
    setImportError("");
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          setImportError("Berkas tidak memiliki baris data yang valid.");
        } else {
          setParsedEmployees(rows);
        }
      } catch (err: any) {
        setImportError("Gagal membaca berkas CSV: " + (err.message || "format tidak valid"));
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setImportError("Gagal membaca berkas");
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedEmployees.length === 0) return;
    setIsImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: parsedEmployees }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimpor data");

      setImportResult({
        insertedCount: data.insertedCount ?? 0,
        updatedCount: data.updatedCount ?? 0,
        totalProcessed: data.totalProcessed ?? parsedEmployees.length,
      });
    } catch (err: any) {
      setImportError(err.message || "Terjadi kesalahan saat memproses import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditEmp(emp);
    setEditForm({
      name: emp.name,
      nip: emp.nip,
      email: emp.user.email,
      department: emp.department,
      position: emp.position,
      phone: emp.phone ?? "",
      address: emp.address ?? "",
      isActive: emp.isActive,
    });
    setEditError("");
    setEditSuccess("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmp) return;
    setIsSavingEdit(true);
    setEditError("");
    setEditSuccess("");

    try {
      const res = await fetch(`/api/employees/${editEmp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan perubahan");

      setEmployees((prev) =>
        prev.map((item) =>
          item.id === editEmp.id
            ? {
                ...item,
                name: editForm.name,
                nip: editForm.nip,
                department: editForm.department,
                position: editForm.position,
                phone: editForm.phone,
                address: editForm.address,
                isActive: editForm.isActive,
                user: {
                  ...item.user,
                  email: editForm.email,
                  isActive: editForm.isActive,
                },
              }
            : item
        )
      );

      setEditSuccess("Data pegawai berhasil diperbarui!");
      setTimeout(() => setEditEmp(null), 1200);
    } catch (err: any) {
      setEditError(err.message ?? "Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (permanent: boolean) => {
    if (!deleteEmp) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/employees/${deleteEmp.id}?permanent=${permanent}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menghapus data pegawai");

      if (permanent) {
        setEmployees((prev) => prev.filter((item) => item.id !== deleteEmp.id));
      } else {
        setEmployees((prev) =>
          prev.map((item) =>
            item.id === deleteEmp.id
              ? { ...item, isActive: false, user: { ...item.user, isActive: false } }
              : item
          )
        );
      }

      setDeleteEmp(null);
    } catch (err: any) {
      setDeleteError(err.message ?? "Terjadi kesalahan saat menghapus");
    } finally {
      setIsDeleting(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const num = Math.floor(100 + Math.random() * 900);
    const pass = `Sams@${num}${rand}`;
    setNewPassword(pass);
  };

  const handleOpenModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setNewPassword("");
    setResult(null);
    setError("");
    setCopied(false);
    generateRandomPassword();
  };

  const handleResetPassword = async () => {
    if (!selectedEmp || !newPassword.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/employees/${selectedEmp.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mereset password");

      setResult({
        email: data.email,
        password: data.password,
      });
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = `Akun SAMS Anda:\nEmail: ${result.email}\nPassword: ${result.password}\nLink: http://localhost:3001/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Employee Action Toolbar */}
      <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Data Pegawai
          </span>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
            {employees.length} Pegawai
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/employees/template"
            download="template_data_pegawai_sams.csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            title="Unduh format template CSV resmi untuk memudahkan input ratusan/ribuan pegawai"
          >
            <Download size={14} className="text-emerald-600" />
            Unduh Format CSV
          </a>
          <button
            type="button"
            onClick={() => {
              setImportModal(true);
              setCsvFile(null);
              setParsedEmployees([]);
              setImportResult(null);
              setImportError("");
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Upload size={14} />
            Tambah Pegawai via CSV / Excel
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Pegawai</th>
              <th className="px-6 py-3 text-left">ID Pegawai</th>
              <th className="px-6 py-3 text-left">Bagian</th>
              <th className="px-6 py-3 text-left">Jabatan</th>
              <th className="px-6 py-3 text-left">Email Login</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  Tidak ada data pegawai
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                        {emp.photoUrl ? (
                          <img src={emp.photoUrl} alt={emp.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>
                      <span className="font-medium text-gray-800">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs">{emp.nip}</td>
                  <td className="px-6 py-4 text-gray-700">{emp.department}</td>
                  <td className="px-6 py-4 text-gray-700">{emp.position}</td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs select-all">
                    {emp.user.email}
                  </td>
                  <td className="px-6 py-4">
                    {emp.isActive ? (
                      <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2.5 py-1 rounded-full text-xs w-fit">
                        <UserCheck size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2.5 py-1 rounded-full text-xs w-fit">
                        <UserX size={12} /> Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Read / Detail */}
                      <button
                        onClick={() => setDetailEmp(emp)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Lihat Detail Lengkap"
                      >
                        <Info size={15} />
                      </button>

                      {/* Update / Edit */}
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Data Pegawai"
                      >
                        <Pencil size={15} />
                      </button>

                      {/* Password Reset */}
                      <button
                        onClick={() => {
                          setSelectedEmp(emp);
                          setNewPassword("");
                          setResult(null);
                          setError("");
                          setCopied(false);
                          generateRandomPassword();
                        }}
                        className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Reset & Generate Password"
                      >
                        <KeyRound size={15} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          setDeleteEmp(emp);
                          setDeleteError("");
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus / Nonaktifkan Pegawai"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Kelola Password */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Kelola Akun & Password</h3>
                  <p className="text-xs text-gray-500">Reset & generate password baru untuk pegawai</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Pegawai */}
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Pegawai:</span>
                <span className="font-semibold text-gray-800">{selectedEmp.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID Pegawai:</span>
                <span className="font-mono text-gray-800">{selectedEmp.nip}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Email Login:</span>
                <span className="font-mono font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {selectedEmp.user.email}
                </span>
              </div>
            </div>

            {/* Input Password Baru */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Password Baru</label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw size={11} /> Generate Acak
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik atau generate password..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setNewPassword("Pegawai@123")}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors font-mono"
                >
                  Pegawai@123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword("Sams@2024")}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors font-mono"
                >
                  Sams@2024
                </button>
              </div>
            </div>

            {/* Result / Success Info */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-green-800 font-semibold text-xs">
                  <Check size={14} className="text-green-600" />
                  Password Berhasil Diperbarui!
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-200 text-xs font-mono space-y-1">
                  <div><span className="text-gray-400">Email:</span> <span className="text-gray-800 font-bold">{result.email}</span></div>
                  <div><span className="text-gray-400">Password:</span> <span className="text-blue-600 font-bold">{result.password}</span></div>
                </div>
                <button
                  onClick={copyCredentials}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Tersalin ke Clipboard!" : "Salin Kredensial untuk Pegawai"}
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {isLoading ? "Menyimpan..." : "Terapkan Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. MODAL DETAIL PEGAWAI (READ) ─────────────────────────────────── */}
      {detailEmp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Info size={18} className="text-blue-600" />
                Detail Data Pegawai
              </h3>
              <button onClick={() => setDetailEmp(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">
                {detailEmp.photoUrl ? (
                  <img src={detailEmp.photoUrl} alt={detailEmp.name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  detailEmp.name.charAt(0)
                )}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-base">{detailEmp.name}</h4>
                <p className="text-xs text-gray-500">{detailEmp.position} · {detailEmp.department}</p>
                <div className="mt-1">
                  {detailEmp.isActive ? (
                    <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">Aktif</span>
                  ) : (
                    <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full font-medium">Nonaktif</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-700">
              <div className="flex items-center gap-2.5 py-1 border-b border-gray-50">
                <Briefcase size={14} className="text-gray-400" />
                <span className="text-gray-500 w-24">ID Pegawai:</span>
                <span className="font-mono font-semibold">{detailEmp.nip}</span>
              </div>
              <div className="flex items-center gap-2.5 py-1 border-b border-gray-50">
                <Mail size={14} className="text-gray-400" />
                <span className="text-gray-500 w-24">Email Login:</span>
                <span className="font-mono text-blue-600">{detailEmp.user.email}</span>
              </div>
              <div className="flex items-center gap-2.5 py-1 border-b border-gray-50">
                <Phone size={14} className="text-gray-400" />
                <span className="text-gray-500 w-24">No. Telepon:</span>
                <span>{detailEmp.phone || "-"}</span>
              </div>
              <div className="flex items-start gap-2.5 py-1 border-b border-gray-50">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <span className="text-gray-500 w-24">Alamat:</span>
                <span className="flex-1">{detailEmp.address || "-"}</span>
              </div>
              <div className="flex items-center gap-2.5 py-1">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-500 w-24">Tgl Bergabung:</span>
                <span>
                  {detailEmp.joinDate
                    ? new Date(detailEmp.joinDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "-"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailEmp(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. MODAL EDIT PEGAWAI (UPDATE) ─────────────────────────────────── */}
      {editEmp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Pencil size={18} className="text-emerald-600" />
                Edit Data Pegawai
              </h3>
              <button onClick={() => setEditEmp(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Nama Lengkap *</label>
                  <input
                    required
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">ID Pegawai *</label>
                  <input
                    required
                    type="text"
                    value={editForm.nip}
                    onChange={(e) => setEditForm({ ...editForm, nip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Email Login *</label>
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Bagian * (Ketik Manual)</label>
                  <input
                    required
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="Contoh: IT, Keuangan, Operasional"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Jabatan *</label>
                  <input
                    required
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Alamat</label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Status Kepegawaian</label>
                <select
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="active">Aktif (Dapat Login & Absen)</option>
                  <option value="inactive">Nonaktif (Akses Dinonaktifkan)</option>
                </select>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-xl text-xs">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-2.5 rounded-xl text-xs font-medium">
                  {editSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditEmp(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. MODAL HAPUS / NONAKTIFKAN PEGAWAI (DELETE) ─────────────────── */}
      {deleteEmp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Hapus atau Nonaktifkan?</h3>
                <p className="text-xs text-gray-500">Pilih tindakan untuk data pegawai ini</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-xl text-xs border border-gray-200 space-y-1">
              <div>Pegawai: <span className="font-bold text-gray-800">{deleteEmp.name}</span></div>
              <div>ID Pegawai: <span className="font-mono text-gray-700">{deleteEmp.nip}</span></div>
              <div>Bagian: <span className="text-gray-700">{deleteEmp.department}</span></div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Anda dapat memilih untuk <b>menonaktifkan</b> status akun pegawai (data dan riwayat absensi tetap tersimpan aman), atau <b>menghapus permanen</b> seluruh data dari sistem.
            </p>

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleDelete(false)}
                disabled={isDeleting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
                Nonaktifkan Akun (Disarankan)
              </button>

              <button
                onClick={() => {
                  if (confirm(`Yakin ingin MENGHAPUS PERMANEN pegawai ${deleteEmp.name}? Seluruh riwayat absensi pegawai ini akan terhapus dan tidak dapat dikembalikan.`)) {
                    handleDelete(true);
                  }
                }}
                disabled={isDeleting}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Hapus Permanen dari Database
              </button>

              <button
                onClick={() => setDeleteEmp(null)}
                disabled={isDeleting}
                className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
          {/* Modal: Tambah Pegawai via Upload File CSV */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Upload size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">
                    Tambah Pegawai Massal via Berkas CSV / Excel
                  </h3>
                  <p className="text-xs text-gray-500">
                    Unggah berkas untuk mendaftarkan puluhan, ratusan, hingga ribuan pegawai dan bagian secara instan
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImportModal(false);
                  if (importResult && (importResult.insertedCount > 0 || importResult.updatedCount > 0)) {
                    window.location.reload();
                  }
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            {!importResult ? (
              <div className="space-y-4">
                {/* Format Guidance Box */}
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet size={15} />
                      Format Kolom File CSV yang Disediakan
                    </div>
                    <a
                      href="/api/employees/template"
                      download="template_data_pegawai_sams.csv"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200 shadow-2xs"
                    >
                      <Download size={12} />
                      Unduh Template CSV Contoh
                    </a>
                  </div>
                  <p className="text-xs text-gray-600">
                    Pastikan berkas CSV Anda memiliki kolom-kolom berikut (header dapat menggunakan huruf besar/kecil):
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded font-bold text-purple-900">
                      NIP
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded font-bold text-purple-900">
                      Nama Lengkap
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded text-gray-700">
                      Email (opsional)
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded text-gray-700">
                      Password (opsional)
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded font-bold text-purple-900">
                      Bagian
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded text-gray-700">
                      Jabatan
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded text-gray-700">
                      Nomor Telepon
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-purple-200 rounded text-gray-700">
                      Alamat
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-start gap-1.5">
                    <Info size={13} className="text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      <em>Catatan:</em> Kolom Bagian yang diisi akan otomatis menjadi pilihan filter baru di seluruh sistem (Monitoring & Laporan). Jika Email dikosongkan, sistem otomatis membuatkan email <code>nip@sams.id</code>. Password default adalah <code>Pegawai@123</code>.
                    </span>
                  </div>
                </div>

                {/* Upload Box */}
                <div className="border-2 border-dashed border-gray-300 hover:border-purple-500 rounded-2xl p-6 text-center transition-colors bg-gray-50/50">
                  <input
                    type="file"
                    id="employee-csv-input"
                    accept=".csv, .txt, .tsv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="employee-csv-input"
                    className="cursor-pointer block space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                      <Upload size={24} />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-purple-700 hover:underline">
                        Pilih Berkas CSV
                      </span>{" "}
                      <span className="text-sm text-gray-500">atau tarik ke area ini</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Mendukung berkas format .CSV, .TSV, atau .TXT (pemisah koma atau titik-koma)
                    </p>
                  </label>
                </div>

                {isParsing && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-gray-500">
                    <Loader2 size={16} className="animate-spin text-purple-600" />
                    <span>Menganalisis isi berkas...</span>
                  </div>
                )}

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-red-500" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Live Preview Table */}
                {parsedEmployees.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-green-600" />
                        Ditemukan: <strong className="text-purple-700">{parsedEmployees.length} Data Pegawai</strong>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Pratinjau 5 baris pertama
                      </span>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 font-semibold">NIP</th>
                            <th className="px-3 py-2 font-semibold">Nama</th>
                            <th className="px-3 py-2 font-semibold">Bagian</th>
                            <th className="px-3 py-2 font-semibold">Jabatan</th>
                            <th className="px-3 py-2 font-semibold">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parsedEmployees.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-gray-700">{row.nip || "-"}</td>
                              <td className="px-3 py-2 font-semibold text-gray-800">{row.name || "-"}</td>
                              <td className="px-3 py-2 text-purple-700 font-medium">{row.department || "Umum"}</td>
                              <td className="px-3 py-2 text-gray-600">{row.position || "Staff"}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">{row.email || "(otomatis)"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setImportModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={isImporting || parsedEmployees.length === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    {isImporting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {isImporting
                      ? "Mengimpor ke Database..."
                      : `Mulai Import ${parsedEmployees.length} Pegawai Sekarang`}
                  </button>
                </div>
              </div>
            ) : (
              /* Success Result View */
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-800">
                    Import Pegawai Berhasil!
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Seluruh data telah tersimpan dan siap digunakan untuk absensi dan monitoring
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2 text-left">
                  <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                    <div className="text-[11px] text-green-700 font-semibold">Pegawai Baru Ditambahkan</div>
                    <div className="text-xl font-bold text-green-800">{importResult.insertedCount}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <div className="text-[11px] text-blue-700 font-semibold">Data Pegawai Diperbarui</div>
                    <div className="text-xl font-bold text-blue-800">{importResult.updatedCount}</div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setImportModal(false);
                      window.location.reload();
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    Selesai & Muat Ulang Halaman
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}