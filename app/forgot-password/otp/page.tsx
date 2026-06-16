"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CautionIcon } from "../../../components/svgs/DefaultIcons";

const OTP_LENGTH = 6;

export default function ForgotPasswordOtp() {
  const router = useRouter();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [values, setValues] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otp = useMemo(() => values.join(""), [values]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value.length === 1 && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (otp.length !== OTP_LENGTH || values.some((value) => value === "")) {
      setError("Please enter the 6-digit verification code.");
      setLoading(false);
      return;
    }

    try {
      // frontend-only demo flow
      router.push("/forgot-password/reset");
    } catch (err) {
      setError("Unable to verify code. Please try again.");
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
        <h1 className="font-bold text-[24px] text-black">Enter Verification Code</h1>
        <p className="text-[16px] text-[#A4A4A4]">
          We sent a 6-digit code to your email. Enter it below to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              <span className="flex items-center gap-2">
                <CautionIcon color="#E53935" size={14} />
                {error}
              </span>
            </div>
          )}

          <div className="grid grid-cols-6 gap-3">
            {values.map((value, index) => (
              <input
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-16 w-full rounded-xl border border-[#E9EAEB] text-center text-xl font-semibold focus:border-[#DFB400] focus:outline-none focus:ring-2 focus:ring-[#DFB400]/20"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold hover:bg-[#C9A300] transition disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify code"}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/forgot-password" className="text-sm text-[#A4A4A4] hover:text-[#DFB400]">
            Edit email address
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
