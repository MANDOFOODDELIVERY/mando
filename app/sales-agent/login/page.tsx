"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CautionIcon, PasswordIcon, EyeIcon, EyeOffIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

export default function SalesAgentLogin() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [formData, setFormData] = useState({ code: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.code) {
      setFieldErrors((prev) => ({ ...prev, code: "Agent code is required" }));
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setFieldErrors((prev) => ({ ...prev, password: "Password is required" }));
      setLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    showToast("Logged in as sales agent", "success");
    router.push("/sales-agent/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#F8F8F8] p-6 flex items-center justify-center"
    >
      <div className="w-full max-w-[420px] rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-[#E9EAEB]">
        <h1 className="text-2xl font-bold text-[#141B34]">Agent login</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">Use your assigned agent code and password to access your dashboard.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-[#141B34] mb-2">Agent code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Enter your agent code"
              className="w-full rounded-2xl border border-[#E9EAEB] bg-[#F9F9F9] px-4 py-4 text-sm text-[#141B34] focus:outline-none focus:ring-2 focus:ring-[#DFB400]"
            />
            {fieldErrors.code && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <CautionIcon color="#E53935" size={14} />
                <span>{fieldErrors.code}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#141B34] mb-2">Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <PasswordIcon />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-[#E9EAEB] bg-[#F9F9F9] px-4 py-4 pl-12 pr-12 text-sm text-[#141B34] focus:outline-none focus:ring-2 focus:ring-[#DFB400]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <CautionIcon color="#E53935" size={14} />
                <span>{fieldErrors.password}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#101828]"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
