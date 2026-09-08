"use client";

import { useState, useEffect } from "react";
import { format, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar, Loader2, Save, Users, Zap } from "lucide-react";

export default function RosterPage() {
  const [employeeTypes, setEmployeeTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("");
  
  const now = new Date();
  const [month, setMonth] = useState((now.getMonth() + 1).toString());
  const [year, setYear] = useState(now.getFullYear().toString());

  const [employees, setEmployees] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/employee-types")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          const shiftTypes = data.data.filter((et: any) => et.scheduleType === "SHIFT");
          setEmployeeTypes(shiftTypes);
          if (shiftTypes.length > 0) setSelectedType(shiftTypes[0].id);
        }
      });
  }, []);

  const loadRoster = async () => {
    if (!selectedType || !month || !year) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roster?employeeTypeId=${selectedType}&month=${month}&year=${year}`);
      const data = await res.json();
      setEmployees(data.employees || []);
      setRosters(data.rosters || []);
      setShifts(data.shifts || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoster();
  }, [selectedType, month, year]);

  const handleGenerate = async () => {
    if (!confirm("Apakah Anda yakin ingin men-generate jadwal rolling otomatis untuk bulan ini? Data roster bulan ini akan ditimpa.")) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeTypeId: selectedType, month, year })
      });
      if (res.ok) {
        alert("Jadwal shift berhasil digenerate!");
        loadRoster();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal generate jadwal");
      }
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
    setGenerating(false);
  };

  const updateCell = async (employeeId: string, rosterDate: Date, shiftId: string | null) => {
    try {
      const res = await fetch("/api/admin/roster", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          rosterDate: rosterDate.toISOString(),
          shiftId,
          isDayOff: shiftId === null
        })
      });
      if (res.ok) {
        loadRoster(); // Reload to reflect changes
      }
    } catch (error) {
      alert("Gagal menyimpan perubahan");
    }
  };

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getCellRoster = (empId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return rosters.find(r => r.employeeId === empId && format(new Date(r.rosterDate), "yyyy-MM-dd") === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Penjadwalan Shift (Roster)</h1>
          <p className="text-sm text-gray-500 mt-1">Atur jadwal kerja harian (shift) untuk pegawai per bulan.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGenerate}
            disabled={generating || !selectedType}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Generate Auto-Rolling
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Pegawai</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border rounded-xl text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Pilih Jenis --</option>
            {employeeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Bulan</label>
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-4 py-2 border rounded-xl text-sm w-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i+1} value={(i+1).toString()}>
                {format(new Date(2024, i, 1), "MMMM", { locale: id })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun</label>
          <input 
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-4 py-2 border rounded-xl text-sm w-24 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-12 flex justify-center text-gray-400">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Tidak ada pegawai dengan tipe ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-xs tracking-wide">
                  <th className="px-4 py-3 border-b border-r min-w-[200px] sticky left-0 bg-gray-50 z-10 shadow-[1px_0_0_#eee]">Pegawai</th>
                  {days.map(d => (
                    <th key={d.toString()} className="px-2 py-2 border-b text-center min-w-[100px]">
                      <div className="font-bold text-gray-900">{format(d, "dd")}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{format(d, "EEE", { locale: id })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 border-r text-sm sticky left-0 bg-white z-10 shadow-[1px_0_0_#f3f4f6]">
                      <div className="font-semibold text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-500">{emp.nip}</div>
                    </td>
                    {days.map(d => {
                      const roster = getCellRoster(emp.id, d);
                      return (
                        <td key={d.toString()} className="px-1 py-1 text-center">
                          <select 
                            value={roster?.isDayOff ? "OFF" : (roster?.shiftId || "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCell(emp.id, d, val === "OFF" || val === "" ? null : val);
                            }}
                            className={`w-full text-[11px] p-1.5 rounded-md border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium ${
                              roster?.isDayOff ? "bg-red-50 text-red-700" :
                              roster?.shiftId ? "bg-green-50 text-green-700" :
                              "bg-gray-50 text-gray-500"
                            }`}
                          >
                            <option value="">- Set -</option>
                            <option value="OFF">Libur / OFF</option>
                            {shifts.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
