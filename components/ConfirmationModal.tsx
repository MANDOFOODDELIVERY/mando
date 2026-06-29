"use client";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirming = false,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-[#141B34]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={confirming}
            onClick={onClose}
            className="rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-[#141B34] disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className={`rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? "bg-[#E53E3E]" : "bg-[#141B34]"
            }`}
          >
            {confirming ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
