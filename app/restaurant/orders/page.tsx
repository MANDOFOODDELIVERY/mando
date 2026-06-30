"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RestaurantOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customer: string;
  totalAmount: number;
  createdAt: string;
  items: { id: string; name: string; quantity: number }[];
};

const FILTERS = ["All", "Awaiting decision", "Preparing", "Ready for pickup", "Completed"];

function getStatusLabel(status: string) {
  if (status === "awaiting_restaurant") return "Awaiting decision";
  if (status === "ready_for_pickup") return "Ready for pickup";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function RestaurantOrders() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/orders`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/restaurant/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load restaurant orders");

      const data = (await response.json()) as { orders: RestaurantOrder[] };
      setOrders(data.orders);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load restaurant orders",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const visibleOrders = useMemo(
    () =>
      activeFilter === "All"
        ? orders
        : orders.filter((order) => getStatusLabel(order.status) === activeFilter),
    [activeFilter, orders],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/restaurant/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Orders</span>
          </Link>
        </header>

        <section className="mb-5 overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                  activeFilter === filter
                    ? "bg-[#141B34] text-white"
                    : "border border-gray-200 bg-white text-[#6B6B6B]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {loading ? (
            <OrdersSkeleton />
          ) : (
            visibleOrders.map((order) => (
              <div key={order.id} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#A4A4A4]">{formatDate(order.createdAt)}</p>
                    <h2 className="mt-2 text-lg font-semibold text-[#141B34]">{order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-[#6B6B6B]">{order.customer}</p>
                  </div>
                  <span className="rounded-2xl bg-[#FFF7E0] px-3 py-2 text-xs font-semibold text-[#141B34]">
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="mt-4 rounded-2xl bg-[#F7F7F7] p-4">
                  <p className="text-sm font-semibold text-[#141B34]">
                    {order.items.map((item) => `${item.name} x${item.quantity}`).join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-[#6B6B6B]">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            ))
          )}

          {!loading && visibleOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
              No orders in this category.
            </div>
          )}
        </section>
      </div>

      <RestaurantBottomNav />
    </motion.div>
  );
}

function OrdersSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-[28px] border border-gray-200 bg-white"
        />
      ))}
    </>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
