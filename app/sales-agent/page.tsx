import Link from "next/link";
import { motion } from "framer-motion";
import { CashBundleIcon, CopyIcon, MoneyIcon } from "@/components/svgs/DefaultIcons";

export default function SalesAgentEntry() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] p-6 flex items-center justify-center"
    >
      <div className="w-full max-w-[420px] rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-[#E9EAEB]">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#DFB400]">Sales Agent</p>
            <h1 className="mt-3 text-2xl font-bold text-[#141B34]">Agent dashboard access</h1>
          </div>
          <div className="rounded-3xl bg-[#FFF7E0] p-3">
            <MoneyIcon />
          </div>
        </div>

        <p className="text-sm leading-6 text-[#6B6B6B] mb-8">
          Use your company-provided credentials to sign in. This portal is for sales agents only, with access to earnings, referral links, and curated share campaigns.
        </p>

        <div className="grid gap-4 mb-8">
          <div className="rounded-3xl border border-[#E9EAEB] bg-[#FCFCFC] p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#DFB400] p-3 text-white">
                <CopyIcon />
              </div>
              <div>
                <p className="text-sm text-[#A4A4A4]">Unique share link</p>
                <p className="font-semibold text-[#141B34]">https://mando.app/r/agent-123</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-[#E9EAEB] bg-[#FCFCFC] p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#141B34] p-3 text-white">
                <CashBundleIcon />
              </div>
              <div>
                <p className="text-sm text-[#A4A4A4]">Curated campaigns</p>
                <p className="font-semibold text-[#141B34]">Sponsored combos ready to share</p>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/sales-agent/login"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#141B34] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#101828]"
        >
          Go to agent login
        </Link>
      </div>
    </motion.div>
  );
}
