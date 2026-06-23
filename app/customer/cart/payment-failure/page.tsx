"use client";

import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <div className="p-6 min-h-screen flex items-center justify-center bg-[#F9F9F9]">
      <div className="max-w-md w-full rounded-3xl bg-white p-8 shadow-sm border border-gray-200 text-center">
        <h1 className="text-[24px] font-semibold mb-4">Sorry, your payment failed</h1>
        <p className="text-[#6B6B6B] mb-8">Your transaction didn't go through, would you like to try again?</p>
        <Link href="/customer/cart" className="inline-flex w-full justify-center rounded-xl bg-[#DFB400] py-4 text-black font-semibold">
          Try payment again
        </Link>
      </div>
    </div>
  );
}
