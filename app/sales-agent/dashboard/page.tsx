"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CashBundleIcon, CopyIcon, MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";
import ComboCard from "@/components/cards/ComboCard";import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";
import SalesAgentComboCard from "@/components/cards/SalesAgentComboCard";
export default function SalesAgentDashboard() {
  const showToast = useToastStore((s) => s.showToast);
  const [referralCount] = useState(11);
  const [earnings] = useState("₦124,500");
  const [referralEarnings] = useState("₦18,900");
  const [uniqueUrl] = useState("https://mando.app/r/agent-123");

  const combos = [
    { id: 1, title: "Jollof + Suya", price: "N2,400", vendor: "City Grill" },
    { id: 2, title: "Pounded Yam + Ogbono", price: "N4,100", vendor: "Taste Palace" },
    { id: 3, title: "Spicy Rice + Fish", price: "N3,200", vendor: "Ocean Bites" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#A4A4A4]">Sales agent dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Welcome back, Agent Bimpe</h1>
          </div>
          <div className="rounded-3xl bg-[#FFF7E0] p-3">
            <TimerIcon />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-[#6B6B6B]">Total earnings</p>
            <p className="mt-3 text-3xl font-bold text-[#141B34]">{earnings}</p>
            <div className="mt-4 space-y-2 text-sm text-[#A4A4A4]">
              <p>Order commissions + Referral bonus</p>
              <p className="text-xs">Referral: {referralEarnings}</p>
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-[#6B6B6B]">Successful orders</p>
            <p className="mt-3 text-3xl font-bold text-[#141B34]">{referralCount}</p>
            <p className="mt-4 text-sm text-[#A4A4A4]">Tracked orders using your unique links</p>
          </div>
        </div>

        <section className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#6B6B6B]">Your shareable link</p>
              <p className="mt-2 text-sm font-semibold text-[#141B34] break-words">{uniqueUrl}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white"
                onClick={() => {
                  void navigator.clipboard.writeText(uniqueUrl);
                  showToast("Link copied to clipboard", "success");
                }}
              >
                <CopyIcon />
                <span className="ml-2">Copy link</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl bg-[#DFB400] px-5 py-3 text-sm font-semibold text-[#141B34]"
                onClick={() => showToast("Share link on socials", "info")}
              >
                Share
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Curated combos</h2>
              <p className="text-sm text-[#6B6B6B]">Share these offers and earn when customers purchase through your link.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {combos.map((combo) => (
              <SalesAgentComboCard
                key={combo.id}
                title={combo.title}
                price={combo.price}
                vendor={combo.vendor}
                imgUrl="/dummy-img.jpg"
                uniqueUrl={uniqueUrl}
              />
            ))}
          </div>
        </section>
      </div>
      <SalesAgentBottomNav />
    </motion.div>
  );
}
