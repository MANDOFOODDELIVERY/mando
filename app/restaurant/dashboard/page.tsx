"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiBell, FiLogOut, FiRefreshCw } from "react-icons/fi";
import ConfirmationModal from "@/components/ConfirmationModal";
import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import { MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import useAuthStore from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RestaurantOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  status: "awaiting_restaurant" | "preparing" | "ready_for_pickup" | string;
  totalAmount: number;
  createdAt: string;
  address: string;
  items: { id: string; name: string; quantity: number; components: string[] }[];
};

type RestaurantDashboardData = {
  restaurant: {
    name: string;
    serviceArea: { name: string; city: string; state: string };
  };
  payout: { availableAmount: number };
  orders: RestaurantOrder[];
  stats: {
    awaitingDecisionCount: number;
    preparingCount: number;
    readyForPickupCount: number;
  };
};

export default function RestaurantDashboard() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const logoutAuth = useAuthStore((s) => s.logout);
  const [dashboard, setDashboard] = useState<RestaurantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<RestaurantOrder | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/dashboard`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/restaurant/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load restaurant dashboard");

      setDashboard((await response.json()) as RestaurantDashboardData);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load restaurant dashboard",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const runOrderAction = async (
    key: string,
    endpoint: string,
    body?: Record<string, unknown>,
  ) => {
    setBusyAction(key);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "Unable to update order");

      showToast("Order updated successfully", "success");
      await loadDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update order", "error");
    } finally {
      setBusyAction(null);
      setRejectingOrder(null);
    }
  };

  async function logout() {
    setLoggingOut(true);

    try {
      await logoutAuth();
      localStorage.clear();
      showToast("Logged out successfully", "success");
      router.push("/restaurant/login");
    } catch {
      showToast("Logout failed. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const orders = dashboard?.orders ?? [];
  const awaitingOrders = orders.filter((order) => order.status === "awaiting_restaurant");
  const preparingOrders = orders.filter((order) => order.status === "preparing");
  const readyOrders = orders.filter((order) => order.status === "ready_for_pickup");
  const area = dashboard?.restaurant.serviceArea;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#A4A4A4]">Restaurant dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
              {loading ? "Loading restaurant..." : dashboard?.restaurant.name ?? "Restaurant"}
            </h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              {area ? `${area.name}, ${area.city}` : "Checking service area"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/restaurant/notifications"
              aria-label="Notifications"
              title="Notifications"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#141B34] shadow-sm ring-1 ring-gray-200"
            >
              <FiBell className="h-5 w-5" />
            </Link>
            <button
              type="button"
              aria-label="Refresh restaurant dashboard"
              title="Refresh"
              disabled={loading}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141B34] text-white disabled:opacity-60"
              onClick={() => void loadDashboard()}
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => setShowLogoutConfirmation(true)}
            >
              <FiLogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Awaiting decision"
            value={`${dashboard?.stats.awaitingDecisionCount ?? 0}`}
            helper="Accept or reject quickly"
            icon={<TimerIcon />}
          />
          <StatCard
            label="Available payout"
            value={formatCurrency(dashboard?.payout.availableAmount ?? 0)}
            helper="Admin reviews every payout request"
            icon={<MoneyIcon />}
          />
        </section>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <OrderSection
              title="Needs your decision"
              subtitle="Rejecting an order will notify admin for follow-up."
              orders={awaitingOrders}
              emptyText="No new orders awaiting decision."
              busyAction={busyAction}
              action={(order) => (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busyAction === `${order.id}-reject`}
                    className="rounded-2xl border border-[#E53E3E] px-4 py-3 text-sm font-semibold text-[#E53E3E] disabled:opacity-60"
                    onClick={() => setRejectingOrder(order)}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busyAction === `${order.id}-accept`}
                    className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() =>
                      void runOrderAction(
                        `${order.id}-accept`,
                        `/restaurant/orders/${order.id}/accept`,
                      )
                    }
                  >
                    {busyAction === `${order.id}-accept` ? "Accepting..." : "Accept"}
                  </button>
                </div>
              )}
            />

            <OrderSection
              title="Preparing now"
              subtitle="Mark ready only when rider can pick it up."
              orders={preparingOrders}
              emptyText="No orders in preparation."
              busyAction={busyAction}
              action={(order) => (
                <button
                  type="button"
                  disabled={busyAction === `${order.id}-ready`}
                  className="mt-4 w-full rounded-2xl bg-[#DFB400] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() =>
                    void runOrderAction(
                      `${order.id}-ready`,
                      `/restaurant/orders/${order.id}/ready`,
                    )
                  }
                >
                  {busyAction === `${order.id}-ready` ? "Updating..." : "Ready for pickup"}
                </button>
              )}
            />

            <OrderSection
              title="Ready for pickup"
              subtitle="These orders are waiting for rider assignment."
              orders={readyOrders}
              emptyText="No orders ready for pickup."
              busyAction={busyAction}
            />
          </>
        )}
      </div>

      <RestaurantBottomNav />

      <ConfirmationModal
        open={Boolean(rejectingOrder)}
        title="Reject order?"
        description="Admin will be notified so they can follow up with the customer and restaurant."
        confirmLabel="Reject"
        confirming={rejectingOrder ? busyAction === `${rejectingOrder.id}-reject` : false}
        danger
        onClose={() => setRejectingOrder(null)}
        onConfirm={() => {
          if (!rejectingOrder) return;
          void runOrderAction(
            `${rejectingOrder.id}-reject`,
            `/restaurant/orders/${rejectingOrder.id}/reject`,
            {
              reasonCode: "combo_unavailable",
              note: "Combo unavailable at restaurant.",
            },
          );
        }}
      />

      <ConfirmationModal
        open={showLogoutConfirmation}
        title="Log out?"
        description="You will need to log in again before managing restaurant orders."
        confirmLabel="Logout"
        confirming={loggingOut}
        danger
        onClose={() => setShowLogoutConfirmation(false)}
        onConfirm={() => {
          setShowLogoutConfirmation(false);
          void logout();
        }}
      />
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#6B6B6B]">{label}</p>
          <p className="mt-3 text-3xl font-bold text-[#141B34]">{value}</p>
        </div>
        <div className="rounded-3xl bg-[#FFF7E0] p-3">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-[#A4A4A4]">{helper}</p>
    </div>
  );
}

function OrderSection({
  title,
  subtitle,
  orders,
  emptyText,
  action,
}: {
  title: string;
  subtitle: string;
  orders: RestaurantOrder[];
  emptyText: string;
  busyAction: string | null;
  action?: (order: RestaurantOrder) => React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#141B34]">{title}</h2>
        <p className="text-sm text-[#6B6B6B]">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
            {emptyText}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#A4A4A4]">{formatDate(order.createdAt)}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#141B34]">{order.orderNumber}</h3>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{order.customer} - {order.address}</p>
                </div>
                <p className="text-sm font-semibold text-[#141B34]">{formatCurrency(order.totalAmount)}</p>
              </div>
              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-[#F7F7F7] p-4">
                    <p className="font-semibold text-[#141B34]">{item.name} x{item.quantity}</p>
                    <div className="mt-2 space-y-1">
                      {item.components.map((component) => (
                        <p key={component} className="text-sm text-[#6B6B6B]">{component}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {action?.(order)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-44 animate-pulse rounded-[28px] border border-gray-200 bg-white"
        />
      ))}
    </div>
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
