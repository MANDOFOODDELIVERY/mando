"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SavedAddress = {
  id: string;
  isDefault: boolean;
};

type CreateOrderResponse = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
  };
};

type RoutePayInitiateResponse = {
  payment: {
    provider: "routepay";
    redirectUrl: string;
    transactionReference: string | null;
    merchantReference: string;
  };
};

export default function PaymentPage() {
  const router = useRouter();
  const auth = useAuthStore((s) => s.auth);
  const authLoading = useAuthStore((s) => s.loading);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const items = useCartStore((s) => s.items);
  const setCheckoutOrder = useCartStore((s) => s.setCheckoutOrder);
  const showToast = useToastStore((s) => s.showToast);
  const [checkingRequirements, setCheckingRequirements] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreateOrderResponse["order"] | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkPaymentRequirements() {
      try {
        const currentAuth = await fetchCurrentUser();

        if (!mounted) return;

        if (!currentAuth) {
          showToast("Please log in to continue to payment", "error");
          router.replace("/login");
          return;
        }

        if (items.length === 0) {
          showToast("Your cart is empty", "error");
          router.replace("/customer/cart");
          return;
        }

        const addressResponse = await fetch(`${API_BASE_URL}/customer/addresses`, {
          credentials: "include",
        });

        if (!mounted) return;

        if (!addressResponse.ok) {
          showToast("Please add a delivery address", "error");
          router.replace("/customer/cart/change-address");
          return;
        }

        const addressData = (await addressResponse.json()) as { addresses: SavedAddress[] };
        const hasAddress = addressData.addresses.some((address) => address.isDefault) || addressData.addresses.length > 0;

        if (!hasAddress) {
          showToast("Please add a delivery address", "error");
          router.replace("/customer/cart/change-address");
          return;
        }

        if (!currentAuth.profile?.phone) {
          showToast("Please add your phone number", "error");
          router.replace("/customer/cart");
          return;
        }
      } catch {
        if (!mounted) return;

        showToast("Please complete your checkout details", "error");
        router.replace("/customer/cart");
      } finally {
        if (mounted) setCheckingRequirements(false);
      }
    }

    checkPaymentRequirements();

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, items.length, router, showToast]);

  async function createOrder() {
    if (createdOrder) return createdOrder;

    setCreatingOrder(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentMethod: "card",
          items: items.map((item) => ({
            comboId: item.id,
            quantity: item.quantity,
            components: item.components?.map((component) => ({
              menuItemId: component.menuItemId,
              quantity: component.quantity,
            })),
          })),
        }),
      });

      const data = (await response.json()) as
        | CreateOrderResponse
        | { message?: string };

      if (!response.ok || !("order" in data)) {
        const message = "message" in data ? data.message : undefined;

        throw new Error(message ?? "Unable to create order");
      }

      setCreatedOrder(data.order);
      setCheckoutOrder(data.order);
      showToast(`Order ${data.order.orderNumber} created`, "success");

      return data.order;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to create order", "error");
      return null;
    } finally {
      setCreatingOrder(false);
    }
  }

  async function confirmPayment() {
    const order = await createOrder();

    if (!order) return;

    setStartingCheckout(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/payments/routepay/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId: order.id,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | RoutePayInitiateResponse
        | { message?: string }
        | null;

      if (!response.ok || !data || !("payment" in data)) {
        throw new Error(getResponseMessage(data) ?? "Unable to start RoutePay checkout");
      }

      showToast("Redirecting to RoutePay checkout", "success");
      window.location.assign(data.payment.redirectUrl);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to start RoutePay checkout",
        "error",
      );
      setStartingCheckout(false);
    }
  }

  if (!auth || checkingRequirements) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">
          {authLoading || checkingRequirements ? "Checking payment details..." : "Redirecting..."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/customer/cart" className="inline-flex items-center gap-2 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="font-medium">Back</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200 space-y-6">
          <div>
            <p className="text-sm text-[#A4A4A4]">Payment method</p>
            <h1 className="text-[24px] font-semibold mt-2">RoutePay checkout</h1>
          </div>

          <div className="space-y-4 text-[#6B6B6B]">
            <p>
              We&apos;ll create your order, then send you to RoutePay&apos;s hosted
              checkout page to complete payment securely.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-[#A4A4A4]">Amount</p>
              <p className="mt-2 text-2xl font-semibold text-[#141B34]">
                ₦{items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          type="button"
          disabled={creatingOrder || startingCheckout}
          onClick={confirmPayment}
          className="w-full rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingOrder || startingCheckout ? "Starting checkout..." : "Pay with RoutePay"}
        </button>
      </div>
    </div>
  );
}

function getResponseMessage(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  return null;
}
