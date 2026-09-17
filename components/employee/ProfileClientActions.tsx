"use client";

import { useState } from "react";
import { UserCog, KeyRound, Camera } from "lucide-react";
import ProfileEditModal, { ProfileInitialData } from "./ProfileEditModal";
import ChangePasswordModal from "./ChangePasswordModal";

interface ProfileClientActionsProps {
  employee: {
    id: string;
    nip: string;
    name: string;
    department: string;
    position: string;
    phone: string | null;
    address: string | null;
    photoUrl: string | null;
    user: { email: string };
  };
}

export default function ProfileClientActions({ employee }: ProfileClientActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const initialData: ProfileInitialData = {
    name: employee.name,
    nip: employee.nip,
    department: employee.department,
    position: employee.position,
    email: employee.user.email,
    phone: employee.phone,
    address: employee.address,
    photoUrl: employee.photoUrl,
  };

  return (
    <>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-2xl font-medium text-xs shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <UserCog size={15} className="text-blue-600" />
          Edit Profil
        </button>

        <button
          type="button"
          onClick={() => setIsPasswordOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-2xl font-medium text-xs shadow-xs transition-all cursor-pointer active:scale-98"
        >
          <KeyRound size={15} className="text-indigo-600" />
          Ubah Password
        </button>
      </div>

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={initialData}
      />

      <ChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />
    </>
  );
}
