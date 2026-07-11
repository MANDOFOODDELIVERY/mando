"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export default function PaymentProcessingPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const checkoutOrder = useCartStore((s) => s.checkoutOrder);
  const clearCart = useCartStore((s) => s.clear);
  const [queryOrderId, setQueryOrderId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState("Waiting for payment confirmation...");
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

  useEffect(() => {
    if (!orderId) return;

    const activeOrderId = orderId;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    async function pollOrderPayment() {
      attempts += 1;

      try {
        const response = await fetch(`${API_BASE_URL}/customer/orders/${activeOrderId}`, {
          credentials: "include",
        });

        if (!response.ok) throw new Error("Unable to check payment status");

        const body = (await response.json()) as {
          order: {
            id: string;
            orderNumber: string;
            status: string;
            payments: { status: string }[];
          };
        };

        if (cancelled) return;

        const latestPayment = body.order.payments[0];
        const paymentStatus = latestPayment?.status;

        if (paymentStatus === "verified" || body.order.status !== "pending_payment") {
          clearCart();
          showToast("Payment confirmed. Your order has been sent to the restaurant.", "success");

          const params = new URLSearchParams({ orderId: activeOrderId });
          const confirmedOrderNumber = body.order.orderNumber ?? orderNumber;
          if (confirmedOrderNumber) params.set("orderNumber", confirmedOrderNumber);

          router.replace(`/customer/cart/payment-success?${params.toString()}`);
          return;
        }

        if (["failed", "cancelled", "refunded"].includes(paymentStatus ?? "")) {
          showToast("Payment was not completed. Please try again.", "error");
          router.replace("/customer/cart/payment");
          return;
        }

        if (attempts >= maxAttempts) {
          setPollingStatus("Payment confirmation is taking longer than expected.");
          return;
        }

        setPollingStatus("Still waiting for payment confirmation...");
        window.setTimeout(pollOrderPayment, 2500);
      } catch {
        if (cancelled) return;

        if (attempts >= maxAttempts) {
          setPollingStatus("We could not confirm payment yet. Please check your orders shortly.");
          return;
        }

        window.setTimeout(pollOrderPayment, 2500);
      }
    }

    void pollOrderPayment();

    return () => {
      cancelled = true;
    };
  }, [clearCart, orderId, orderNumber, router, showToast]);

  return (
    <div className="p-6 min-h-screen flex flex-col justify-center items-center text-center">
      <div className="rounded-3xl bg-white p-6 shadow-lg border border-gray-200 max-w-md w-full">
        <h1 className="text-[24px] font-semibold mb-4">Payment confirmation pending</h1>
        <p className="text-[#6B6B6B] mb-2">
          We&apos;ve returned from checkout. We&apos;re confirming your payment
          automatically and will move you along once the update arrives.
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
        <p className="mt-4 text-xs font-semibold text-[#141B34]">{pollingStatus}</p>
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
