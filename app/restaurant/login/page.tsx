"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CautionIcon, EyeIcon, EyeOffIcon, PasswordIcon } from "@/components/svgs/DefaultIcons";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function RestaurantLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const showToast = useToastStore((s) => s.showToast);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.email) {
      setFieldErrors((prev) => ({ ...prev, email: "Restaurant email is required" }));
      return;
    }

    if (!formData.password) {
      setFieldErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to sign in as restaurant");
      }

      setAuth(result);
      showToast("Logged in as restaurant", "success");
      router.push("/restaurant/dashboard");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to sign in as restaurant",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6"
    >
      <div className="w-full max-w-[420px] rounded-[32px] border border-[#E9EAEB] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <h1 className="text-2xl font-bold text-[#141B34]">Restaurant login</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">Access orders, preparation status, and payout requests.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#141B34]">Restaurant email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter restaurant email"
              className="w-full rounded-2xl border border-[#E9EAEB] bg-[#F9F9F9] px-4 py-4 text-sm text-[#141B34] focus:outline-none focus:ring-2 focus:ring-[#DFB400]"
            />
            {fieldErrors.email && <FieldError message={fieldErrors.email} />}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#141B34]">Password</label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                <PasswordIcon />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
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
            {fieldErrors.password && <FieldError message={fieldErrors.password} />}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#101828] disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
      <CautionIcon color="#E53935" size={14} />
      <span>{message}</span>
    </div>
  );
}
