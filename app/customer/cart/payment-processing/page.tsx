"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useCartStore from "@/store/cartStore";

export default function PaymentProcessingPage() {
  const router = useRouter();
  const checkoutOrder = useCartStore((s) => s.checkoutOrder);
  const [queryOrderId, setQueryOrderId] = useState<string | null>(null);
  const orderId = queryOrderId ?? checkoutOrder?.id;
  const orderNumber = checkoutOrder?.orderNumber;

  useEffect(() => {
    setQueryOrderId(new URLSearchParams(window.location.search).get("orderId"));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!orderId) router.replace("/customer/cart/payment");
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [orderId, router]);

  return (
    <div className="p-6 min-h-screen flex flex-col justify-center items-center text-center">
      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-[24px] font-semibold mb-4">Payment confirmation pending</h1>
        <p className="text-[#6B6B6B] mb-2">
          We&apos;ve returned from checkout, but this order still needs payment
          verification before it can be sent to the restaurant.
        </p>
        {orderNumber && (
          <p className="mb-6 text-sm font-semibold text-[#141B34]">
            Order {orderNumber}
          </p>
        )}
        {!orderNumber && <div className="mb-6" />}
        <div className="h-2 w-full rounded-full bg-[#F3F3F3] overflow-hidden">
          <div className="h-full w-[80%] bg-[#DFB400] animate-pulse" />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/customer/orders"
            className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white"
          >
            View order
          </Link>
          <Link
            href="/customer/cart"
            className="rounded-2xl border border-[#141B34] px-4 py-3 text-sm font-semibold text-[#141B34]"
          >
            Back to cart
          </Link>
        </div>
      </div>
    </div>
  );
}
