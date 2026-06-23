"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentProcessingPage() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const paymentSuccess = Math.random() > 0.4;
      router.push(paymentSuccess ? "/customer/cart/payment-success" : "/customer/cart/payment-failure");
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <div className="p-6 min-h-screen flex flex-col justify-center items-center text-center">
      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-[24px] font-semibold mb-4">Processing payment</h1>
        <p className="text-[#6B6B6B] mb-6">Please wait a few minutes while your payment is processed.</p>
        <div className="h-2 w-full rounded-full bg-[#F3F3F3] overflow-hidden">
          <div className="h-full w-[80%] bg-[#DFB400] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
