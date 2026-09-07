"use client";

import { useState, useEffect } from "react";
import {
  Clock, Plus, Edit2, Users, X, Loader2, CheckCircle, Moon, Sun, Sunset, UserPlus, Trash2, Zap
} from "lucide-react";

interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  isCrossDay: boolean;
  toleranceMin: number;
  isActive: boolean;
  _count: { employeeShifts: number };
}

interface Employee {
  id: string;
  name: string;
  nip: string;
  department: string;
}

interface Assignment {
  id: string;
  effectiveFrom: string;
  employee: { id: string; name: string; department: string; nip: string };
}

const shiftIcons: Record<string, React.ReactNode> = {
  PAGI: <Sun size={20} className="text-yellow-500" />,
  NORMAL: <Clock size={20} className="text-blue-500" />,
  MALAM: <Moon size={20} className="text-indigo-500" />,
};

const shiftColors: Record<string, string> = {
  PAGI: "border-yellow-200 bg-yellow-50",
  NORMAL: "border-blue-200 bg-blue-50",
  MALAM: "border-indigo-200 bg-indigo-50",
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({
    name: "",
    code: "",
    startTime: "08:00",
    endTime: "17:00",
    isCrossDay: false,
    toleranceMin: 15,
  });

  const fetchShifts = async () => {
    setLoading(true);
    const res = await fetch("/api/shifts");
    setShifts(await res.json());
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const res = await fetch("/api/employees?limit=200");
    const data = await res.json();
    setEmployees(data.employees ?? []);
  };

  const fetchAssignments = async (shiftId: string) => {
    const res = await fetch(`/api/shifts/${shiftId}`);
    setAssignments(await res.json());
  };

  useEffect(() => { fetchShifts(); fetchEmployees(); }, []);

  const openShiftDetail = (shift: Shift) => {
    setActiveShift(shift);
    fetchAssignments(shift.id);
  };

  const saveShift = async () => {
    setSaving(true);
    try {
      if (editingShift) {
        await fetch(`/api/shifts/${editingShift.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, isActive: true }),
        });
      } else {
        await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingShift(null);
      fetchShifts();
    } finally {
      setSaving(false);
    }
  };

  const assignEmployee = async () => {
    if (!selectedEmployee || !activeShift) return;
    setSaving(true);
    try {
      await fetch("/api/shifts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          shiftId: activeShift.id,
          effectiveFrom: assignDate,
        }),
      });
      setSelectedEmployee("");
      fetchAssignments(activeShift.id);
      fetchShifts();
    } finally {
      setSaving(false);
    }
  };

  const unassignEmployee = async (assignmentId: string) => {
    if (!confirm("Lepas pegawai dari shift ini?")) return;
    await fetch("/api/shifts/assign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    fetchAssignments(activeShift!.id);
    fetchShifts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Manajemen Shift</h2>
          <p className="text-sm text-gray-500">{shifts.length} shift terdaftar</p>
        </div>
        <button
          onClick={() => { setEditingShift(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
        >
          <Plus size={14} /> Buat Shift Baru
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              {editingShift ? "Edit Shift" : "Shift Baru"}
            </h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Nama Shift", field: "name", placeholder: "Shift Pagi" },
              { label: "Kode Shift", field: "code", placeholder: "PAGI" },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  value={(form as any)[field]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jam Masuk</label>
              <input type="time" value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Jam Pulang</label>
              <input type="time" value={form.endTime}
                onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Toleransi Telat (menit)</label>
              <input type="number" value={form.toleranceMin}
                onChange={(e) => setForm((p) => ({ ...p, toleranceMin: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isCrossDay}
                  onChange={(e) => setForm((p) => ({ ...p, isCrossDay: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-gray-700">Shift Lintas Hari (misal: 22:00–06:00)</span>
              </label>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveShift} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Simpan Shift
            </button>
          </div>
        </div>
      )}

      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift) => {
          const colorClass = shiftColors[shift.code] ?? "border-gray-200 bg-gray-50";
          const icon = shiftIcons[shift.code] ?? <Clock size={20} className="text-gray-500" />;
          return (
            <div
              key={shift.id}
              className={`rounded-2xl border-2 ${colorClass} p-5 cursor-pointer hover:shadow-md transition-all`}
              onClick={() => openShiftDetail(shift)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="font-semibold text-gray-800">{shift.name}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${shift.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {shift.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {shift.startTime} - {shift.endTime}
              </div>
              {shift.isCrossDay && (
                <div className="text-xs text-indigo-600 mb-1 flex items-center gap-1">
                  <Zap size={12} /> Lintas hari
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Users size={14} />
                  <span>{shift._count.employeeShifts} pegawai</span>
                </div>
                <div className="text-xs text-gray-400">
                  Toleransi {shift.toleranceMin} mnt
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift Detail Side Panel */}
      {activeShift && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {activeShift.name} — Daftar Pegawai
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingShift(activeShift);
                  setForm({
                    name: activeShift.name,
                    code: activeShift.code,
                    startTime: activeShift.startTime,
                    endTime: activeShift.endTime,
                    isCrossDay: activeShift.isCrossDay,
                    toleranceMin: activeShift.toleranceMin,
                  });
                  setShowForm(true);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
              >
                <Edit2 size={15} />
              </button>
              <button onClick={() => setActiveShift(null)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Assign Employee */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Tambah Pegawai</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih pegawai...</option>
                  {employees
                    .filter((emp) => !assignments.some((a) => a.employee.id === emp.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.department}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Berlaku Mulai</label>
                <input type="date" value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={assignEmployee}
                disabled={!selectedEmployee || saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Assign
              </button>
            </div>
          </div>

          {/* Assigned employees */}
          <div className="divide-y divide-gray-50">
            {assignments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                Belum ada pegawai di shift ini
              </div>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                      {a.employee.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{a.employee.name}</div>
                      <div className="text-xs text-gray-400">{a.employee.department} · {a.employee.nip}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => unassignEmployee(a.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
