"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CautionIcon, PasswordIcon, EyeIcon, EyeOffIcon } from "../../../components/svgs/DefaultIcons";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordCriteria = (pw: string) => ({
    length: pw.length >= 6,
    number: /\d/.test(pw),
    uppercase: /[A-Z]/.test(pw),
  });

  const criteria = passwordCriteria(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!password || !confirmPassword) {
      setError("Both password fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!criteria.length || !criteria.number || !criteria.uppercase) {
      setError("Password does not meet requirements");
      setLoading(false);
      return;
    }

    try {
      // frontend-only flow
      router.push("/login");
    } catch (err) {
      setError("Unable to reset password. Please try again.");
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
        <h1 className="font-bold text-[24px] text-black">Reset Password</h1>
        <p className="text-[16px] text-[#A4A4A4]">
          Enter a new password to access your account again.
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
            <label className="block text-sm font-medium text-black mb-2">New Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <PasswordIcon />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full p-4 pl-10 pr-10 border border-[#E9EAEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFB400] text-black placeholder-[#A4A4A4]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Confirm Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <PasswordIcon />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full p-4 pl-10 pr-10 border border-[#E9EAEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFB400] text-black placeholder-[#A4A4A4]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <CautionIcon color={criteria.length ? "#9EA2AD" : "#E53935"} size={14} />
              <span className={criteria.length ? "text-[#6B7280]" : "text-red-600"}>
                At least 6 characters
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CautionIcon color={criteria.number ? "#9EA2AD" : "#E53935"} size={14} />
              <span className={criteria.number ? "text-[#6B7280]" : "text-red-600"}>
                Contains a number
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CautionIcon color={criteria.uppercase ? "#9EA2AD" : "#E53935"} size={14} />
              <span className={criteria.uppercase ? "text-[#6B7280]" : "text-red-600"}>
                Contains an uppercase letter
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold mt-2 hover:bg-[#C9A300] transition disabled:opacity-50"
          >
            {loading ? "Resetting password..." : "Reset password"}
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
