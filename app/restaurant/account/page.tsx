"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ConfirmationModal from "@/components/ConfirmationModal";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { ArrowLeftIcon, MoneyIcon, DefaultUserIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RestaurantAccountData = {
  restaurant: {
    name: string;
    description: string | null;
    phone: string | null;
    streetAddress: string;
    imageUrl: string | null;
    isVerified: boolean;
    serviceArea: { name: string; city: string; state: string };
  };
  payoutAccount: {
    accountName: string;
    accountNumberLast4: string;
    isVerified: boolean;
  } | null;
  payout: { availableAmount: number };
  payoutRequests: {
    id: string;
    amount: number;
    status: string;
    requestedAt: string;
  }[];
};

export default function RestaurantAccount() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [account, setAccount] = useState<RestaurantAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showPayoutConfirmation, setShowPayoutConfirmation] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/me`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/restaurant/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load restaurant account");

      setAccount((await response.json()) as RestaurantAccountData);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load restaurant account",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const requestPayout = async () => {
    setRequestingPayout(true);

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/payout-requests`, {
        method: "POST",
        credentials: "include",
      });

      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "Unable to request payout");

      showToast("Payout request sent to admin", "success");
      setShowPayoutConfirmation(false);
      await loadAccount();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to request payout", "error");
    } finally {
      setRequestingPayout(false);
    }
  };

  const restaurant = account?.restaurant;
  const payoutAccount = account?.payoutAccount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/restaurant/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Restaurant account</span>
          </Link>
        </header>

        {loading ? (
          <AccountSkeleton />
        ) : (
          <>
            <section className="mb-6 rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FFF7E0]">
                  {restaurant?.imageUrl ? (
                    <img src={restaurant.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <DefaultUserIcon />
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B]">Restaurant</p>
                  <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
                    {restaurant?.name ?? "Restaurant"}
                  </h1>
                  <p className="mt-1 text-sm text-[#A4A4A4]">
                    {restaurant?.serviceArea.name}, {restaurant?.serviceArea.city}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBlock label="Status" value={restaurant?.isVerified ? "Verified" : "Pending"} />
                <InfoBlock label="Unique offer" value={restaurant?.description ?? "Not set"} />
                <InfoBlock
                  label="Payout account"
                  value={
                    payoutAccount
                      ? `${payoutAccount.accountName} - ****${payoutAccount.accountNumberLast4}`
                      : "Admin has not added one yet"
                  }
                />
                <InfoBlock label="Contact" value={restaurant?.phone ?? "Not set"} />
                <InfoBlock label="Street address" value={restaurant?.streetAddress ?? "Not set"} />
              </div>
            </section>

            <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">Available payout</p>
                  <p className="mt-2 text-3xl font-bold text-[#141B34]">
                    {formatCurrency(account?.payout.availableAmount ?? 0)}
                  </p>
                  <p className="mt-2 text-sm text-[#A4A4A4]">Pending admin approval after request.</p>
                </div>
                <div className="rounded-3xl bg-[#FFF7E0] p-3">
                  <MoneyIcon />
                </div>
              </div>
              <button
                type="button"
                disabled={requestingPayout}
                className="mt-5 w-full rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => setShowPayoutConfirmation(true)}
              >
                {requestingPayout ? "Requesting..." : "Request payout"}
              </button>
            </section>

            <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-[#141B34]">Recent payout requests</h2>
              <div className="mt-4 space-y-3">
                {(account?.payoutRequests ?? []).length === 0 ? (
                  <p className="rounded-3xl bg-[#F7F7F7] p-4 text-sm text-[#6B6B6B]">
                    No payout request yet.
                  </p>
                ) : (
                  account?.payoutRequests.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4">
                      <div>
                        <p className="text-sm text-[#6B6B6B]">{formatDate(payout.requestedAt)}</p>
                        <p className="mt-1 font-semibold text-[#141B34]">{payout.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#141B34]">{formatCurrency(payout.amount)}</p>
                        <p className="mt-1 text-xs capitalize text-[#6B6B6B]">{payout.status.replace("_", " ")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <RestaurantBottomNav />

      <ConfirmationModal
        open={showPayoutConfirmation}
        title="Request payout?"
        description="Admin will review this payout request before it is processed."
        confirmLabel="Request"
        confirming={requestingPayout}
        onClose={() => setShowPayoutConfirmation(false)}
        onConfirm={() => void requestPayout()}
      />
    </motion.div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#F7F4E3] p-4">
      <p className="text-sm text-[#6B6B6B]">{label}</p>
      <p className="mt-3 break-words text-base font-semibold text-[#141B34]">{value}</p>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-44 animate-pulse rounded-[28px] border border-gray-200 bg-white"
        />
      ))}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
