"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import StatsCard from "@/components/cards/StatsCard";
import {
  CancelIcon,
  DisputeIcon,
  FinancialsIcon,
  OrderIcon,
  RiderIcon,
  VendorsIcon,
} from "@/components/svgs/AdminIcons";
import { BlueDot, GreenDot, OrangeDot, RedDot } from "@/components/svgs/Dots";
import { FaStar } from "react-icons/fa";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type AdminOrder = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  customer: { name: string };
  restaurant: { name: string };
};

type AdminOverviewData = {
  stats: {
    revenueAmount: number;
    orderCount: number;
    activeRiderCount: number;
    activeVendorCount: number;
    cancelRate: number;
  };
  quickStats: {
    totalOrders: number;
    totalDeliveries: number;
    totalRevenueAmount: number;
    paymentIssueCount: number;
  };
  systemStatus: {
    orderProcessing: string;
    restaurantsOnline: number;
    ridersAvailable: number;
    paymentGateway: string;
  };
  pendingActions: {
    vendorApprovals: number;
    salesAgentApprovals: number;
    disputeResolution: number;
  };
  recentOrders: AdminOrder[];
  topVendors: {
    id: string;
    name: string;
    orderCount: number;
    revenueAmount: number;
    ratingAverage: number | null;
  }[];
  disputes: {
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
};

const AdminOverview = () => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7");

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/overview`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load admin overview");
        return response.json() as Promise<AdminOverviewData>;
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

  const overviewStats = [
    {
      id: 1,
      statTitle: "Revenue",
      qty: formatCurrency(data?.stats.revenueAmount ?? 0),
      crease: "Live platform total",
      theme: "bg-[#F0FDF4]",
      increase: true,
      icon: <FinancialsIcon />,
      iconColor: "text-[#00C950]",
    },
    {
      id: 2,
      statTitle: "Orders",
      qty: formatNumber(data?.stats.orderCount ?? 0),
      crease: "All customer orders",
      theme: "bg-[#FFFBEB]",
      increase: true,
      icon: <OrderIcon />,
      iconColor: "text-[#FE9A00]",
    },
    {
      id: 3,
      statTitle: "Active Riders",
      qty: formatNumber(data?.stats.activeRiderCount ?? 0),
      crease: "Available or busy",
      theme: "bg-[#EFF6FF]",
      increase: true,
      icon: <RiderIcon />,
      iconColor: "text-[#2B7FFF]",
    },
    {
      id: 4,
      statTitle: "Active Vendors",
      qty: formatNumber(data?.stats.activeVendorCount ?? 0),
      crease: "Restaurants live",
      theme: "bg-[#FAF5FF]",
      increase: true,
      icon: <VendorsIcon />,
      iconColor: "text-[#AD46FF]",
    },
    {
      id: 5,
      statTitle: "Cancel Rate",
      qty: `${(data?.stats.cancelRate ?? 0).toFixed(1)}%`,
      crease: "Cancelled / total",
      theme: "bg-[#FEF2F2]",
      increase: false,
      icon: <CancelIcon />,
      iconColor: "text-[#FF6467]",
    },
  ];

  const quickStats = [
    { id: 1, dot: <OrangeDot />, title: "Total Orders", value: formatNumber(data?.quickStats.totalOrders ?? 0) },
    { id: 2, dot: <GreenDot />, title: "Total Deliveries", value: formatNumber(data?.quickStats.totalDeliveries ?? 0) },
    { id: 3, dot: <BlueDot />, title: "Total Revenue", value: formatCurrency(data?.quickStats.totalRevenueAmount ?? 0) },
    { id: 4, dot: <RedDot />, title: "Payment Issues", value: formatNumber(data?.quickStats.paymentIssueCount ?? 0) },
  ];

  const systemStatus = [
    { id: 1, title: "Order Processing", status: data?.systemStatus.orderProcessing ?? "Checking", isBad: false },
    { id: 2, title: "Restaurants Online", status: `${data?.systemStatus.restaurantsOnline ?? 0} online`, isBad: false },
    { id: 3, title: "Riders Available", status: `${data?.systemStatus.ridersAvailable ?? 0} online`, isBad: false },
    { id: 4, title: "Payment Gateway", status: data?.systemStatus.paymentGateway ?? "Checking", isBad: data?.systemStatus.paymentGateway === "Degraded" },
  ];

  const pendingActions = [
    { id: 1, title: "Vendor Approvals", icon: <VendorsIcon />, iconColor: "text-[#FF6900]", qty: data?.pendingActions.vendorApprovals ?? 0 },
    { id: 2, title: "Sales Agent Approvals", icon: <OrderIcon />, iconColor: "text-[#2B7FFF]", qty: data?.pendingActions.salesAgentApprovals ?? 0 },
    { id: 3, title: "Dispute Resolution", icon: <DisputeIcon />, iconColor: "text-[#FB2C36]", qty: data?.pendingActions.disputeResolution ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-[18px] font-semibold text-[#101828]">Overview</h2>
      <p className="text-[11px] text-[#99A1AF]">
        {loading ? "Loading platform activity..." : "Here's what's happening with your platform today."}
      </p>

      <div className="mt-10 grid grid-cols-5 gap-3 pr-8">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <StatSkeleton key={index} />)
          : overviewStats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6 pr-8">
        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Quick Stats</h2>
            <GreenDot />
          </div>
          <div className="mt-6 space-y-3">
            {loading ? <StackSkeleton rows={4} /> : quickStats.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {item.dot}
                  <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                </div>
                <p className="text-[10px] text-[#101828]">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold text-[#101828]">Orders Overview</h2>
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="rounded-md border border-[#cccccc] p-2 text-[10px] text-[#808080]"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <div className="mt-8 flex h-32 items-end gap-3">
            {loading ? (
              <ChartSkeleton />
            ) : (
              [data?.quickStats.totalOrders ?? 0, data?.quickStats.totalDeliveries ?? 0, data?.quickStats.paymentIssueCount ?? 0].map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-[#FFB900]"
                    style={{ height: `${Math.max(16, Math.min(120, value * 8))}px` }}
                  />
                  <span className="text-[10px] text-[#99A1AF]">{["Orders", "Delivered", "Issues"][index]}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <h2 className="text-[12px] font-semibold">System Status</h2>
            {loading ? <StackSkeleton rows={4} /> : systemStatus.map((item) => (
              <div className="flex items-center justify-between" key={item.id}>
                <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                <p className={`rounded-lg p-2 text-[10px] font-semibold ${item.isBad ? "bg-[#FFE2E2] text-[#EF4444]" : "bg-[#DCFCE7] text-[#10B981]"}`}>
                  {item.status}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <h2 className="text-[12px] font-semibold">Pending Actions</h2>
            {loading ? <StackSkeleton rows={3} /> : pendingActions.map((item) => (
              <div className="flex items-center justify-between" key={item.id}>
                <div className="flex items-center space-x-3">
                  <div className={item.iconColor}>{item.icon}</div>
                  <p className="text-[10px] text-[#4A5565]">{item.title}</p>
                </div>
                <span className="text-[10px] font-semibold">{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6 pr-8">
        <TableCard title="Recent Orders" columns={["Order ID", "Customer", "Restaurant", "Amount"]}>
          {loading ? <TableSkeleton columns={4} rows={5} /> : null}
          {(data?.recentOrders ?? []).map((order) => (
            <div key={order.id} className="grid grid-cols-4 gap-6 px-2 py-2 text-[10px] text-[#99A1AF]">
              <p>{order.orderNumber}</p>
              <p>{order.customer.name}</p>
              <p>{order.restaurant.name}</p>
              <p>{formatCurrency(order.totalAmount)}</p>
            </div>
          ))}
        </TableCard>

        <TableCard title="Top Vendors" columns={["Vendor", "Orders", "Revenue", "Rating"]}>
          {loading ? <TableSkeleton columns={4} rows={5} /> : null}
          {(data?.topVendors ?? []).map((vendor) => (
            <div key={vendor.id} className="grid grid-cols-4 gap-6 px-2 py-2 text-[10px] text-[#99A1AF]">
              <p>{vendor.name}</p>
              <p>{vendor.orderCount}</p>
              <p>{formatCurrency(vendor.revenueAmount)}</p>
              <div className="flex items-center space-x-1 text-[#FE9A00]">
                <p>{vendor.ratingAverage ?? "New"}</p>
                <FaStar />
              </div>
            </div>
          ))}
        </TableCard>

        <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <h2 className="text-[12px] font-semibold">Commonly Disputed</h2>
          {loading ? (
            <StackSkeleton rows={4} />
          ) : (data?.disputes ?? []).length === 0 ? (
            <p className="text-[10px] text-[#99A1AF]">No disputes yet.</p>
          ) : (
            data?.disputes.map((issue) => (
              <div className="flex items-center justify-between" key={issue.id}>
                <div className="text-[10px]">
                  <h2>{issue.status.replace("_", " ")}</h2>
                  <p className="text-[#FB2C36]">{issue.reason}</p>
                </div>
                <button className="text-[10px] text-[#99A1AF]">{formatDate(issue.createdAt)}</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function TableCard({ title, columns, children }: { title: string; columns: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex justify-between">
        <h2 className="text-[12px] font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-4 gap-6 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
        {columns.map((column) => <p key={column}>{column}</p>)}
      </div>
      {children}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="min-w-[174px] space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <Skeleton className="h-6 w-12" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function StackSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-6 px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </>
  );
}

function ChartSkeleton() {
  return (
    <>
      {[48, 96, 64].map((height, index) => (
        <div key={index} className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="w-full rounded-t-lg" style={{ height }} />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </>
  );
}

function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div style={style} className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} />;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default AdminOverview;
