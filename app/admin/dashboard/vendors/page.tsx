"use client";

import { useEffect, useState } from "react";
import {
  FaBan,
  FaClock,
  FaFileAlt,
  FaHistory,
  FaPlus,
  FaRegBuilding,
  FaStore,
  FaUtensils,
  FaWallet,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type VendorStatus = "active" | "suspended" | "inactive" | "pending approval";
type VendorTab = "Overview" | "Menu" | "Documents" | "Activity";

type AdminVendor = {
  id: string;
  name: string;
  initials: string;
  cuisine: string;
  location: string;
  status: VendorStatus;
  manager: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  orders: number;
  rating: number | null;
  clientPrice: number;
  mandoPrice: number;
  vendorPayout: number;
  commissionAmount: number;
  commissionRateBps: number;
  address: string;
  phone: string | null;
  documents?: VendorDocument[];
  menu?: VendorMenuItem[];
  activity?: VendorActivity[];
};

type VendorDocument = {
  id: string;
  name: string;
  status: string;
};

type VendorMenuItem = {
  id: string;
  name: string;
  description: string | null;
  clientPrice: number;
  mandoShare: number;
  vendorShare: number;
  status: string;
};

type VendorActivity = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};

type VendorsResponse = {
  stats: {
    total: number;
    pendingApproval: number;
    suspended: number;
    inactive: number;
  };
  vendors: AdminVendor[];
};

const tabs: VendorTab[] = ["Overview", "Menu", "Documents", "Activity"];

const AdminVendorsPage = () => {
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<AdminVendor | null>(null);
  const [activeTab, setActiveTab] = useState<VendorTab>("Overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/admin/vendors`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load vendors");
        return response.json() as Promise<VendorsResponse>;
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

  async function openVendor(vendor: AdminVendor) {
    setSelectedVendor(vendor);
    setActiveTab("Overview");

    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendor.id}`, {
      credentials: "include",
    });

    if (!response.ok) return;

    const detail = (await response.json()) as { vendor: AdminVendor };
    setSelectedVendor(detail.vendor);
  }

  const overviewStats = [
    {
      id: 1,
      statTitle: "Total Vendors",
      qty: String(data?.stats.total ?? 0),
      crease: "All restaurants",
      theme: "bg-[#FFFBEB]",
      increase: true,
      icon: <FaStore />,
      iconColor: "text-[#FE9A00]",
    },
    {
      id: 2,
      statTitle: "Pending Approval",
      qty: String(data?.stats.pendingApproval ?? 0),
      crease: "Awaiting review",
      theme: "bg-[#EFF6FF]",
      increase: true,
      icon: <FaClock />,
      iconColor: "text-[#2B7FFF]",
    },
    {
      id: 3,
      statTitle: "Suspended",
      qty: String(data?.stats.suspended ?? 0),
      crease: "Temporarily paused",
      theme: "bg-[#FEF2F2]",
      increase: false,
      icon: <FaBan />,
      iconColor: "text-[#FF6467]",
    },
    {
      id: 4,
      statTitle: "Inactive",
      qty: String(data?.stats.inactive ?? 0),
      crease: "Archived vendors",
      theme: "bg-[#F3F4F6]",
      increase: false,
      icon: <FaRegBuilding />,
      iconColor: "text-[#6A7282]",
    },
  ];

  return (
    <div className="pb-10">
      <div className="flex items-start justify-between gap-4 pr-8">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Vendors/Restaurants</h2>
          <p className="text-[11px] text-[#99A1AF]">
            {loading ? "Loading vendors..." : "Manage restaurant onboarding, pricing, menus and payouts."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#6A7282] shadow-sm"
          >
            <FaWallet className="text-[12px]" />
            Commissions & Withdrawals
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-3 py-2 text-[11px] font-semibold text-white shadow-sm"
          >
            <FaPlus className="text-[12px]" />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-3 pr-8">
        {overviewStats.map((item) => (
          <StatsCard key={item.id} {...item} />
        ))}
      </div>

      <div className={`mt-8 grid gap-5 pr-8 ${selectedVendor ? "grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
        <div className="overflow-hidden rounded-lg bg-white p-3">
          <div className="grid grid-cols-[1.6fr_1fr_1.2fr_1.2fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 bg-gray-100 p-2 text-[10px] text-[#99A1AF]">
            <p>Vendor</p>
            <p>Cuisine</p>
            <p>Location</p>
            <p>Manager</p>
            <p>Orders</p>
            <p>Rating</p>
            <p>Client Price</p>
            <p>Mando Price</p>
            <p>Vendor Payout</p>
            <p>Commission</p>
            <p>Status</p>
          </div>

          <div className="space-y-1">
            {(data?.vendors ?? []).map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => void openVendor(vendor)}
                className={`grid w-full grid-cols-[1.6fr_1fr_1.2fr_1.2fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] items-center gap-4 px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${
                  selectedVendor?.id === vendor.id ? "bg-[#FFF7E0]" : ""
                }`}
              >
                <VendorIdentity vendor={vendor} />
                <p className="truncate">{vendor.cuisine}</p>
                <p className="truncate">{vendor.location}</p>
                <p className="truncate">{vendor.manager.name}</p>
                <p>{vendor.orders}</p>
                <p>{vendor.rating ? vendor.rating.toFixed(1) : "New"}</p>
                <p>{formatCurrency(vendor.clientPrice)}</p>
                <p>{formatCurrency(vendor.mandoPrice)}</p>
                <p>{formatCurrency(vendor.vendorPayout)}</p>
                <p>{formatPercent(vendor.commissionRateBps)}</p>
                <StatusPill status={vendor.status} />
              </button>
            ))}
          </div>
        </div>

        {selectedVendor ? (
          <aside className="sticky top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FE9A00] text-sm font-semibold text-white">
                  {selectedVendor.initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-[#101828]">{selectedVendor.name}</h2>
                  <p className="mt-1 text-[10px] text-[#6A7282]">{selectedVendor.location}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill status={selectedVendor.status} />
                <button
                  type="button"
                  onClick={() => setSelectedVendor(null)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282] hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 rounded-lg bg-gray-100 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-2 py-2 text-[10px] font-semibold transition ${
                    activeTab === tab
                      ? "bg-white text-[#101828] shadow-sm"
                      : "text-[#6A7282] hover:text-[#101828]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {activeTab === "Overview" ? <OverviewTab vendor={selectedVendor} /> : null}
              {activeTab === "Menu" ? <MenuTab vendor={selectedVendor} /> : null}
              {activeTab === "Documents" ? <DocumentsTab vendor={selectedVendor} /> : null}
              {activeTab === "Activity" ? <ActivityTab vendor={selectedVendor} /> : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
};

function VendorIdentity({ vendor }: { vendor: AdminVendor }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFB400] text-[10px] font-semibold text-white">
        {vendor.initials}
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-[#101828]">{vendor.name}</h3>
        <p className="truncate text-[#99A1AF]">{vendor.phone ?? "No phone"}</p>
      </div>
    </div>
  );
}

function OverviewTab({ vendor }: { vendor: AdminVendor }) {
  return (
    <div className="space-y-5">
      <PanelSection title="Restaurant Information">
        <DetailRow label="Owner/Manager" value={vendor.manager.name} />
        <DetailRow label="Phone" value={vendor.manager.phone ?? vendor.phone ?? "No phone"} />
        <DetailRow label="Email" value={vendor.manager.email ?? "No email"} />
        <DetailRow label="Address" value={vendor.address} />
      </PanelSection>

      <PanelSection title="Pricing & Commission">
        <DetailRow label="Client price" value={formatCurrency(vendor.clientPrice)} />
        <DetailRow label="Mando price" value={formatCurrency(vendor.mandoPrice)} />
        <DetailRow label="Vendor payout" value={formatCurrency(vendor.vendorPayout)} />
        <DetailRow label="Commission" value={formatPercent(vendor.commissionRateBps)} />
      </PanelSection>

      <PanelSection title="Documents">
        <div className="space-y-2">
          {(vendor.documents ?? fallbackDocuments(vendor)).map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      </PanelSection>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="rounded-lg bg-[#FE9A00] px-3 py-2 text-[11px] font-semibold text-white">
          Edit vendor
        </button>
        <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
          Suspend
        </button>
      </div>
    </div>
  );
}

function MenuTab({ vendor }: { vendor: AdminVendor }) {
  const menu = vendor.menu ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-[#101828]">Menu Items</h3>
        <button type="button" className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-3 py-2 text-[10px] font-semibold text-white">
          <FaPlus className="text-[10px]" />
          Add Item
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {menu.length ? (
          menu.map((item) => (
            <div key={item.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[11px] font-semibold text-[#101828]">{item.name}</h4>
                  {item.description ? (
                    <p className="mt-1 text-[10px] text-[#6A7282]">{item.description}</p>
                  ) : null}
                </div>
                <StatusPill status={item.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                <PriceBox label="Client" value={item.clientPrice} />
                <PriceBox label="Mando" value={item.mandoShare} />
                <PriceBox label="Vendor" value={item.vendorShare} />
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon={<FaUtensils />} text="No menu items uploaded yet." />
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ vendor }: { vendor: AdminVendor }) {
  return (
    <PanelSection title="Vendor Documents">
      <div className="space-y-2">
        {(vendor.documents ?? fallbackDocuments(vendor)).map((document) => (
          <DocumentRow key={document.id} document={document} />
        ))}
      </div>
    </PanelSection>
  );
}

function ActivityTab({ vendor }: { vendor: AdminVendor }) {
  const activity = vendor.activity ?? [];

  return (
    <PanelSection title="Recent Activity">
      {activity.length ? (
        <div className="space-y-3">
          {activity.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg bg-gray-50 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#FE9A00]">
                <FaHistory className="text-[12px]" />
              </div>
              <div>
                <h4 className="text-[11px] font-semibold text-[#101828]">{item.title}</h4>
                <p className="mt-1 text-[10px] capitalize text-[#6A7282]">{item.detail}</p>
                <p className="mt-1 text-[10px] text-[#99A1AF]">{formatDate(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<FaHistory />} text="No recent activity yet." />
      )}
    </PanelSection>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-[#101828]">{title}</h3>
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

function DocumentRow({ document }: { document: VendorDocument }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#FE9A00]">
          <FaFileAlt className="text-[12px]" />
        </div>
        <p className="text-[11px] font-semibold text-[#101828]">{document.name}</p>
      </div>
      <StatusPill status={document.status} />
    </div>
  );
}

function PriceBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white p-2">
      <p className="text-[#99A1AF]">{label}</p>
      <p className="mt-1 font-semibold text-[#101828]">{formatCurrency(value)}</p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 px-4 py-8 text-center text-[#99A1AF]">
      <div className="text-lg">{icon}</div>
      <p className="mt-2 text-[11px]">{text}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.replaceAll("_", " ");
  const positive = ["active", "available", "verified", "paid"].includes(normalized);
  const negative = ["suspended", "inactive", "unavailable", "rejected"].includes(normalized);

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

function fallbackDocuments(vendor: AdminVendor): VendorDocument[] {
  return [
    { id: `${vendor.id}-cac`, name: "CAC certificate", status: "pending" },
    { id: `${vendor.id}-food`, name: "Food handler certificate", status: "pending" },
    { id: `${vendor.id}-tax`, name: "Tax certificate", status: "pending" },
  ];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(valueBps: number) {
  return `${Number((valueBps / 100).toFixed(2))}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default AdminVendorsPage;
