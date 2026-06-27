"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CopyIcon } from "@/components/svgs/DefaultIcons";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const PAYMENT_DETAILS = [
  { label: "Account name", value: "Mando Food Ltd" },
  { label: "Bank name", value: "First Bank" },
  { label: "Account number", value: "1234567890" },
];

type SavedAddress = {
  id: string;
  isDefault: boolean;
};

export default function PaymentPage() {
  const router = useRouter();
  const auth = useAuthStore((s) => s.auth);
  const authLoading = useAuthStore((s) => s.loading);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const items = useCartStore((s) => s.items);
  const showToast = useToastStore((s) => s.showToast);
  const [checkingRequirements, setCheckingRequirements] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkPaymentRequirements() {
      try {
        const currentAuth = await fetchCurrentUser();

        if (!mounted) return;

        if (!currentAuth) {
          showToast("Please log in to continue to payment", "error");
          router.replace("/login");
          return;
        }

        if (items.length === 0) {
          showToast("Your cart is empty", "error");
          router.replace("/customer/cart");
          return;
        }

        const addressResponse = await fetch(`${API_BASE_URL}/customer/addresses`, {
          credentials: "include",
        });

        if (!mounted) return;

        if (!addressResponse.ok) {
          showToast("Please add a delivery address", "error");
          router.replace("/customer/cart/change-address");
          return;
        }

        const addressData = (await addressResponse.json()) as { addresses: SavedAddress[] };
        const hasAddress = addressData.addresses.some((address) => address.isDefault) || addressData.addresses.length > 0;

        if (!hasAddress) {
          showToast("Please add a delivery address", "error");
          router.replace("/customer/cart/change-address");
          return;
        }

        if (!currentAuth.profile?.phone) {
          showToast("Please add your phone number", "error");
          router.replace("/customer/cart");
          return;
        }
      } catch {
        if (!mounted) return;

        showToast("Please complete your checkout details", "error");
        router.replace("/customer/cart");
      } finally {
        if (mounted) setCheckingRequirements(false);
      }
    }

    checkPaymentRequirements();

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, items.length, router, showToast]);

  const copyToClipboard = async (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
    }
  };

  if (!auth || checkingRequirements) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">
          {authLoading || checkingRequirements ? "Checking payment details..." : "Redirecting..."}
        </p>
      </div>
    );
  }

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
          I&apos;ve made the payment
        </button>
      </div>
    </div>
  );
}