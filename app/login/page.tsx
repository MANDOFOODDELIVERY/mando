"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CautionIcon, PasswordIcon, EyeIcon, EyeOffIcon } from "../../components/svgs/DefaultIcons";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);

  const setFieldError = (field: string, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    window.setTimeout(() => {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    if (!formData.email) {
      setFieldError("email", "Email is required");
      setLoading(false);
      return;
    }

    if (forgotPasswordMode) {
      if (!formData.email.includes("@")) {
        setFieldError("email", "Please enter a valid email address");
        setLoading(false);
        return;
      }

      try {
        // frontend-only flow: send OTP and navigate
        router.push("/forgot-password/otp");
      } catch (err) {
        setError("Unable to send code. Please try again.");
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!formData.password) setFieldError("password", "Password is required");

    if (!formData.email || !formData.password) {
      setLoading(false);
      return;
    }

    const criteria = passwordCriteria(formData.password);
    if (!criteria.length || !criteria.number || !criteria.uppercase) {
      setFieldError("password", "Password does not meet requirements");
      setLoading(false);
      return;
    }

    try {
      // TODO: Replace with actual API call
      console.log("Login attempt:", formData);
      // router.push("/dashboard");
    } catch (err) {
      setError("Login failed. Please check your credentials.");
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
        <h1 className="font-bold text-[24px] text-black">
          {forgotPasswordMode ? "Forgot Password" : "Welcome Back"}
        </h1>
        <p className="text-[16px] text-[#A4A4A4]">
          {forgotPasswordMode
            ? "Enter your email to receive a verification code."
            : "Sign in to continue to your account"}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

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

          {!forgotPasswordMode && (
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
                  placeholder="Enter your password"
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
          )}

          <div className="text-right">
            {forgotPasswordMode ? (
              <button
                type="button"
                onClick={() => setForgotPasswordMode(false)}
                className="text-sm text-[#A4A4A4] hover:text-[#DFB400]"
              >
                Back to sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setForgotPasswordMode(true)}
                className="text-sm text-[#A4A4A4] hover:text-[#DFB400]"
              >
                Forgot password?
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold mt-6 hover:bg-[#C9A300] transition disabled:opacity-50"
          >
            {loading ? (forgotPasswordMode ? "Sending code..." : "Signing in...") : forgotPasswordMode ? "Send code" : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#A4A4A4]">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-black hover:text-[#DFB400]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
