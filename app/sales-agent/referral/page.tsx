"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftIcon, MoneyIcon } from "@/components/svgs/DefaultIcons";
import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";

export default function SalesAgentReferral() {
  const [referralStats] = useState([
    { label: "Active referrals", value: "11", change: "+2 this month" },
    { label: "Total referral earnings", value: "₦18,900", change: "⭐ Bonus tier unlocked" },
    { label: "Next milestone", value: "20 orders", change: "9 more to go" },
  ]);

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
            <span className="text-lg font-semibold">Referral rewards</span>
          </Link>
        </header>

        <section className="rounded-[32px] bg-gradient-to-r from-[#FFF7E0] via-[#FFF3CC] to-[#FFF7E0] p-6 shadow-[0_20px_60px_rgba(223,180,0,0.12)] border border-[#F1D86F] mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-3xl bg-white p-4">
              <MoneyIcon />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6B6B6B]">Referral tier</p>
              <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Gold status 🏆</h1>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {referralStats.map((stat) => (
              <div key={stat.label} className="rounded-[24px] bg-white/80 p-4 backdrop-blur">
                <p className="text-xs text-[#6B6B6B]">{stat.label}</p>
                <p className="mt-2 text-lg font-bold text-[#141B34]">{stat.value}</p>
                <p className="mt-1 text-xs text-[#DFB400]">{stat.change}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-[#141B34] mb-4">Referral benefits</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <p className="text-[#6B6B6B]">10% commission on all referred orders</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <p className="text-[#6B6B6B]">Bonus payments when you hit milestone targets</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <p className="text-[#6B6B6B]">Early access to new campaigns and exclusive combos</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">✓</span>
              <p className="text-[#6B6B6B]">Dedicated support and marketing materials</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-[#141B34] mb-4">How referrals work</h2>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-[#141B34]">Step 1: Share your link</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Share your unique referral URL with customers or on social media.</p>
            </div>
            <div>
              <p className="font-semibold text-[#141B34]">Step 2: They sign up & order</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">When someone signs up using your link and completes their first order, it counts as a successful referral.</p>
            </div>
            <div>
              <p className="font-semibold text-[#141B34]">Step 3: You earn</p>
              <p className="mt-1 text-sm text-[#6B6B6B]">Earn commission on every order they place. The more they order, the more you earn.</p>
            </div>
          </div>
        </section>
      </div>
      <SalesAgentBottomNav />
    </motion.div>
  );
}
