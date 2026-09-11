"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  KeyRound,
  Trash2,
  Check,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Loader2,
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Building2,
  Briefcase,
  AlertTriangle,
} from "lucide-react";

export interface TenantOption {
  id: string;
  name: string;
  subdomain: string;
}

export interface UserItem {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE" | string;
  isActive: boolean;
  tenantId: string;
  createdAt: string | Date;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
  } | null;
  employee?: {
    id: string;
    nip: string;
    name: string;
    department: string;
    position: string;
    phone?: string | null;
    photoUrl?: string | null;
  } | null;
}

interface UserTableProps {
  initialUsers: UserItem[];
  tenants: TenantOption[];
  currentUserId?: string;
}

export default function UserTable({ initialUsers, tenants, currentUserId }: UserTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("ALL");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Loading states
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ email: "", role: "EMPLOYEE", isActive: true });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset Password Modal State (Identik dengan Admin EmployeeTable)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetCopied, setResetCopied] = useState(false);
  const [resetResult, setResetResult] = useState<{
    email: string;
    password: string;
    name?: string;
    subdomain?: string;
  } | null>(null);
  const [resetError, setResetError] = useState("");

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const emailMatch = u.email.toLowerCase().includes(q);
      const nameMatch = u.employee?.name?.toLowerCase().includes(q);
      const nipMatch = u.employee?.nip?.toLowerCase().includes(q);
      const deptMatch = u.employee?.department?.toLowerCase().includes(q);
      const posMatch = u.employee?.position?.toLowerCase().includes(q);
      const tenantMatch = u.tenant?.name?.toLowerCase().includes(q);
      const subMatch = u.tenant?.subdomain?.toLowerCase().includes(q);
      if (!emailMatch && !nameMatch && !nipMatch && !deptMatch && !posMatch && !tenantMatch && !subMatch) {
        return false;
      }
    }

    // 2. Tenant Filter
    if (selectedTenant !== "ALL" && u.tenantId !== selectedTenant) {
      return false;
    }

    // 3. Role Filter
    if (selectedRole !== "ALL" && u.role !== selectedRole) {
      return false;
    }

    // 4. Status Filter
    if (selectedStatus !== "ALL") {
      if (selectedStatus === "ACTIVE" && !u.isActive) return false;
      if (selectedStatus === "INACTIVE" && u.isActive) return false;
    }

    return true;
  });

  // Toggle User Status (Aktif / Nonaktif)
  const handleToggleStatus = async (user: UserItem) => {
    if (user.id === currentUserId) {
      alert("Anda tidak dapat menonaktifkan akun Anda sendiri.");
      return;
    }

    setLoadingId(user.id);
    try {
      const res = await fetch(`/api/super-admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status user");

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive: !item.isActive,
                employee: item.employee
                  ? { ...item.employee, isActive: !item.isActive }
                  : item.employee,
              }
            : item
        )
      );
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat mengubah status user");
    } finally {
      setLoadingId(null);
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/super-admin/users/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus user");

      setUsers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || "Gagal menghapus user");
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate Random Password
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

  // Open Reset Password Modal
  const handleOpenResetModal = (user: UserItem) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetResult(null);
    setResetError("");
    setResetCopied(false);
    generateRandomPassword();
  };

  // Submit Reset Password
  const handleExecuteReset = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    setIsResetting(true);
    setResetError("");

    try {
      const res = await fetch(`/api/super-admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset password");

      setResetResult({
        email: data.email,
        password: data.password || newPassword.trim(),
        name: data.name || selectedUser.employee?.name || selectedUser.email,
        subdomain: selectedUser.tenant?.subdomain,
      });
    } catch (err: any) {
      setResetError(err.message || "Terjadi kesalahan saat mereset password");
    } finally {
      setIsResetting(false);
    }
  };

  // Copy Credentials to Clipboard
  const copyCredentials = () => {
    if (!resetResult) return;
    const loginDomain = resetResult.subdomain
      ? `http://${resetResult.subdomain}.localhost:3000/login (atau ${resetResult.subdomain}.niskala.id/login)`
      : `http://localhost:3000/login`;

    const text = `Akun SAMS Anda:\nNama: ${resetResult.name || "-"}\nEmail: ${resetResult.email}\nPassword: ${resetResult.password}\nLink Login: ${loginDomain}`;
    navigator.clipboard.writeText(text);
    setResetCopied(true);
    setTimeout(() => setResetCopied(false), 2000);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedTenant !== "ALL" ||
    selectedRole !== "ALL" ||
    selectedStatus !== "ALL";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedTenant("ALL");
    setSelectedRole("ALL");
    setSelectedStatus("ALL");
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        {/* Toolbar Pencarian & Filter Pintar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/70 space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nama pegawai, NIP, email login, tenant, jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-gray-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter Tenant */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  aria-label="Filter Tenant Perusahaan"
                  className="bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Semua Perusahaan</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.subdomain})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Role */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  aria-label="Filter Role Pengguna"
                  className="bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="ADMIN">Admin Tenant</option>
                  <option value="EMPLOYEE">Pegawai (Employee)</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  aria-label="Filter Status Akun"
                  className="bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 bg-gray-200/80 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  title="Reset Semua Filter"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Counter info */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <div className="flex items-center gap-2">
              <span>Menampilkan:</span>
              <span className="font-semibold text-gray-800">
                {filteredUsers.length}
              </span>
              <span>dari total</span>
              <span className="font-semibold text-gray-800">{users.length} pengguna</span>
            </div>
            {hasActiveFilters && (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium text-[11px]">
                Filter aktif
              </span>
            )}
          </div>
        </div>

        {/* Tabel Data Users */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/90 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User / Identitas</th>
                <th className="px-6 py-3.5">Email Login</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Perusahaan / Tenant</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isSuperAdmin = u.role === "SUPER_ADMIN";
                const isEmployee = u.role === "EMPLOYEE";
                const displayName = u.employee?.name || (isSuperAdmin ? "Super Admin" : "Admin Perusahaan");

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* 1. Identitas User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSuperAdmin
                              ? "bg-purple-100 text-purple-700"
                              : isEmployee
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {u.employee?.photoUrl ? (
                            <img
                              src={u.employee.photoUrl}
                              alt={displayName}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 leading-tight">
                            {displayName}
                          </div>
                          {u.employee?.nip ? (
                            <div className="text-xs font-mono text-gray-500 mt-0.5">
                              ID: {u.employee.nip}
                              {u.employee.department && (
                                <span className="text-gray-400"> · {u.employee.department}</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {isSuperAdmin ? "Akses Penuh Sistem" : "Pengelola Tenant"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Email Login */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-md select-all">
                        {u.email}
                      </span>
                    </td>

                    {/* 3. Role */}
                    <td className="px-6 py-4">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldAlert size={12} />
                          SUPER ADMIN
                        </span>
                      ) : isEmployee ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Users size={12} />
                          PEGAWAI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Briefcase size={12} />
                          ADMIN
                        </span>
                      )}
                    </td>

                    {/* 4. Tenant */}
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <div className="font-medium text-gray-800">
                          {u.tenant?.name || "-"}
                        </div>
                        {u.tenant?.subdomain && (
                          <span className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {u.tenant.subdomain}.niskala.id
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Status Toggle */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        disabled={loadingId === u.id || u.id === currentUserId}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          u.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                        } ${loadingId === u.id || u.id === currentUserId ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={
                          u.id === currentUserId
                            ? "Akun Anda saat ini"
                            : u.isActive
                            ? "Klik untuk menonaktifkan akun"
                            : "Klik untuk mengaktifkan akun"
                        }
                      >
                        {loadingId === u.id ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : u.isActive ? (
                          <UserCheck size={12} />
                        ) : (
                          <UserX size={12} />
                        )}
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>

                    {/* 6. Aksi (Reset Password & Delete) */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Reset Password */}
                        <button
                          type="button"
                          onClick={() => handleOpenResetModal(u)}
                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Reset & Generate Password"
                        >
                          <KeyRound size={16} />
                        </button>

                        {/* Tombol Hapus User */}
                        {u.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(u);
                              setDeleteError("");
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    Tidak ada pengguna yang sesuai dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL KELOLA & RESET PASSWORD (SERAGAM DENGAN ADMIN) ────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">Kelola Akun & Password</h3>
                  <p className="text-xs text-gray-500">Reset & generate password baru untuk pengguna</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Akun Terpilih */}
            <div className="bg-gray-50 rounded-xl p-3.5 text-xs space-y-2 border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Nama Pengguna:</span>
                <span className="font-semibold text-gray-800">
                  {selectedUser.employee?.name || (selectedUser.role === "SUPER_ADMIN" ? "Super Admin" : "Admin Perusahaan")}
                </span>
              </div>
              {selectedUser.employee?.nip && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">ID Pegawai (NIP):</span>
                  <span className="font-mono font-medium text-gray-800">{selectedUser.employee.nip}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Perusahaan / Tenant:</span>
                <span className="font-medium text-gray-800">
                  {selectedUser.tenant?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Role Akun:</span>
                <span className="font-semibold text-gray-700">
                  {selectedUser.role}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-200/60">
                <span className="text-gray-500">Email Login:</span>
                <span className="font-mono font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedUser.email}
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
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNewPassword("Pegawai@123")}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors font-mono cursor-pointer"
                >
                  Pegawai@123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword("Admin@123")}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors font-mono cursor-pointer"
                >
                  Admin@123
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword("Sams@2026")}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors font-mono cursor-pointer"
                >
                  Sams@2026
                </button>
              </div>
            </div>

            {/* Box Hasil Sukses */}
            {resetResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-green-800 font-semibold text-xs">
                  <Check size={14} className="text-green-600" />
                  Password Berhasil Diperbarui!
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-green-200 text-xs font-mono space-y-1">
                  <div>
                    <span className="text-gray-400">Email:</span>{" "}
                    <span className="text-gray-800 font-bold">{resetResult.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Password:</span>{" "}
                    <span className="text-blue-600 font-bold">{resetResult.password}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {resetCopied ? <Check size={14} /> : <Copy size={14} />}
                  {resetCopied ? "Tersalin ke Clipboard!" : "Salin Kredensial untuk Pengguna"}
                </button>
              </div>
            )}

            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
                {resetError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting || !newPassword.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isResetting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {isResetting ? "Menyimpan..." : "Terapkan Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KONFIRMASI HAPUS USER ────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Hapus Pengguna</h3>
                <p className="text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-gray-900 font-semibold">{deleteTarget.email}</strong>
              {deleteTarget.employee?.name && (
                <> (Pegawai: <span className="font-medium">{deleteTarget.employee.name}</span>)</>
              )}
              ? Seluruh data sesi dan akses terkait akun ini akan dihapus.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? "Menghapus..." : "Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
