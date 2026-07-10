"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type CommissionRestaurant = {
  id: string;
  name: string;
  commissionRateBps: number;
  status: string;
};

type WithdrawalRequest = {
  id: string;
  vendor: string;
  orders: number;
  clientPaid: number;
  mandoCut: number;
  vendorAmount: number;
  paymentMethod: string;
  payoutDetails: string;
  requestDate: string;
  status: string;
};

type CommissionResponse = {
  restaurants: CommissionRestaurant[];
  payoutSettings: {
    frequency: string;
    payoutTime: string;
    minimumWithdrawal: number;
    autoProcess: boolean;
  };
  withdrawalRequests: WithdrawalRequest[];
};

const requestFilters = ["all", "pending", "approved", "rejected"] as const;

const VendorCommissionsPage = () => {
  const [data, setData] = useState<CommissionResponse | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [filter, setFilter] = useState<(typeof requestFilters)[number]>("all");
  const [autoDeduct, setAutoDeduct] = useState(true);
  const [autoProcess, setAutoProcess] = useState(false);
  const loading = !data;

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/vendors/commissions`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load commission settings");
        return response.json() as Promise<CommissionResponse>;
      })
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setAutoProcess(result.payoutSettings.autoProcess);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    const requests = data?.withdrawalRequests ?? [];
    if (filter === "all") return requests;

    return requests.filter((request) => request.status === filter);
  }, [data?.withdrawalRequests, filter]);

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard/vendors"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-[#6A7282]"
            >
              <FaArrowLeft className="text-[12px]" />
            </Link>
            <h2 className="text-[18px] font-semibold text-[#101828]">Commissions & Withdrawals</h2>
          </div>
          <p className="mt-2 text-[11px] text-[#99A1AF]">
            Control restaurant commission rules and review vendor payout requests.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-[#101828]">Commission Settings</h3>
        <p className="mt-1 text-[11px] text-[#99A1AF]">
          Set how Mando deducts commission before vendor payouts are released.
        </p>

        <div className="mt-5 flex gap-5">
          <div className="w-[32%] space-y-4">
            <div className="rounded-2xl border border-amber-100 bg-[#FFFBEB] p-4">
              <h4 className="text-xs font-semibold text-[#101828]">How it works</h4>
              <div className="mt-4 space-y-3 text-[11px]">
                <ExampleRow label="Customer pays" value="₦2,000" />
                <ExampleRow label="Mando keeps 10%" value="₦200" />
                <ExampleRow label="Vendor gets" value="₦1,800" strong />
              </div>
            </div>

            <ToggleRow
              label="Auto deduct commission"
              checked={autoDeduct}
              onToggle={() => setAutoDeduct((value) => !value)}
            />
          </div>

          <div className="grid flex-1 grid-cols-2 gap-5">
            <div className="rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-[#101828]">Commission by Restaurant</h4>
              <div className="mt-4 space-y-3">
                {loading ? (
                  <StackSkeleton rows={5} />
                ) : (
                  (data?.restaurants ?? []).map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#101828]">{restaurant.name}</p>
                      <p className="mt-1 text-[10px] capitalize text-[#99A1AF]">{restaurant.status}</p>
                    </div>
                    <input
                      type="number"
                      defaultValue={restaurant.commissionRateBps / 100}
                      className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-right text-[11px]"
                    />
                  </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-[#101828]">Payout Settings</h4>
              {loading ? (
                <div className="mt-4">
                  <StackSkeleton rows={4} />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <SelectField label="Payout frequency" defaultValue={data?.payoutSettings.frequency ?? "Weekly"} options={["Daily", "Weekly", "Bi-weekly", "Monthly"]} />
                  <FormField label="Payout time" type="time" defaultValue={data?.payoutSettings.payoutTime ?? "17:00"} />
                  <FormField label="Minimum withdrawal" type="number" defaultValue={String(data?.payoutSettings.minimumWithdrawal ?? 5000)} />
                  <ToggleRow label="Auto process payout" checked={autoProcess} onToggle={() => setAutoProcess((value) => !value)} />
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button type="button" className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white">
                  Save settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`mt-8 grid gap-5 ${selectedRequest ? "grid-cols-[1fr_360px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#101828]">Vendor Withdrawal Requests</h3>
              <p className="mt-1 text-[11px] text-[#99A1AF]">Review pending and historical vendor payout requests.</p>
            </div>
            <div className="flex rounded-lg bg-gray-100 p-1">
              {requestFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-semibold capitalize ${
                    filter === item ? "bg-white text-[#101828] shadow-sm" : "text-[#6A7282]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1.4fr_0.6fr_0.9fr_0.9fr_0.9fr_1fr_0.9fr_0.8fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Vendor</p>
            <p>Orders</p>
            <p>Client Paid</p>
            <p>Mando Cut</p>
            <p>Vendor Amount</p>
            <p>Payment Method</p>
            <p>Request Date</p>
            <p>Status</p>
          </div>

          <div className="space-y-1">
            {loading ? (
              <TableSkeleton columns={8} rows={6} />
            ) : (
              filteredRequests.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedRequest(request)}
                className={`grid w-full grid-cols-[1.4fr_0.6fr_0.9fr_0.9fr_0.9fr_1fr_0.9fr_0.8fr] items-center gap-4 px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${
                  selectedRequest?.id === request.id ? "bg-[#FFF7E0]" : ""
                }`}
              >
                <p className="font-semibold text-[#101828]">{request.vendor}</p>
                <p>{request.orders}</p>
                <p>{formatCurrency(request.clientPaid)}</p>
                <p>{formatCurrency(request.mandoCut)}</p>
                <p>{formatCurrency(request.vendorAmount)}</p>
                <p>{request.paymentMethod}</p>
                <p>{formatDate(request.requestDate)}</p>
                <StatusPill status={request.status} />
              </button>
              ))
            )}
          </div>
        </div>

        {selectedRequest ? (
          <aside className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#99A1AF]">Payout details</p>
                <h3 className="mt-1 text-sm font-semibold text-[#101828]">{selectedRequest.vendor}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]"
              >
                Close
              </button>
            </div>

            <PanelSection title="Request Info">
              <DetailRow label="Request ID" value={selectedRequest.id.slice(0, 8)} />
              <DetailRow label="Orders" value={String(selectedRequest.orders)} />
              <DetailRow label="Request date" value={formatDate(selectedRequest.requestDate)} />
              <DetailRow label="Payout method" value={selectedRequest.paymentMethod} />
              <DetailRow label="Payout details" value={selectedRequest.payoutDetails} />
              <DetailRow label="Status" value={selectedRequest.status.replaceAll("_", " ")} />
            </PanelSection>

            <PanelSection title="Payout Breakdown">
              <DetailRow label="Client paid" value={formatCurrency(selectedRequest.clientPaid)} />
              <DetailRow label="Mando's cut" value={formatCurrency(selectedRequest.mandoCut)} />
              <DetailRow label="Vendor gets" value={formatCurrency(selectedRequest.vendorAmount)} />
            </PanelSection>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-3 py-2 text-[11px] font-semibold text-white">
                <FaCheck className="text-[10px]" />
                Approve
              </button>
              <button type="button" className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                <FaTimes className="text-[10px]" />
                Reject
              </button>
            </div>
          </aside>
        ) : null}
      </section>
    </div>
  );
};

function ExampleRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-[#6A7282]">{label}</p>
      <p className={strong ? "font-semibold text-[#101828]" : "font-semibold text-[#6A7282]"}>{value}</p>
    </div>
  );
}

function ToggleRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-semibold text-[#101828]">{label}</p>
      <button
        type="button"
        onClick={onToggle}
        className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-[#FE9A00]" : "bg-gray-300"}`}
      >
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function StackSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid items-center gap-4 rounded-lg px-2 py-3"
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

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} />;
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="text-xs font-semibold text-[#101828]">{title}</h4>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]">
      <p className="text-[#99A1AF]">{label}</p>
      <p className="max-w-[62%] text-right font-semibold text-[#101828]">{value}</p>
    </div>
  );
}

function FormField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <input {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none transition focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" />
    </label>
  );
}

function SelectField({ label, options, defaultValue }: { label: string; options: string[]; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <select defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none transition focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.replaceAll("_", " ");
  const positive = ["approved", "paid", "processing"].includes(normalized);
  const negative = ["rejected", "cancelled", "failed"].includes(normalized);

  return (
    <p
      className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${
        positive
          ? "bg-[#DCFCE7] text-[#10B981]"
          : negative
            ? "bg-[#FEF2F2] text-[#FF6467]"
            : "bg-[#FFF7E0] text-[#B7791F]"
      }`}
    >
      {normalized}
    </p>
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

export default VendorCommissionsPage;
