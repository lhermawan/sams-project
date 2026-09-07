"use client";

import { useState, useEffect } from "react";
import {
  Clock, Plus, Trash2, CheckCircle, Loader2, Calendar, Edit2, X
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Schedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  toleranceMin: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
}

interface ScheduleForm {
  name: string;
  startTime: string;
  endTime: string;
  toleranceMin: number;
  effectiveFrom: string;
  setActive: boolean;
}

interface HolidayForm {
  name: string;
  date: string;
  description: string;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    name: "Jadwal Normal",
    startTime: "08:00",
    endTime: "17:00",
    toleranceMin: 15,
    effectiveFrom: new Date().toISOString().split("T")[0],
    setActive: true,
  });

  const [holidayForm, setHolidayForm] = useState<HolidayForm>({
    name: "",
    date: "",
    description: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    const [sRes, hRes] = await Promise.all([
      fetch("/api/schedule"),
      fetch("/api/schedule/holidays"),
    ]);
    setSchedules(await sRes.json());
    setHolidays(await hRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSchedule = async () => {
    setSaving(true);
    try {
      if (editingSchedule) {
        await fetch(`/api/schedule/${editingSchedule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleForm),
        });
      } else {
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduleForm),
        });
      }
      setShowScheduleForm(false);
      setEditingSchedule(null);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Hapus jadwal ini?")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const saveHoliday = async () => {
    setSaving(true);
    try {
      await fetch("/api/schedule/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidayForm),
      });
      setShowHolidayForm(false);
      setHolidayForm({ name: "", date: "", description: "" });
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    if (!confirm("Hapus hari libur ini?")) return;
    await fetch("/api/schedule/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Jadwal Kerja</h2>
        <p className="text-sm text-gray-500">Kelola jam kerja dan hari libur</p>
      </div>

      {/* ── Work Schedules ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">Jadwal Kerja</h3>
          </div>
          <button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={14} /> Tambah Jadwal
          </button>
        </div>

        {/* Schedule Form */}
        {showScheduleForm && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">
                {editingSchedule ? "Edit Jadwal" : "Jadwal Baru"}
              </h4>
              <button onClick={() => setShowScheduleForm(false)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nama Jadwal</label>
                <input
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Berlaku Mulai</label>
                <input
                  type="date"
                  value={scheduleForm.effectiveFrom}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jam Masuk</label>
                <input
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jam Pulang</label>
                <input
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Toleransi Telat (menit)</label>
                <input
                  type="number"
                  value={scheduleForm.toleranceMin}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, toleranceMin: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleForm.setActive}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, setActive: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Jadikan aktif sekarang</span>
                </label>
              </div>
            </div>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Simpan
            </button>
          </div>
        )}

        {/* Schedule List */}
        <div className="divide-y divide-gray-50">
          {schedules.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Belum ada jadwal kerja
            </div>
          ) : (
            schedules.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-10 rounded-full ${s.isActive ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{s.name}</span>
                      {s.isActive && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {s.startTime} – {s.endTime} · Toleransi {s.toleranceMin} menit
                    </div>
                    <div className="text-xs text-gray-400">
                      Berlaku:{" "}
                      {format(new Date(s.effectiveFrom), "dd MMM yyyy", { locale: id })}
                      {s.effectiveTo &&
                        ` – ${format(new Date(s.effectiveTo), "dd MMM yyyy", { locale: id })}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingSchedule(s);
                      setScheduleForm({
                        name: s.name,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        toleranceMin: s.toleranceMin,
                        effectiveFrom: s.effectiveFrom.split("T")[0],
                        setActive: s.isActive,
                      });
                      setShowScheduleForm(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600"
                  >
                    <Edit2 size={15} />
                  </button>
                  {!s.isActive && (
                    <button
                      onClick={() => deleteSchedule(s.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Holidays ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">Hari Libur</h3>
          </div>
          <button
            onClick={() => setShowHolidayForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium"
          >
            <Plus size={14} /> Tambah Hari Libur
          </button>
        </div>

        {/* Holiday Form */}
        {showHolidayForm && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Hari Libur Baru</h4>
              <button onClick={() => setShowHolidayForm(false)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nama Hari Libur</label>
                <input
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Hari Raya Idul Fitri"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Keterangan (opsional)</label>
                <input
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={saveHoliday}
              disabled={saving || !holidayForm.name || !holidayForm.date}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Simpan
            </button>
          </div>
        )}

        {/* Holiday List */}
        <div className="divide-y divide-gray-50">
          {holidays.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              Belum ada hari libur terdaftar
            </div>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(h.date), "EEEE, dd MMMM yyyy", { locale: id })}
                    {h.description && ` · ${h.description}`}
                  </div>
                </div>
                <button
                  onClick={() => deleteHoliday(h.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
