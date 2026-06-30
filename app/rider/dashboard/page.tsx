"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiRefreshCw } from "react-icons/fi";
import ConfirmationModal from "@/components/ConfirmationModal";
import RiderBottomNav from "@/components/RiderBottomNav";
import { MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";
import useAuthStore from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RiderDelivery = {
  id: string;
  status: string;
  deliveryFeeAmount: number;
  riderEarningAmount: number;
  deliveredAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    createdAt: string;
    delivery: {
      recipientName: string;
      phone: string;
      streetAddress: string;
      serviceArea: string;
    };
  };
  restaurant: {
    name: string;
    streetAddress: string;
  };
};

type RiderDashboardData = {
  rider: {
    profile: {
      fullName: string;
    };
    rider: {
      availabilityStatus: "offline" | "available" | "busy" | "suspended";
      serviceArea: {
        name: string;
        city: string;
        state: string;
      };
    };
  };
  stats: {
    totalEarningsAmount: number;
    activeDeliveryCount: number;
    availablePickupCount: number;
    completedDeliveryCount: number;
  };
  availablePickups: RiderDelivery[];
  activeDeliveries: RiderDelivery[];
  recentDeliveries: RiderDelivery[];
};

export default function RiderDashboard() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const logoutAuth = useAuthStore((s) => s.logout);
  const [dashboard, setDashboard] = useState<RiderDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/rider/dashboard`, {
        credentials: "include",
      });

      if (response.status === 401 || response.status === 403) {
        router.push("/rider/login");
        return;
      }

      if (!response.ok) throw new Error("Unable to load rider dashboard");

      setDashboard((await response.json()) as RiderDashboardData);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to load rider dashboard",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const runAction = async (key: string, request: () => Promise<Response>) => {
    setBusyAction(key);

    try {
      const response = await request();
      const body = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to update delivery");
      }

      showToast(body?.message ?? "Rider action completed", "success");
      await loadDashboard();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to update delivery",
        "error",
      );
    } finally {
      setBusyAction(null);
    }
  };

  const updateAvailability = async () => {
    if (!dashboard || dashboard.rider.rider.availabilityStatus === "busy") {
      showToast("Complete your active delivery before changing availability.", "error");
      return;
    }

    const nextStatus =
      dashboard.rider.rider.availabilityStatus === "available"
        ? "offline"
        : "available";

    await runAction("availability", () =>
      fetch(`${API_BASE_URL}/rider/availability`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ availabilityStatus: nextStatus }),
      }),
    );
  };

  const postOrderAction = (orderId: string, action: "accept" | "picked-up" | "delivered") =>
    runAction(`${orderId}-${action}`, () =>
      fetch(`${API_BASE_URL}/rider/orders/${orderId}/${action}`, {
        method: "POST",
        credentials: "include",
      }),
    );

  async function logout() {
    setLoggingOut(true);

    try {
      await logoutAuth();

      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      showToast("Logged out successfully", "success");
      router.push("/rider/login");
    } catch {
      showToast("Logout failed. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const area = dashboard?.rider.rider.serviceArea;

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
            <p className="text-sm font-semibold text-[#A4A4A4]">Rider dashboard</p>
            <h1 className="mt-2 text-2xl font-bold text-[#141B34]">
              {loading ? "Loading route..." : `Active orders in ${area?.name ?? "your area"}`}
            </h1>
            {dashboard && (
              <p className="mt-1 text-sm text-[#6B6B6B]">
                {dashboard.rider.profile.fullName} - {area?.city}, {area?.state}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dashboard ? (
              <button
                type="button"
                disabled={loggingOut}
                className="rounded-2xl bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => setShowLogoutConfirmation(true)}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <button
                type="button"
                className="rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white"
                onClick={() => router.push("/rider/login")}
              >
                Login
              </button>
            )}
            <div className="rounded-3xl bg-[#FFF7E0] p-3">
              <TimerIcon />
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#6B6B6B]">Total earnings</p>
                <p className="mt-2 text-3xl font-bold text-[#141B34]">
                  {formatCurrency(dashboard?.stats.totalEarningsAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-3xl bg-[#F7F4E3] p-3">
                <MoneyIcon />
              </div>
            </div>
            <p className="mt-4 text-sm text-[#A4A4A4]">
              {dashboard?.stats.completedDeliveryCount ?? 0} completed deliveries
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[#6B6B6B]">Assigned jurisdiction</p>
                <p className="mt-2 text-lg font-semibold text-[#141B34]">
                  {area ? area.name : "Loading..."}
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-[#6B6B6B]">
                  {dashboard?.rider.rider.availabilityStatus ?? "checking"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Refresh orders"
                  title="Refresh orders"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141B34] text-white transition hover:bg-[#27304F] focus:outline-none focus:ring-2 focus:ring-[#DFB400] focus:ring-offset-2"
                  onClick={() => void loadDashboard()}
                >
                  <FiRefreshCw className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={busyAction === "availability" || loading}
                  className="rounded-2xl border border-[#141B34] px-4 py-3 text-sm font-semibold text-[#141B34]"
                  onClick={() => void updateAvailability()}
                >
                  {dashboard?.rider.rider.availabilityStatus === "available"
                    ? "Go offline"
                    : "Go online"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <DeliverySection
              title="Available pickups"
              subtitle="Ready orders in your assigned service area."
              deliveries={dashboard?.availablePickups ?? []}
              emptyText="No ready pickups in your area yet."
              action={(delivery) => ({
                label: "Accept delivery",
                key: `${delivery.order.id}-accept`,
                onClick: () => postOrderAction(delivery.order.id, "accept"),
              })}
              busyAction={busyAction}
            />

            <DeliverySection
              title="Active deliveries"
              subtitle="Orders currently assigned to you."
              deliveries={dashboard?.activeDeliveries ?? []}
              emptyText="You have no active deliveries."
              action={(delivery) =>
                delivery.status === "accepted"
                  ? {
                      label: "Mark picked up",
                      key: `${delivery.order.id}-picked-up`,
                      onClick: () => postOrderAction(delivery.order.id, "picked-up"),
                    }
                  : {
                      label: "Mark delivered",
                      key: `${delivery.order.id}-delivered`,
                      onClick: () => postOrderAction(delivery.order.id, "delivered"),
                    }
              }
              busyAction={busyAction}
            />

            <DeliverySection
              title="Activity log"
              subtitle="Recently completed deliveries."
              deliveries={dashboard?.recentDeliveries ?? []}
              emptyText="No completed deliveries yet."
              busyAction={busyAction}
            />
          </>
        )}
      </div>
      <RiderBottomNav />
      <ConfirmationModal
        open={showLogoutConfirmation}
        title="Log out?"
        description="You will need to log in again before viewing your rider dashboard or accepting deliveries."
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

function DeliverySection({
  title,
  subtitle,
  deliveries,
  emptyText,
  action,
  busyAction,
}: {
  title: string;
  subtitle: string;
  deliveries: RiderDelivery[];
  emptyText: string;
  action?: (delivery: RiderDelivery) => {
    label: string;
    key: string;
    onClick: () => void;
  };
  busyAction: string | null;
}) {
  return (
    <section className="mb-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#141B34]">{title}</h2>
        <p className="text-sm text-[#6B6B6B]">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {deliveries.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
            {emptyText}
          </div>
        ) : (
          deliveries.map((delivery) => {
            const deliveryAction = action?.(delivery);

            return (
              <div
                key={delivery.id}
                className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">
                      {delivery.order.delivery.streetAddress}, {delivery.order.delivery.serviceArea}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[#141B34]">
                      {delivery.restaurant.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#A4A4A4]">
                      Order {delivery.order.orderNumber} - {delivery.order.delivery.recipientName}
                    </p>
                    <p className="mt-1 text-sm text-[#6B6B6B]">
                      {delivery.order.delivery.phone}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-[#6B6B6B]">Fee</p>
                    <p className="text-lg font-semibold text-[#141B34]">
                      {formatCurrency(delivery.deliveryFeeAmount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold capitalize text-[#A4A4A4]">
                      {delivery.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex w-fit rounded-2xl bg-[#F7F4E3] px-4 py-2 text-sm font-semibold text-[#141B34]">
                    {delivery.deliveredAt
                      ? `Completed ${formatDate(delivery.deliveredAt)}`
                      : `Placed ${formatDate(delivery.order.createdAt)}`}
                  </span>
                  {deliveryAction && (
                    <button
                      type="button"
                      disabled={busyAction === deliveryAction.key}
                      className="rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#A4A4A4]"
                      onClick={deliveryAction.onClick}
                    >
                      {busyAction === deliveryAction.key ? "Updating..." : deliveryAction.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })
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
          className="h-40 animate-pulse rounded-[28px] border border-gray-200 bg-white"
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
    year: "numeric",
  }).format(new Date(value));
}
