"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CautionIcon, PasswordIcon, EyeIcon, EyeOffIcon } from "../../components/svgs/DefaultIcons";

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setFieldError = (field: string, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    const t = window.setTimeout(() => {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }, 3000);
    return t;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // clear field error immediately on change
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const passwordCriteria = (pw: string) => ({
    length: pw.length >= 6,
    number: /\d/.test(pw),
    uppercase: /[A-Z]/.test(pw),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic validation per-field
    if (!formData.fullName) {
      setFieldError("fullName", "Full name is required");
    }
    if (!formData.email) {
      setFieldError("email", "Email is required");
    }
    if (!formData.password) {
      setFieldError("password", "Password is required");
    }

    if (!agree) {
      setFieldError("terms", "You must agree to MANDO's terms and conditions");
      setLoading(false);
      return;
    }

    const criteria = passwordCriteria(formData.password);
    if (!criteria.length || !criteria.number || !criteria.uppercase) {
      setFieldError("password", "Password does not meet requirements");
      setLoading(false);
      return;
    }

    if (!formData.fullName || !formData.email || !formData.password) {
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual API call
      console.log("Signup attempt:", formData);
      // router.push("/dashboard");
    } catch (err) {
      setError("Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const crit = passwordCriteria(formData.password);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white p-6 flex items-center justify-center"
    >
      <div className="w-full max-w-[90vw]">
        <h1 className="font-bold text-[24px] text-black">Create Account</h1>
        <p className="text-[#A4A4A4] text-[16px]">
          Join and start ordering delicious meals around you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full p-4 border border-[#E9EAEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFB400] text-black placeholder-[#A4A4A4]"
            />
            {fieldErrors.fullName && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <CautionIcon color="#E53935" size={14} />
                <span>{fieldErrors.fullName}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full p-4 border border-[#E9EAEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DFB400] text-black placeholder-[#A4A4A4]"
            />
            {fieldErrors.email && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <CautionIcon color="#E53935" size={14} />
                <span>{fieldErrors.email}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <PasswordIcon />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
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

            {/* Live validation checker */}
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <CautionIcon color={crit.length ? "#9EA2AD" : "#E53935"} size={14} />
                <span className={crit.length ? "text-[#6B7280]" : "text-red-600"}>
                  At least 6 characters
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CautionIcon color={crit.number ? "#9EA2AD" : "#E53935"} size={14} />
                <span className={crit.number ? "text-[#6B7280]" : "text-red-600"}>
                  Contains a number
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CautionIcon color={crit.uppercase ? "#9EA2AD" : "#E53935"} size={14} />
                <span className={crit.uppercase ? "text-[#6B7280]" : "text-red-600"}>
                  Contains an uppercase letter
                </span>
              </div>
            </div>

            {fieldErrors.password && (
              <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                <CautionIcon color="#E53935" size={14} />
                <span>{fieldErrors.password}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="agree" className="text-sm text-[#6B7280]">
              I agree to MANDO's{' '}
              <Link href="/terms" className="font-medium text-black hover:text-[#DFB400]">
                terms and conditions
              </Link>
            </label>
          </div>
          {fieldErrors.terms && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
              <CautionIcon color="#E53935" size={14} />
              <span>{fieldErrors.terms}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !agree}
            className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold mt-6 hover:bg-[#C9A300] transition disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#A4A4A4]">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-black hover:text-[#DFB400]">
              Login
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
