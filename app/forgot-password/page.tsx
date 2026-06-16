"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CautionIcon } from "../../components/svgs/DefaultIcons";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // frontend-only flow: pretend OTP is sent
      router.push("/forgot-password/otp");
    } catch (err) {
      setError("Unable to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white p-6 flex items-center justify-center"
    >
      <div className="w-full max-w-[90vw] md:max-w-md">
        <h1 className="font-bold text-[24px] text-black">Forgot Password</h1>
        <p className="text-[16px] text-[#A4A4A4]">
          Enter your email below and we’ll send a one-time verification code.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <span className="flex items-center gap-2">
                <CautionIcon color="#E53935" size={14} />
                {error}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-4 border border-[#E9EAEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFB400] text-black placeholder-[#A4A4A4]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold mt-2 hover:bg-[#C9A300] transition disabled:opacity-50"
          >
            {loading ? "Sending code..." : "Send verification code"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-[#A4A4A4] hover:text-[#DFB400]">
            Back to login
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
