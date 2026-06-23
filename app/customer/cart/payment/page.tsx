"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CopyIcon } from "@/components/svgs/DefaultIcons";

const PAYMENT_DETAILS = [
  { label: "Account name", value: "Mando Food Ltd" },
  { label: "Bank name", value: "First Bank" },
  { label: "Account number", value: "1234567890" },
];

export default function PaymentPage() {
  const router = useRouter();

  const copyToClipboard = async (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/customer/cart" className="inline-flex items-center gap-2 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="font-medium">Back</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200 space-y-6">
          <div>
            <p className="text-sm text-[#A4A4A4]">Payment method</p>
            <h1 className="text-[24px] font-semibold mt-2">Bank transfer</h1>
          </div>

          <div className="space-y-4">
            <p className="text-[#6B6B6B]">Use the details below to transfer your payment. After transfer, return to confirm with the button below.</p>

            {PAYMENT_DETAILS.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#A4A4A4]">{detail.label}</p>
                  <p className="mt-2 font-semibold text-[#1F1F1F]">{detail.value}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(detail.value)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm"
                >
                  <CopyIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          type="button"
          onClick={() => router.push("/customer/cart/payment-processing")}
          className="w-full rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-black"
        >
          I've made the payment
        </button>
      </div>
    </div>
  );
}
