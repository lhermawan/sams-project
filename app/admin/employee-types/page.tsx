"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Clock,
  Calendar,
  Settings,
  Plus,
  Save,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  Camera,
  MapPin,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  Users,
} from "lucide-react";

export default function EmployeeTypesAdminPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal new type
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newScheduleType, setNewScheduleType] = useState("NON_SHIFT");

  // Modal new shift
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftCode, setShiftCode] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("07:00");
  const [shiftEndTime, setShiftEndTime] = useState("19:00");
  const [shiftCrossDay, setShiftCrossDay] = useState(false);
  const [shift24Hours, setShift24Hours] = useState(false);
  const [shiftDuration, setShiftDuration] = useState(720);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/employee-types");
      const data = await res.json();
      if (data.success && data.data) {
        setTypes(data.data);
        if (!selectedId && data.data.length > 0) {
          setSelectedId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error("fetchTypes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const selectedType = types.find((t) => t.id === selectedId);

  // Helper to get rule config
  const getRuleConfig = (ruleType: string) => {
    if (!selectedType?.rules) return {};
    const r = selectedType.rules.find((item: any) => item.ruleType === ruleType);
    if (!r) return {};
    try {
      return typeof r.configuration === "string" ? JSON.parse(r.configuration) : r.configuration;
    } catch {
      return {};
    }
  };

  const isRuleActive = (ruleType: string) => {
    const r = selectedType?.rules?.find((item: any) => item.ruleType === ruleType);
    return r ? r.isActive : false;
  };

  // Save specific rule
  const handleSaveRule = async (ruleType: string, config: any, isActive: boolean, stage: string, priority: number) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/admin/employee-types/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_RULE",
          payload: {
            ruleType,
            configuration: config,
            isActive,
            executionStage: stage,
            priority,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan aturan");
      setMessage({ type: "success", text: `Aturan ${ruleType} berhasil diperbarui!` });
      await fetchTypes();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Create new employee type
  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/admin/employee-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          description: newDesc,
          scheduleType: newScheduleType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat jenis pegawai");
      setShowNewModal(false);
      setNewCode("");
      setNewName("");
      setNewDesc("");
      setMessage({ type: "success", text: "Jenis pegawai baru berhasil dibuat!" });
      await fetchTypes();
      if (data.data?.id) setSelectedId(data.data.id);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save new shift
  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/admin/employee-types/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPSERT_SHIFT",
          payload: {
            shiftId: editingShiftId,
            code: shiftCode.toUpperCase().trim(),
            name: shiftName.trim(),
            startTime: shiftStartTime,
            endTime: shiftEndTime,
            isCrossDay: shiftCrossDay,
            is24Hours: shift24Hours,
            durationMinutes: Number(shiftDuration),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan shift");
      setShowShiftModal(false);
      setShiftCode("");
      setShiftName("");
      setMessage({ type: "success", text: "Shift kerja baru berhasil ditambahkan!" });
      await fetchTypes();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Save Non-Shift Work Schedules
  const handleSaveSchedules = async (schedules: any[]) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/admin/employee-types/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SCHEDULES",
          payload: { schedules },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan jadwal");
      setMessage({ type: "success", text: "Jadwal kerja harian berhasil diperbarui!" });
      await fetchTypes();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        Memuat data jenis pegawai & aturan sistem...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="text-blue-600" size={28} />
            Jenis Pegawai & Dynamic Rule Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi sistem kerja, serah terima tugas, patroli berkala, toleransi keterlambatan, dan geofencing tanpa hardcode.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all"
        >
          <Plus size={18} /> Tambah Jenis Pegawai
        </button>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Employee Type Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {types.map((type) => {
          const isSelected = type.id === selectedId;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedId(type.id)}
              className={`px-5 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <Briefcase size={16} />
              <span>{type.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  isSelected ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-600"
                }`}
              >
                {type.scheduleType}
              </span>
            </button>
          );
        })}
      </div>

      {selectedType && (
        <div className="space-y-6">
          {/* Section: Overview Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Kode Jenis</span>
              <p className="text-lg font-bold text-gray-900 mt-1">{selectedType.code}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nama Klasifikasi</span>
              <p className="text-lg font-bold text-gray-900 mt-1">{selectedType.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistem Penjadwalan</span>
              <p className="text-lg font-bold text-blue-600 mt-1">
                {selectedType.scheduleType === "SHIFT" ? "Sistem Shift Kerja" : "Sistem Non-Shift (Harian)"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pegawai Terikat</span>
              <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                {selectedType._count?.employees || 0} Pegawai
              </p>
            </div>
          </div>

          {/* Section: Schedule or Shifts */}
          {selectedType.scheduleType === "SHIFT" ? (
            /* SHIFT MANAGEMENT CARD */
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="text-blue-600" size={20} />
                    Daftar Shift Kerja ({selectedType.name})
                  </h3>
                  <p className="text-sm text-gray-500">Mendukung shift normal, shift malam lintas hari, dan shift 24 jam.</p>
                </div>
                <button
                  onClick={() => {
                      setEditingShiftId(null);
                      setShiftCode("");
                      setShiftName("");
                      setShiftStartTime("07:00");
                      setShiftEndTime("19:00");
                      setShiftCrossDay(false);
                      setShift24Hours(false);
                      setShiftDuration(720);
                      setShowShiftModal(true);
                    }}
                  className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
                >
                  <Plus size={16} /> Tambah Shift
                </button>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedType.shifts?.map((shift: any) => (
                    <div key={shift.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2 relative group">
                      <button 
                        onClick={() => {
                          setEditingShiftId(shift.id);
                          setShiftCode(shift.code);
                          setShiftName(shift.name);
                          setShiftStartTime(shift.startTime);
                          setShiftEndTime(shift.endTime);
                          setShiftCrossDay(shift.isCrossDay);
                          setShift24Hours(shift.is24Hours);
                          setShiftDuration(shift.durationMinutes || 720);
                          setShowShiftModal(true);
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                        title="Edit Shift"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <div className="flex items-center justify-between pr-8">
                        <span className="font-bold text-gray-900">{shift.name}</span>
                      <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {shift.code}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-gray-800 tracking-tight">
                      {shift.startTime} - {shift.endTime}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {shift.isCrossDay && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          Lintas Hari
                        </span>
                      )}
                      {shift.is24Hours && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          24 Jam Penuh
                        </span>
                      )}
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                        {shift.durationMinutes / 60} Jam ({shift.durationMinutes} mnt)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* NON-SHIFT SCHEDULES CARD */
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  Jadwal Kerja Harian (Senin - Minggu)
                </h3>
                <p className="text-sm text-gray-500">
                  Tentukan jam masuk, jam pulang, dan hari libur mingguan (contoh: Jumat pulang 16:30, Sabtu-Minggu libur).
                </p>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {selectedType.workSchedules?.map((ws: any, idx: number) => {
                  const dayNames = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
                  return (
                    <div key={ws.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-gray-50">
                      <div className="w-32">
                        <span className="font-bold text-gray-900">{dayNames[ws.dayOfWeek] || ws.name}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-1">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ws.isWorkDay}
                            onChange={(e) => {
                              const updated = [...selectedType.workSchedules];
                              updated[idx].isWorkDay = e.target.checked;
                              setTypes([...types]);
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span>Hari Kerja</span>
                        </label>
                        {ws.isWorkDay && (
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={ws.startTime || "07:30"}
                              onChange={(e) => {
                                const updated = [...selectedType.workSchedules];
                                updated[idx].startTime = e.target.value;
                                setTypes([...types]);
                              }}
                              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium"
                            />
                            <span className="text-gray-400">s/d</span>
                            <input
                              type="time"
                              value={ws.endTime || "16:00"}
                              onChange={(e) => {
                                const updated = [...selectedType.workSchedules];
                                updated[idx].endTime = e.target.value;
                                setTypes([...types]);
                              }}
                              className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm font-medium"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => handleSaveSchedules(selectedType.workSchedules)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all"
              >
                <Save size={18} /> Simpan Perubahan Jadwal Harian
              </button>
            </div>
          )}

          {/* Section: Dynamic Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule 1: Handover Rule */}
            <HandoverRuleCard
              typeId={selectedType.id}
              initialConfig={getRuleConfig("HANDOVER")}
              isActive={isRuleActive("HANDOVER")}
              onSave={(config: any, active: boolean) => handleSaveRule("HANDOVER", config, active, "PRE_CHECK_IN", 1)}
              saving={saving}
            />

            {/* Rule 2: Periodic Patrol Reports */}
            <PeriodicReportRuleCard
              typeId={selectedType.id}
              initialConfig={getRuleConfig("PERIODIC_REPORT")}
              isActive={isRuleActive("PERIODIC_REPORT")}
              onSave={(config: any, active: boolean) => handleSaveRule("PERIODIC_REPORT", config, active, "IN_SHIFT", 2)}
              saving={saving}
            />

            {/* Rule 3: Late Tolerance Rule */}
            <LateToleranceRuleCard
              typeId={selectedType.id}
              initialConfig={getRuleConfig("LATE_TOLERANCE")}
              isActive={isRuleActive("LATE_TOLERANCE")}
              onSave={(config: any, active: boolean) => handleSaveRule("LATE_TOLERANCE", config, active, "CHECK_IN", 3)}
              saving={saving}
            />

            {/* Rule 4: Geofence Location Rule */}
            <LocationRuleCard
              typeId={selectedType.id}
              initialConfig={getRuleConfig("LOCATION")}
              isActive={isRuleActive("LOCATION")}
              onSave={(config: any, active: boolean) => handleSaveRule("LOCATION", config, active, "CHECK_IN", 4)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Modal: New Employee Type */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Buat Jenis Pegawai Baru</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Kode Unik (Singkat)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TEKNISI, OPERATOR"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nama Jenis Pegawai</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Teknisi Lapangan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tugas dan aturan kelompok pegawai..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Sistem Penjadwalan</label>
                <select
                  value={newScheduleType}
                  onChange={(e) => setNewScheduleType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="NON_SHIFT">Non-Shift (Jadwal Harian Senin-Minggu)</option>
                  <option value="SHIFT">Shift (Menggunakan Master Shift)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Simpan Jenis Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Shift */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">{editingShiftId ? "Edit Shift Kerja" : "Tambah Shift Kerja"}</h3>
            <form onSubmit={handleSaveShift} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Kode Shift</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SHIFT_1, SHIFT_MALAM"
                  value={shiftCode}
                  onChange={(e) => setShiftCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nama Shift</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Shift 1 (Pagi 12 Jam)"
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shiftCrossDay}
                    onChange={(e) => setShiftCrossDay(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Shift Lintas Hari (Pulang di hari berikutnya)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shift24Hours}
                    onChange={(e) => {
                      setShift24Hours(e.target.checked);
                      if (e.target.checked) setShiftDuration(1440);
                    }}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Shift 24 Jam Penuh (Durasi 24 jam)</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Durasi Total (Menit)</label>
                <input
                  type="number"
                  required
                  value={shiftDuration}
                  onChange={(e) => setShiftDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  Simpan Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Handover Rule Card
function HandoverRuleCard({ typeId, initialConfig, isActive, onSave, saving }: any) {
  const [active, setActive] = useState(isActive ?? false);
  const [requireHandover, setRequireHandover] = useState(initialConfig.requireHandover ?? true);
  const [requirePhoto, setRequirePhoto] = useState(initialConfig.requirePhoto ?? true);
  const [minPhotos, setMinPhotos] = useState(initialConfig.minPhotos ?? 1);

  useEffect(() => {
    setActive(isActive ?? false);
    setRequireHandover(initialConfig.requireHandover ?? true);
    setRequirePhoto(initialConfig.requirePhoto ?? true);
    setMinPhotos(initialConfig.minPhotos ?? 1);
  }, [initialConfig, isActive]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <FileCheck className="text-blue-600" size={20} />
          <h4 className="font-bold text-gray-900">Aturan Serah Terima Tugas (Handover)</h4>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
            active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {active ? "Aktif" : "Nonaktif"}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requireHandover}
            onChange={(e) => setRequireHandover(e.target.checked)}
            disabled={!active}
            className="rounded text-blue-600"
          />
          <span>Wajibkan Serah Terima Sebelum Tombol Absen Masuk Aktif</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requirePhoto}
            onChange={(e) => setRequirePhoto(e.target.checked)}
            disabled={!active}
            className="rounded text-blue-600"
          />
          <span>Wajib Upload Foto Bukti Serah Terima</span>
        </label>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Minimal Foto Bukti</label>
          <input
            type="number"
            min={1}
            max={10}
            value={minPhotos}
            onChange={(e) => setMinPhotos(Number(e.target.value))}
            disabled={!active}
            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({ requireHandover, requirePhoto, minPhotos }, active)}
        disabled={saving}
        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
      >
        Simpan Aturan Serah Terima
      </button>
    </div>
  );
}

// Subcomponent: Periodic Report Rule Card
function PeriodicReportRuleCard({ typeId, initialConfig, isActive, onSave, saving }: any) {
  const [active, setActive] = useState(isActive ?? false);
  const [intervalHours, setIntervalHours] = useState(initialConfig.intervalHours ?? 4);
  const [toleranceBeforeMin, setToleranceBeforeMin] = useState(initialConfig.toleranceBeforeMin ?? 30);
  const [toleranceAfterMin, setToleranceAfterMin] = useState(initialConfig.toleranceAfterMin ?? 30);
  const [minPhotos, setMinPhotos] = useState(initialConfig.minPhotos ?? 3);
  const [checkoutAction, setCheckoutAction] = useState(initialConfig.checkoutAction ?? "ALLOW_WITH_INCOMPLETE_STATUS");

  useEffect(() => {
    setActive(isActive ?? false);
    setIntervalHours(initialConfig.intervalHours ?? 4);
    setToleranceBeforeMin(initialConfig.toleranceBeforeMin ?? 30);
    setToleranceAfterMin(initialConfig.toleranceAfterMin ?? 30);
    setMinPhotos(initialConfig.minPhotos ?? 3);
    setCheckoutAction(initialConfig.checkoutAction ?? "ALLOW_WITH_INCOMPLETE_STATUS");
  }, [initialConfig, isActive]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="text-purple-600" size={20} />
          <h4 className="font-bold text-gray-900">Aturan Patroli Berkala (Periodic Report)</h4>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
            active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {active ? "Aktif" : "Nonaktif"}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Interval Patroli</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={12}
                value={intervalHours}
                onChange={(e) => setIntervalHours(Number(e.target.value))}
                disabled={!active}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-xs text-gray-500">Jam</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Minimal Foto Bukti</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={minPhotos}
                onChange={(e) => setMinPhotos(Number(e.target.value))}
                disabled={!active}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-xs text-gray-500">Foto</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Toleransi Sebelum</label>
            <input
              type="number"
              value={toleranceBeforeMin}
              onChange={(e) => setToleranceBeforeMin(Number(e.target.value))}
              disabled={!active}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Toleransi Sesudah</label>
            <input
              type="number"
              value={toleranceAfterMin}
              onChange={(e) => setToleranceAfterMin(Number(e.target.value))}
              disabled={!active}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Tindakan Saat Check-Out</label>
          <select
            value={checkoutAction}
            onChange={(e) => setCheckoutAction(e.target.value)}
            disabled={!active}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="ALLOW_WITH_INCOMPLETE_STATUS">
              Izinkan Check-Out tapi Tandai Status INCOMPLETE (Rekomendasi)
            </option>
            <option value="BLOCK">Blokir Check-Out Sampai Semua Patroli Selesai</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onSave(
            {
              intervalHours,
              toleranceBeforeMin,
              toleranceAfterMin,
              minPhotos,
              checkoutAction,
            },
            active
          )
        }
        disabled={saving}
        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
      >
        Simpan Aturan Patroli Berkala
      </button>
    </div>
  );
}

// Subcomponent: Late Tolerance Rule Card (Configurable without hardcode!)
function LateToleranceRuleCard({ typeId, initialConfig, isActive, onSave, saving }: any) {
  const [active, setActive] = useState(isActive ?? true);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(initialConfig.gracePeriodMinutes ?? 15);
  const [maxLateMinutes, setMaxLateMinutes] = useState(initialConfig.maxLateMinutes ?? 120);
  const [actionOnExceedMax, setActionOnExceedMax] = useState(initialConfig.actionOnExceedMax ?? "BLOCK_CHECKIN");

  useEffect(() => {
    setActive(isActive ?? true);
    setGracePeriodMinutes(initialConfig.gracePeriodMinutes ?? 15);
    setMaxLateMinutes(initialConfig.maxLateMinutes ?? 120);
    setActionOnExceedMax(initialConfig.actionOnExceedMax ?? "BLOCK_CHECKIN");
  }, [initialConfig, isActive]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-amber-600" size={20} />
          <h4 className="font-bold text-gray-900">Batas Keterlambatan Dinamis (Late Rule)</h4>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
            active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {active ? "Aktif" : "Nonaktif"}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Dispensasi Tepat Waktu
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={60}
                value={gracePeriodMinutes}
                onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                disabled={!active}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-xs text-gray-500">Menit</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Masuk dalam batas ini tetap dianggap On-Time (VALID).</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Batas Maksimal Keterlambatan
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={15}
                max={360}
                value={maxLateMinutes}
                onChange={(e) => setMaxLateMinutes(Number(e.target.value))}
                disabled={!active}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-xs text-gray-500">Menit</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Batas keterlambatan maksimal yang ditoleransi.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Tindakan Jika Melewati Batas Maksimal
          </label>
          <select
            value={actionOnExceedMax}
            onChange={(e) => setActionOnExceedMax(e.target.value)}
            disabled={!active}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="BLOCK_CHECKIN">Blokir Absen Masuk (Wajib Lapor HRD / Danru)</option>
            <option value="ALLOW_FLAG_EXCESSIVE_LATE">
              Tetap Izinkan Masuk dengan Peringatan & Catatan Pelanggaran
            </option>
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onSave(
            {
              gracePeriodMinutes,
              maxLateMinutes,
              actionOnExceedMax,
            },
            active
          )
        }
        disabled={saving}
        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
      >
        Simpan Batas Keterlambatan
      </button>
    </div>
  );
}

// Subcomponent: Location Rule Card
function LocationRuleCard({ typeId, initialConfig, isActive, onSave, saving }: any) {
  const [active, setActive] = useState(isActive ?? true);
  const [enforceGeofence, setEnforceGeofence] = useState(initialConfig.enforceGeofence ?? true);
  const [radiusMeters, setRadiusMeters] = useState(initialConfig.radiusMeters ?? 100);

  useEffect(() => {
    setActive(isActive ?? true);
    setEnforceGeofence(initialConfig.enforceGeofence ?? true);
    setRadiusMeters(initialConfig.radiusMeters ?? 100);
  }, [initialConfig, isActive]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <MapPin className="text-emerald-600" size={20} />
          <h4 className="font-bold text-gray-900">Validasi Geofencing & Lokasi Kantor</h4>
        </div>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`text-sm font-medium px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
            active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {active ? "Aktif" : "Nonaktif"}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enforceGeofence}
            onChange={(e) => setEnforceGeofence(e.target.checked)}
            disabled={!active}
            className="rounded text-blue-600"
          />
          <span>Wajib Berada di Dalam Radius Koordinat Kantor</span>
        </label>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Radius Toleransi Lokasi
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={5000}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              disabled={!active}
              className="w-36 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-xs text-gray-500">Meter dari titik kantor</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({ enforceGeofence, radiusMeters }, active)}
        disabled={saving}
        className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
      >
        Simpan Aturan Lokasi
      </button>
    </div>
  );
}
