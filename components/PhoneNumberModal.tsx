"use client";

type PhoneNumberModalProps = {
  open: boolean;
  phone: string;
  saving?: boolean;
  onPhoneChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export default function PhoneNumberModal({
  open,
  phone,
  saving = false,
  onPhoneChange,
  onSave,
  onClose,
}: PhoneNumberModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] transition-transform duration-300 translate-y-0">
        <div className="space-y-4">
          <h3 className="text-[20px] font-semibold">Add phone number</h3>
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full border border-gray-300 rounded-md p-4 text-[14px] focus:outline-none focus:border-[#DFB400]"
          />
          <button
            disabled={saving}
            onClick={onSave}
            className="w-full bg-[#DFB400] text-white font-semibold py-4 rounded-md disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}
