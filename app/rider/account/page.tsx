"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { FiEdit3, FiSend } from "react-icons/fi";
import ConfirmationModal from "@/components/ConfirmationModal";
import RiderBottomNav from "@/components/RiderBottomNav";
import { ArrowLeftIcon, DefaultUserIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RiderProfile = {
  user: {
    email: string;
  };
  profile: {
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  rider: {
    riderCode: string;
    availabilityStatus: string;
    serviceArea: {
      name: string;
      city: string;
      state: string;
    };
  };
  payoutAccount: {
    accountName: string;
    accountNumberLast4: string;
    isVerified: boolean;
  } | null;
  payout: {
    availableAmount: number;
  };
  payoutRequests: {
    id: string;
    amount: number;
    status: string;
    requestedAt: string;
  }[];
};

type RiderDelivery = {
  id: string;
  riderEarningAmount: number;
  deliveredAt: string | null;
  order: {
    orderNumber: string;
  };
  restaurant: {
    name: string;
  };
};

export default function RiderAccount() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [history, setHistory] = useState<RiderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showPayoutConfirmation, setShowPayoutConfirmation] = useState(false);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);

  const loadAccount = useCallback(async () => {
    setLoading(true);

    try {
      const [profileResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/rider/me`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/rider/deliveries/history`, {
          credentials: "include",
        }),
      ]);

      if (
        profileResponse.status === 401 ||
        profileResponse.status === 403 ||
        historyResponse.status === 401 ||
        historyResponse.status === 403
      ) {
        router.push("/rider/login");
        return;
      }

      if (!profileResponse.ok) throw new Error("Unable to load rider account");
      if (!historyResponse.ok) throw new Error("Unable to load rider history");

      setProfile((await profileResponse.json()) as RiderProfile);
      const historyBody = (await historyResponse.json()) as {
        deliveries: RiderDelivery[];
      };
      setHistory(historyBody.deliveries);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load rider account",
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
      const response = await fetch(`${API_BASE_URL}/rider/payout-requests`, {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/rider/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Account</span>
          </Link>
        </header>

        <section className="mb-6 rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="h-48 animate-pulse rounded-[28px] bg-[#F7F7F7]" />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FFF7E0]">
                  {profile?.profile.avatarUrl ? (
                    <img
                      src={profile.profile.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <DefaultUserIcon />
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#6B6B6B]">Rider</p>
                  <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
                    {profile?.profile.fullName ?? "Rider"}
                  </h1>
                  <p className="mt-1 text-sm text-[#A4A4A4]">
                    {profile?.user.email ?? "No email loaded"}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBlock
                  label="Assigned area"
                  value={
                    profile
                      ? `${profile.rider.serviceArea.name}, ${profile.rider.serviceArea.city}`
                      : "Not assigned"
                  }
                />
                <InfoBlock
                  label="Rider code"
                  value={profile?.rider.riderCode ?? "Not assigned"}
                />
                <InfoBlock
                  label="Phone"
                  value={profile?.profile.phone ?? "No phone added"}
                />
                <InfoBlock
                  label="Payout method"
                  value={
                    profile?.payoutAccount
                      ? `${profile.payoutAccount.accountName} - ****${profile.payoutAccount.accountNumberLast4}`
                      : "No payout account"
                  }
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={requestingPayout}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => setShowPayoutConfirmation(true)}
                >
                  <FiSend className="h-4 w-4" />
                  Request payout
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#141B34] px-5 py-3 text-sm font-semibold text-[#141B34]"
                  onClick={() => setShowPayoutDetails(true)}
                >
                  <FiEdit3 className="h-4 w-4" />
                  Edit payout details
                </button>
              </div>
            </>
          )}
        </section>

        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#6B6B6B]">Available payout</p>
              <p className="mt-2 text-3xl font-bold text-[#141B34]">
                {formatCurrency(profile?.payout.availableAmount ?? 0)}
              </p>
            </div>
            <p className="text-sm font-semibold text-[#6B6B6B]">
              Admin reviews every request.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {(profile?.payoutRequests ?? []).slice(0, 3).map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4"
              >
                <div>
                  <p className="text-sm text-[#6B6B6B]">{formatDate(payout.requestedAt)}</p>
                  <p className="mt-1 font-semibold text-[#141B34]">
                    {formatCurrency(payout.amount)}
                  </p>
                </div>
                <p className="text-xs font-semibold capitalize text-[#6B6B6B]">
                  {payout.status.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[#141B34]">Order history</h2>
            <p className="text-sm text-[#6B6B6B]">Your completed deliveries</p>
          </div>
          <div className="space-y-3">
            {loading ? (
              [0, 1].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-3xl bg-[#F7F7F7]"
                />
              ))
            ) : history.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-[#F7F7F7] p-5 text-center text-sm font-semibold text-[#6B6B6B]">
                No completed deliveries yet.
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-3xl bg-[#F7F7F7] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#6B6B6B]">
                        {item.deliveredAt ? formatDate(item.deliveredAt) : "Completed"}
                      </p>
                      <p className="mt-1 font-semibold text-[#141B34]">
                        {item.restaurant.name}
                      </p>
                      <p className="text-sm text-[#A4A4A4]">
                        Order {item.order.orderNumber}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[#141B34]">
                      {formatCurrency(item.riderEarningAmount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <RiderBottomNav />
      <ConfirmationModal
        open={showPayoutConfirmation}
        title="Request payout?"
        description={`This will send your available rider earnings (${formatCurrency(profile?.payout.availableAmount ?? 0)}) to admin for review.`}
        confirmLabel="Request"
        confirming={requestingPayout}
        onClose={() => setShowPayoutConfirmation(false)}
        onConfirm={() => void requestPayout()}
      />
      {showPayoutDetails && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[390px] rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-[#141B34]">Payout details</h2>
            <p className="mt-3 text-sm leading-6 text-[#6B6B6B]">
              Rider payout accounts are added and verified by admin during onboarding. Send
              your updated bank details to admin, then refresh this page after it is changed.
            </p>
            <div className="mt-4 rounded-3xl bg-[#F7F4E3] p-4">
              <p className="text-sm text-[#6B6B6B]">Current account</p>
              <p className="mt-2 font-semibold text-[#141B34]">
                {profile?.payoutAccount
                  ? `${profile.payoutAccount.accountName} - ****${profile.payoutAccount.accountNumberLast4}`
                  : "No payout account added yet"}
              </p>
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white"
              onClick={() => setShowPayoutDetails(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#F7F4E3] p-4">
      <p className="text-sm text-[#6B6B6B]">{label}</p>
      <p className="mt-3 text-base font-semibold text-[#141B34]">{value}</p>
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
