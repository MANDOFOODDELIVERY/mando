"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiRefreshCw } from "react-icons/fi";
import RiderBottomNav from "@/components/RiderBottomNav";
import { MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

export default function RiderDashboard() {
  const [orders] = useState([
    { id: "R-001", location: "Modomo", customer: "Ola's Kitchen", eta: "12 mins", status: "Waiting" },
    { id: "R-002", location: "Modomo", customer: "LevelUp Bistro", eta: "18 mins", status: "Waiting" },
  ]);
  const [history] = useState([
    { id: "R-090", restaurant: "Gidado's", completedAt: "12 Jun 2026", earnings: "₦1,800" },
    { id: "R-089", restaurant: "Bella's", completedAt: "10 Jun 2026", earnings: "₦2,100" },
  ]);
  const [earnings] = useState("₦3,900");
  const showToast = useToastStore((s) => s.showToast);

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
            <p className="text-sm font-semibold text-[#A4A4A4]">Rider dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">Active orders in Modomo</h1>
          </div>
          <div className="rounded-3xl bg-[#FFF7E0] p-3">
            <TimerIcon />
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#6B6B6B]">Total earnings</p>
                <p className="mt-2 text-3xl font-bold text-[#141B34]">{earnings}</p>
              </div>
              <div className="rounded-3xl bg-[#F7F4E3] p-3">
                <MoneyIcon />
              </div>
            </div>
            <p className="mt-4 text-sm text-[#A4A4A4]">Completed delivery payouts</p>
          </div>

          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#6B6B6B]">Assigned jurisdiction</p>
                <p className="mt-2 text-lg font-semibold text-[#141B34]">Modomo</p>
              </div>
              <button
                type="button"
                aria-label="Refresh orders"
                title="Refresh orders"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141B34] text-white transition hover:bg-[#27304F] focus:outline-none focus:ring-2 focus:ring-[#DFB400] focus:ring-offset-2"
                onClick={() => showToast("Orders refreshed", "success")}
              >
                <FiRefreshCw className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Available pickups</h2>
              <p className="text-sm text-[#6B6B6B]">Orders available only for your assigned area.</p>
            </div>
          </div>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{order.location}</p>
                    <h3 className="mt-2 text-lg font-semibold text-[#141B34]">{order.customer}</h3>
                    <p className="mt-1 text-sm text-[#A4A4A4]">Order {order.id}</p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="text-sm text-[#6B6B6B]">ETA</p>
                    <p className="text-lg font-semibold text-[#141B34]">{order.eta}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex rounded-2xl bg-[#F7F4E3] px-4 py-2 text-sm font-semibold text-[#141B34]">{order.status}</span>
                  <button
                    type="button"
                    className="rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white"
                    onClick={() => showToast(`Order ${order.id} picked up`, "success")}
                  >
                    Pick up order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#141B34]">Activity log</h2>
              <p className="text-sm text-[#6B6B6B]">Completed orders from your assigned route.</p>
            </div>
          </div>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-3xl bg-[#F7F7F7] p-4">
                <div>
                  <p className="text-sm text-[#6B6B6B]">{item.completedAt}</p>
                  <p className="mt-1 font-semibold text-[#141B34]">{item.restaurant}</p>
                  <p className="text-sm text-[#A4A4A4]">Order {item.id}</p>
                </div>
                <p className="text-sm font-semibold text-[#141B34]">{item.earnings}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <RiderBottomNav />
    </motion.div>
  );
}
