"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import ExportUsersModal from "./ExportUsersModal";
import { TenantOption } from "./UserTable";

interface ExportUsersButtonProps {
  tenants: TenantOption[];
}

export default function ExportUsersButton({ tenants }: ExportUsersButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-xl font-medium text-sm transition-colors shadow-xs cursor-pointer w-fit"
        title="Export Data Pengguna ke Excel (.xlsx)"
      >
        <FileSpreadsheet size={16} className="text-emerald-600" />
        Export Data User
      </button>

      <ExportUsersModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tenants={tenants}
        initialTenantId="ALL"
      />
    </>
  );
}
