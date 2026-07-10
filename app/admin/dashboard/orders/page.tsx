"use client";

import { useEffect, useState } from "react";
import { FaPhoneAlt } from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";
import {
  CancelIcon,
  DeliveredIcon,
  InProgressIcon,
  OrderIcon,
  PendingIcon,
} from "@/components/svgs/AdminIcons";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  customer: { name: string; phone: string | null };
  restaurant: { name: string; phone?: string | null };
  rider: { name: string; phone: string | null } | null;
  delivery: { streetAddress: string; serviceArea: string; status: string };
  payment: { method: string | null; status: string };
  timeline?: {
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }[];
  items?: {
    id: string;
    name: string;
    quantity: number;
    lineTotalAmount: number;
    components: { itemName: string; quantity: number }[];
  }[];
};

type OrdersResponse = {
  stats: {
    totalOrders: number;
    pending: number;
    inProgress: number;
    delivered: number;
    cancelled: number;
  };
  orders: AdminOrder[];
};

const AdminOrdersPage = () => {
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/orders`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load orders");
        return response.json() as Promise<OrdersResponse>;
      })
      .then((result) => {
        if (mounted) setData(result);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function openOrder(order: AdminOrder) {
    setSelectedOrder(order);

    const response = await fetch(`${API_BASE_URL}/admin/orders/${order.id}`, {
      credentials: "include",
    });

    if (!response.ok) return;

    const detail = (await response.json()) as { order: AdminOrder };
    setSelectedOrder(detail.order);
  }

  const overviewStats = [
    {
      id: 1,
      statTitle: "Total Orders",
      qty: String(data?.stats.totalOrders ?? 0),
      crease: "All orders",
      theme: "bg-[#FFFBEB]",
      increase: true,
      icon: <OrderIcon />,
      iconColor: "text-[#FE9A00]",
    },
    {
      id: 2,
      statTitle: "Pending",
      qty: String(data?.stats.pending ?? 0),
      crease: "Awaiting action",
      theme: "bg-[#F0FDF4]",
      increase: true,
      icon: <PendingIcon />,
      iconColor: "text-[#00C950]",
    },
    {
      id: 3,
      statTitle: "In Progress",
      qty: String(data?.stats.inProgress ?? 0),
      crease: "Preparing or delivery",
      theme: "bg-[#EFF6FF]",
      increase: true,
      icon: <InProgressIcon />,
      iconColor: "text-[#2B7FFF]",
    },
    {
      id: 4,
      statTitle: "Delivered",
      qty: String(data?.stats.delivered ?? 0),
      crease: "Completed orders",
      theme: "bg-[#FAF5FF]",
      increase: true,
      icon: <DeliveredIcon />,
      iconColor: "text-[#AD46FF]",
    },
    {
      id: 5,
      statTitle: "Cancelled",
      qty: String(data?.stats.cancelled ?? 0),
      crease: "Stopped orders",
      theme: "bg-[#FEF2F2]",
      increase: false,
      icon: <CancelIcon />,
      iconColor: "text-[#FF6467]",
    },
  ];

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[#101828]">Orders</h2>
      <p className="text-[11px] text-[#99A1AF]">
        {loading ? "Loading orders..." : "Manage and track all customer orders in real time."}
      </p>

      <div className="mt-10 grid grid-cols-5 gap-3 pr-8">
        {overviewStats.map((item) => (
          <StatsCard key={item.id} {...item} />
        ))}
      </div>

      <div className={`mt-10 grid gap-5 pr-8 ${selectedOrder ? "grid-cols-[1fr_320px]" : "grid-cols-1"}`}>
        <div className="space-y-3 rounded-lg bg-white p-3">
          <div className="grid grid-cols-9 gap-6 bg-gray-100 p-2 text-[10px] text-[#99A1AF]">
            <p>Order ID</p>
            <p>Customer</p>
            <p>Restaurant</p>
            <p>Rider</p>
            <p>Amount</p>
            <p>Payment</p>
            <p>Status</p>
            <p>Time & Date</p>
            <p>Action</p>
          </div>

          {(data?.orders ?? []).map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => void openOrder(order)}
              className={`grid w-full grid-cols-9 items-center gap-6 px-2 py-2 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${
                selectedOrder?.id === order.id ? "bg-[#FFF7E0]" : ""
              }`}
            >
              <p>{order.orderNumber}</p>
              <PersonCell name={order.customer.name} detail={order.customer.phone} color="bg-[#C27AFF]" />
              <PersonCell name={order.restaurant.name} color="bg-[#DFB400]" />
              <PersonCell name={order.rider?.name ?? "Unassigned"} detail={order.rider?.phone ?? null} color="bg-[#51A2FF]" />
              <p>{formatCurrency(order.totalAmount)}</p>
              <StatusPill label={order.payment.status} />
              <StatusPill label={order.status} />
              <p>{formatDateTime(order.placedAt)}</p>
              <p>View</p>
            </button>
          ))}
        </div>

        {selectedOrder ? (
          <aside className="sticky top-24 h-fit rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#99A1AF]">Order</p>
                <h2 className="text-sm font-semibold text-[#101828]">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-md border border-gray-200 px-2 py-1 text-[10px] text-[#6A7282]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <ContactRow
                label="Customer"
                name={selectedOrder.customer.name}
                phone={selectedOrder.customer.phone}
                color="bg-[#C27AFF]"
              />
              <ContactRow
                label="Restaurant"
                name={selectedOrder.restaurant.name}
                phone={selectedOrder.restaurant.phone ?? null}
                color="bg-[#DFB400]"
              />
              <ContactRow
                label="Rider"
                name={selectedOrder.rider?.name ?? "Unassigned"}
                phone={selectedOrder.rider?.phone ?? null}
                color="bg-[#51A2FF]"
              />
            </div>

            <div className="mt-4 space-y-3 text-[11px] text-[#4A5565]">
              <InfoRow label="Delivery" value={`${selectedOrder.delivery.streetAddress}, ${selectedOrder.delivery.serviceArea}`} />
              <InfoRow label="Payment" value={selectedOrder.payment.status.replace("_", " ")} />
              <InfoRow label="Status" value={selectedOrder.status.replaceAll("_", " ")} />
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-[#101828]">Order Timeline</h3>
              <div className="mt-3 space-y-3">
                {buildTimeline(selectedOrder).map((event, index, events) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FE9A00]" />
                      {index < events.length - 1 ? (
                        <span className="mt-1 h-full min-h-8 w-px bg-gray-200" />
                      ) : null}
                    </div>
                    <div className="pb-1">
                      <p className="text-[11px] font-semibold capitalize text-[#101828]">
                        {event.status.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-[10px] text-[#99A1AF]">{formatDateTime(event.createdAt)}</p>
                      {event.note ? <p className="mt-1 text-[10px] text-[#6A7282]">{event.note}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-gray-200 pt-4">
              <h3 className="text-xs font-semibold text-[#101828]">Items</h3>
              <div className="mt-3 space-y-3">
                {(selectedOrder.items ?? []).length === 0 ? (
                  <p className="text-[10px] text-[#99A1AF]">Select row loaded. Fetching item detail...</p>
                ) : (
                  selectedOrder.items?.map((item) => (
                    <div key={item.id} className="rounded-lg bg-gray-50 p-3 text-[10px]">
                      <div className="flex justify-between gap-3">
                        <p className="font-semibold text-[#101828]">{item.name}</p>
                        <p>{formatCurrency(item.lineTotalAmount)}</p>
                      </div>
                      <p className="mt-1 text-[#6A7282]">Qty: {item.quantity}</p>
                      {item.components.length ? (
                        <div className="mt-2 space-y-1 text-[#6A7282]">
                          {item.components.map((component) => (
                            <p key={`${item.id}-${component.itemName}`}>
                              {component.itemName} x{component.quantity}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

function PersonCell({ name, detail, color }: { name: string; detail?: string | null; color: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white ${color}`}>
        {initials(name)}
      </div>
      <div className="space-y-1">
        <h2>{name}</h2>
        {detail ? <p className="text-[#6A7282]">{detail}</p> : null}
      </div>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  const normalized = label.replaceAll("_", " ");
  const positive = ["verified", "delivered", "paid", "ready for pickup"].includes(normalized);
  return (
    <p className={`rounded-lg p-2 text-center text-[10px] font-semibold capitalize ${
      positive ? "bg-[#DCFCE7] text-[#10B981]" : "bg-[#FFF7E0] text-[#B7791F]"
    }`}>
      {normalized}
    </p>
  );
}

function ContactRow({
  label,
  name,
  phone,
  color,
}: {
  label: string;
  name: string;
  phone: string | null | undefined;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${color}`}>
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase text-[#99A1AF]">{label}</p>
          <h3 className="truncate text-[11px] font-semibold text-[#101828]">{name}</h3>
          <p className="mt-0.5 text-[10px] text-[#6A7282]">{phone ?? "No phone"}</p>
        </div>
      </div>

      {phone ? (
        <a
          href={`tel:${phone}`}
          aria-label={`Call ${name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FE9A00] text-white transition hover:bg-[#E68700]"
        >
          <FaPhoneAlt className="text-[12px]" />
        </a>
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[#99A1AF]">
          <FaPhoneAlt className="text-[12px]" />
        </span>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#99A1AF]">{label}</p>
      <p className="mt-1 font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function buildTimeline(order: AdminOrder) {
  const events =
    order.timeline && order.timeline.length
      ? order.timeline
      : [
          {
            id: `${order.id}-created`,
            status: order.status,
            note: "Order record created.",
            createdAt: order.placedAt,
          },
        ];

  return [...events].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NA";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default AdminOrdersPage;
