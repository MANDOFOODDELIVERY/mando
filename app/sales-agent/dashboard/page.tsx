"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ConfirmationModal from "@/components/ConfirmationModal";
import { CopyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";
import SalesAgentComboCard from "@/components/cards/SalesAgentComboCard";
import useAuthStore from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ShareCombo = {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  imageUrl: string | null;
  restaurantName: string;
  shareUrl: string;
};

type SalesDashboard = {
  agent: {
    profile: {
      fullName: string;
    };
    salesAgent: {
      agentCode: string;
      referralCode: string;
      tier: string;
    };
  };
  stats: {
    referralCount: number;
    successfulOrderCount: number;
    trackedRevenueAmount: number;
    totalCommissionAmount: number;
    influencerThreshold: number;
    remainingOrdersToInfluencer: number;
  };
  shareCombos: ShareCombo[];
  influencerSignupUrl: string | null;
};

export default function SalesAgentDashboard() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const logoutAuth = useAuthStore((s) => s.logout);
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/sales-agent/dashboard`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/sales-agent/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load sales dashboard");

      setDashboard((await response.json()) as SalesDashboard);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load sales dashboard",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const copyInfluencerLink = async () => {
    if (!dashboard?.influencerSignupUrl) return;

    await navigator.clipboard.writeText(dashboard.influencerSignupUrl);
    showToast("Influencer referral link copied", "success");
  };

  const shareInfluencerLink = async () => {
    if (!dashboard?.influencerSignupUrl) return;

    const text =
      "Apply to become a MANDO sales agent through my referral link. Admin approval is still required.";

    if (navigator.share) {
      await navigator.share({
        title: "Join MANDO as a sales agent",
        text,
        url: dashboard.influencerSignupUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(`${text}\n${dashboard.influencerSignupUrl}`);
    showToast("Influencer referral text copied", "success");
  };

  async function logout() {
    setLoggingOut(true);

    try {
      await logoutAuth();

      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      showToast("Logged out successfully", "success");
      router.push("/sales-agent/login");
    } catch {
      showToast("Logout failed. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#A4A4A4]">Sales agent dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
              {loading
                ? "Loading dashboard..."
                : `Welcome back, ${dashboard?.agent.profile.fullName ?? "Agent"}`}
            </h1>
            {dashboard && (
              <p className="mt-1 text-sm font-semibold capitalize text-[#6B6B6B]">
                {dashboard.agent.salesAgent.tier} tier
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dashboard ? (
              <button
                type="button"
                disabled={loggingOut}
                className="rounded-2xl bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => setShowLogoutConfirmation(true)}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white"
                onClick={() => router.push("/sales-agent/login")}
              >
                Login
              </button>
            )}
            <div className="rounded-3xl bg-[#FFF7E0] p-3">
              <TimerIcon />
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Total commission"
            value={formatCurrency(dashboard?.stats.totalCommissionAmount ?? 0)}
            helper={`Tracked revenue ${formatCurrency(dashboard?.stats.trackedRevenueAmount ?? 0)}`}
          />
          <StatCard
            label="Successful orders"
            value={`${dashboard?.stats.successfulOrderCount ?? 0}`}
            helper={
              dashboard?.agent.salesAgent.tier === "influencer"
                ? "Influencer tier unlocked"
                : `${dashboard?.stats.remainingOrdersToInfluencer ?? 10} more to unlock influencer`
            }
          />
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {dashboard?.influencerSignupUrl ? (
              <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">Influencer referral link</p>
                    <p className="mt-2 break-words text-sm font-semibold text-[#141B34]">
                      {dashboard.influencerSignupUrl}
                    </p>
                    <p className="mt-2 text-xs text-[#A4A4A4]">
                      Downline agents still require admin approval.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white"
                      onClick={() => void copyInfluencerLink()}
                    >
                      <CopyIcon />
                      <span className="ml-2">Copy</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-2xl bg-[#DFB400] px-5 py-3 text-sm font-semibold text-[#141B34]"
                      onClick={() => void shareInfluencerLink()}
                    >
                      Share
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#141B34]">
                  Influencer referral unlocks after 10 successful orders.
                </p>
                <p className="mt-2 text-sm text-[#6B6B6B]">
                  Keep sharing combo links. Your dashboard will reveal the sales-agent referral link once you qualify.
                </p>
              </section>
            )}

            <section className="mb-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[#141B34]">Curated combos</h2>
                <p className="text-sm text-[#6B6B6B]">
                  Each shared combo link carries your agent ID for customer attribution.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(dashboard?.shareCombos ?? []).map((combo) => (
                  <SalesAgentComboCard
                    key={combo.id}
                    title={combo.name}
                    price={formatCurrency(combo.priceAmount)}
                    vendor={combo.restaurantName}
                    imgUrl={combo.imageUrl ?? "/dummy-img.jpg"}
                    uniqueUrl={combo.shareUrl}
                    description={combo.description}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      <SalesAgentBottomNav />
      <ConfirmationModal
        open={showLogoutConfirmation}
        title="Log out?"
        description="You will need to log in again before viewing your sales agent dashboard or sharing tracked combo links."
        confirmLabel="Logout"
        confirming={loggingOut}
        danger
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          setShowLogoutConfirmation(false);
          void logout();
        }}
      />
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-[#6B6B6B]">{label}</p>
      <p className="mt-3 text-3xl font-bold text-[#141B34]">{value}</p>
      <p className="mt-4 text-sm text-[#A4A4A4]">{helper}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-40 animate-pulse rounded-[28px] border border-gray-200 bg-white"
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
