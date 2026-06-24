"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftIcon, DefaultUserIcon, MoneyIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";

import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";

export default function SalesAgentProfile() {
  const [orders] = useState([
    { id: "SAG001", amount: "₦2,800", date: "2026-06-18", status: "Delivered" },
    { id: "SAG002", amount: "₦3,200", date: "2026-06-15", status: "Pending" },
  ]);
  const [referrals] = useState([
    { id: "REF123", bonus: "₦1,200", date: "2026-06-10" },
    { id: "REF124", bonus: "₦1,500", date: "2026-06-05" },
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
            <span className="text-lg font-semibold">Agent Profile</span>
          </Link>
        </header>

        <section className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF7E0]">
              <DefaultUserIcon />
            </div>
            <div>
              <p className="text-sm text-[#6B6B6B]">Sales agent</p>
              <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Amina Yusuf</h1>
              <p className="mt-1 text-sm text-[#A4A4A4]">amina@agentsuite.com</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-[#F7F4E3] p-4">
              <p className="text-sm text-[#6B6B6B]">Payout method</p>
              <p className="mt-3 text-base font-semibold text-[#141B34]">Bank transfer</p>
            </div>
            <div className="rounded-3xl bg-[#F7F4E3] p-4">
              <p className="text-sm text-[#6B6B6B]">Account</p>
              <p className="mt-3 text-base font-semibold text-[#141B34]">GTBank • 0123456789</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white">Edit profile</button>
            <button className="rounded-2xl border border-[#141B34] px-5 py-3 text-sm font-semibold text-[#141B34]">Edit payout details</button>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Order history</h2>
              <p className="text-sm text-[#6B6B6B]">Track orders earned through your shared links.</p>
            </div>
            <Link href="/sales-agent/dashboard" className="text-sm font-semibold text-[#A4A4A4] hover:text-[#141B34]">Back to dashboard</Link>
          </div>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[28px] bg-white p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{order.date}</p>
                    <p className="mt-1 font-semibold text-[#141B34]">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#6B6B6B]">{order.amount}</p>
                    <p className="mt-1 text-sm font-semibold text-[#141B34]">{order.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Referral history</h2>
              <p className="text-sm text-[#6B6B6B]">Rewards from successful referrals and payouts.</p>
            </div>
            <div className="rounded-3xl bg-[#FFF7E0] px-4 py-2 text-sm font-semibold text-[#141B34]">+2 referrals</div>
          </div>
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">{ref.date}</p>
                  <p className="mt-1 font-semibold text-[#141B34]">{ref.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#6B6B6B]">Bonus earned</p>
                  <p className="mt-1 font-semibold text-[#141B34]">{ref.bonus}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <SalesAgentBottomNav />
    </motion.div>
  );
}
