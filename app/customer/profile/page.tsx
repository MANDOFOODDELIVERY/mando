"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, DefaultUserIcon, GreyedStarIcon, StarIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";

export default function ProfilePage() {
  const router = useRouter();
  const cartCount = useCartStore((s) => s.items.length);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [birthday, setBirthday] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [orders] = useState([
    { id: "A1B2C3", title: "Amala + Ewedu", date: "2026-06-21", total: "₦2,800", rating: 4 },
    { id: "D4E5F6", title: "Jollof + Chicken", date: "2026-05-10", total: "₦3,200", rating: 0 },
  ]);

  const [feedback, setFeedback] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  function saveProfile() {
    setEditing(false);
    // persist if needed
  }

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    router.push("/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="flex items-center justify-between mb-6">
          <Link href="/customer/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Profile</span>
          </Link>
        </header>

        <section className="rounded-[32px] bg-gradient-to-r from-[#FFF7E0] via-[#FFF3CC] to-[#FFF7E0] p-6 shadow-[0_20px_60px_rgba(223,180,0,0.12)] border border-[#F1D86F] mb-6 overflow-hidden">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-sm">
              <DefaultUserIcon />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[#141B34]">{name}</h2>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{email}</p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white shadow-sm"
                >
                  {editing ? "Close" : "Edit profile"}
                </button>
              </div>
            </div>
          </div>

          {editing && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-[24px] bg-white p-5 shadow-sm border border-gray-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-gray-200 p-4" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-gray-200 p-4" />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button onClick={saveProfile} className="flex-1 rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white">Save profile</button>
                <button onClick={() => setEditing(false)} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-[#141B34]">Discard</button>
              </div>
            </motion.div>
          )}
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Birthday perks</h3>
              <p className="text-sm text-[#6B6B6B]">Add your birthday to unlock special discounts from us.</p>
            </div>
            <div className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">Premium</div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="flex-1 rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-3"
              />
              <button
                className="rounded-2xl bg-[#141B34] px-6 py-3 text-sm font-semibold text-white"
                onClick={() => alert("Birthday saved (placeholder)")}
              >
                Save birthday
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Recent orders</h3>
              <p className="text-sm text-[#6B6B6B]">Track your latest order activity and status.</p>
            </div>
          </div>
          <div className="space-y-3">
            {orders.map((o) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] bg-white p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{o.date}</p>
                    <p className="text-lg font-semibold text-[#141B34]">{o.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#A4A4A4]">Order ID</p>
                    <p className="text-sm font-semibold">{o.id}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#6B6B6B]">
                  <p>{o.total}</p>
                  <span className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">{o.rating ? `${o.rating}★` : "No rating"}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Update address</h3>
              <p className="text-sm text-[#6B6B6B]">Keep your current delivery address up to date.</p>
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-[#6B6B6B] mb-4">Your default address is used for checkout every time unless changed.</p>
            <Link href="/customer/address" className="inline-flex rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white">
              Manage addresses
            </Link>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Rate & Feedback</h3>
              <p className="text-sm text-[#6B6B6B]">Review an order and help us improve your experience.</p>
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <select
              className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-3 mb-4"
              onChange={(e) => setSelectedOrder(e.target.value)}
              value={selectedOrder ?? ""}
            >
              <option value="">Choose an order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} — {o.id}
                </option>
              ))}
            </select>
            <div className="mb-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="rounded-full p-3"
                >
                  {selectedRating >= star ? <StarIcon /> : <GreyedStarIcon />}
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-4 text-sm text-[#141B34]"
              placeholder="Write your feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white"
                onClick={() => alert("Feedback submitted (placeholder)")}
              >
                Submit feedback
              </button>
              <button
                className="flex-1 rounded-2xl bg-[#4D4D4D] py-3 text-sm font-semibold text-white"
                onClick={() => {
                  setFeedback("");
                  setSelectedOrder(null);
                  setSelectedRating(0);
                }}
              >
                Clear form
              </button>
            </div>
          </div>
        </section>

        <div className="mb-20">
          <button onClick={logout} className="w-full rounded-2xl bg-[#E53E3E] py-4 text-sm font-semibold text-white shadow-sm">
            Logout
          </button>
        </div>
      </div>
    </motion.div>
  );
}
