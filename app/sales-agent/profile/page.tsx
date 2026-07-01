"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";
import { ArrowLeftIcon, DefaultUserIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AgentProfile = {
  user: {
    email: string;
  };
  profile: {
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
  };
  salesAgent: {
    agentCode: string;
    referralCode: string;
    tier: string;
    commissionRateBps: number;
  };
  payoutAccount: {
    accountName: string;
    accountNumberLast4: string;
    isVerified: boolean;
  } | null;
};

type ReferralBody = {
  stats: {
    referralCount: number;
    successfulOrderCount: number;
    totalCommissionAmount: number;
    recentOrders: {
      id: string;
      orderNumber: string;
      totalAmount: number;
      createdAt: string;
    }[];
  };
  referrals: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    attributedAt: string;
  }[];
};

export default function SalesAgentProfile() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralBody | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const [profileResponse, referralsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/sales-agent/me`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/sales-agent/referrals`, {
          credentials: "include",
        }),
      ]);

      if (
        profileResponse.status === 401 ||
        profileResponse.status === 403 ||
        referralsResponse.status === 401 ||
        referralsResponse.status === 403
      ) {
        router.push("/sales-agent/login");
        return;
      }

      if (!profileResponse.ok) throw new Error("Unable to load agent profile");
      if (!referralsResponse.ok) throw new Error("Unable to load referrals");

      setProfile((await profileResponse.json()) as AgentProfile);
      setReferrals((await referralsResponse.json()) as ReferralBody);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load profile",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/sales-agent/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Agent Profile</span>
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
                  <p className="text-sm text-[#6B6B6B]">Sales agent</p>
                  <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
                    {profile?.profile.fullName ?? "Sales agent"}
                  </h1>
                  <p className="mt-1 text-sm text-[#A4A4A4]">
                    {profile?.user.email ?? "No email loaded"}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoBlock label="Agent code" value={profile?.salesAgent.agentCode ?? "Not assigned"} />
                <InfoBlock label="Tier" value={profile?.salesAgent.tier ?? "standard"} />
                <InfoBlock
                  label="Payout method"
                  value={
                    profile?.payoutAccount
                      ? `${profile.payoutAccount.accountName} - ****${profile.payoutAccount.accountNumberLast4}`
                      : "No payout account"
                  }
                />
              </div>
            </>
          )}
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Tracked orders</h2>
              <p className="text-sm text-[#6B6B6B]">Delivered orders from customers attributed to you.</p>
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              <SkeletonRows />
            ) : referrals?.stats.recentOrders.length ? (
              referrals.stats.recentOrders.map((order) => (
                <div key={order.id} className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#6B6B6B]">{formatDate(order.createdAt)}</p>
                      <p className="mt-1 font-semibold text-[#141B34]">{order.orderNumber}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#141B34]">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="No delivered tracked orders yet." />
            )}
          </div>
        </section>

        <section className="mb-6 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Referral history</h2>
              <p className="text-sm text-[#6B6B6B]">Customers who signed up from your combo links.</p>
            </div>
            <div className="rounded-3xl bg-[#FFF7E0] px-4 py-2 text-sm font-semibold text-[#141B34]">
              {referrals?.stats.referralCount ?? 0} referrals
            </div>
          </div>
          <div className="space-y-3">
            {loading ? (
              <SkeletonRows />
            ) : referrals?.referrals.length ? (
              referrals.referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{formatDate(referral.attributedAt)}</p>
                    <p className="mt-1 font-semibold text-[#141B34]">{referral.fullName}</p>
                    <p className="text-sm text-[#A4A4A4]">{referral.email}</p>
                  </div>
                  <p className="text-sm font-semibold capitalize text-[#141B34]">
                    {referral.status}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text="No customer referrals yet." />
            )}
          </div>
        </section>
      </div>
      <SalesAgentBottomNav />
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

function SkeletonRows() {
  return [0, 1].map((item) => (
    <div key={item} className="h-20 animate-pulse rounded-3xl bg-[#F7F7F7]" />
  ));
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-[#F7F7F7] p-5 text-center text-sm font-semibold text-[#6B6B6B]">
      {text}
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
