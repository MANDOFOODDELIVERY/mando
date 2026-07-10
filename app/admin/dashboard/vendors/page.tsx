"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  FaBan,
  FaClock,
  FaCloudUploadAlt,
  FaFileAlt,
  FaHistory,
  FaImage,
  FaPlus,
  FaRegBuilding,
  FaStore,
  FaUtensils,
  FaWallet,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";
import { useToastStore } from "@/store/toastStore";

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
  operations?: {
    openingTime: string | null;
    closingTime: string | null;
    openDays: string | null;
    deliveryRadius: string | null;
    deliveryType: string | null;
    website: string | null;
  } | null;
};

type VendorDocument = {
  id: string;
  name: string;
  status: string;
  documentNumber?: string | null;
  fileUrl?: string | null;
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

type CloudinaryUploadType = "restaurant_logo" | "menu_item_image" | "vendor_document";

type CloudinarySignatureResponse = {
  upload: {
    apiKey: string;
    uploadUrl: string;
    folder: string;
    publicId: string;
    timestamp: number;
    signature: string;
  };
};

type CloudinaryUploadResponse = {
  secure_url: string;
};

type UploadProgress = {
  label: string;
  percent: number;
};

const tabs: VendorTab[] = ["Overview", "Menu", "Documents", "Activity"];

const AdminVendorsPage = () => {
  const showToast = useToastStore((s) => s.showToast);
  const [data, setData] = useState<VendorsResponse | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<AdminVendor | null>(null);
  const [activeTab, setActiveTab] = useState<VendorTab>("Overview");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [vendorModalMode, setVendorModalMode] = useState<"add" | "edit" | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendingVendorId, setSuspendingVendorId] = useState<string | null>(null);
  const [approvingVendorId, setApprovingVendorId] = useState<string | null>(null);

  async function loadVendors() {
    setLoading(true);

    const response = await fetch(`${API_BASE_URL}/admin/vendors`, { credentials: "include" });
    if (!response.ok) throw new Error("Unable to load vendors");

    const result = (await response.json()) as VendorsResponse;
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    loadVendors()
      .then((result) => {
        if (!mounted) return;
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

  async function refreshSelectedVendor(vendor: AdminVendor | null = selectedVendor) {
    if (!vendor) return;

    const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendor.id}`, {
      credentials: "include",
    });

    if (!response.ok) return;

    const detail = (await response.json()) as { vendor: AdminVendor };
    setSelectedVendor(detail.vendor);
  }

  async function suspendVendor(vendor: AdminVendor) {
    const nextStatus = vendor.status === "suspended" ? "active" : "paused";
    setSuspendingVendorId(vendor.id);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendor.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to update vendor status");
      }

      const result = (await response.json()) as { vendor: AdminVendor | null };
      if (result.vendor) setSelectedVendor(result.vendor);
      await loadVendors();
      showToast(nextStatus === "paused" ? "Vendor suspended" : "Vendor reactivated", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update vendor status", "error");
    } finally {
      setSuspendingVendorId(null);
    }
  }

  async function approveVendor(vendor: AdminVendor) {
    setApprovingVendorId(vendor.id);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendor.id}/approve`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to approve vendor");
      }

      const result = (await response.json()) as { vendor: AdminVendor | null };
      if (result.vendor) setSelectedVendor(result.vendor);
      await loadVendors();
      showToast("Vendor approved successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to approve vendor", "error");
    } finally {
      setApprovingVendorId(null);
    }
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
          <Link
            href="/admin/dashboard/vendors/commissions"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[11px] font-semibold text-[#6A7282] shadow-sm"
          >
            <FaWallet className="text-[12px]" />
            Commissions & Withdrawals
          </Link>
          <button
            type="button"
            onClick={() => setVendorModalMode("add")}
            className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-3 py-2 text-[11px] font-semibold text-white shadow-sm"
          >
            <FaPlus className="text-[12px]" />
            Add Vendor
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-3 pr-8">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)
          : overviewStats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <div className={`mt-8 grid gap-5 pr-8 ${selectedVendor ? "grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-[1.6fr_1fr_1.2fr_1.2fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
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
            {loading ? (
              <TableSkeleton columns={11} rows={6} />
            ) : (
              (data?.vendors ?? []).map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => void openVendor(vendor)}
                className={`grid w-full grid-cols-[1.6fr_1fr_1.2fr_1.2fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] transition hover:bg-[#FFF7E0] ${
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
              ))
            )}
          </div>
        </div>

        {selectedVendor ? (
          <aside className="sticky top-24 h-fit max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
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
              {activeTab === "Overview" ? (
                <OverviewTab
                  vendor={selectedVendor}
                  onEdit={() => setVendorModalMode("edit")}
                  onApprove={() => void approveVendor(selectedVendor)}
                  onSuspend={() => void suspendVendor(selectedVendor)}
                  approving={approvingVendorId === selectedVendor.id}
                  suspending={suspendingVendorId === selectedVendor.id}
                />
              ) : null}
              {activeTab === "Menu" ? (
                <MenuTab vendor={selectedVendor} onAddItem={() => setShowAddItemModal(true)} />
              ) : null}
              {activeTab === "Documents" ? <DocumentsTab vendor={selectedVendor} /> : null}
              {activeTab === "Activity" ? <ActivityTab vendor={selectedVendor} /> : null}
            </div>
          </aside>
        ) : null}
      </div>

      {showAddItemModal ? (
        <AddItemModal
          vendor={selectedVendor}
          showToast={showToast}
          onClose={() => setShowAddItemModal(false)}
          onSaved={() => {
            setShowAddItemModal(false);
            void refreshSelectedVendor();
            showToast("Menu item added successfully", "success");
          }}
        />
      ) : null}
      {vendorModalMode ? (
        <VendorFormModal
          mode={vendorModalMode}
          vendor={vendorModalMode === "edit" ? selectedVendor : null}
          onClose={() => setVendorModalMode(null)}
          onSaved={(vendor) => {
            setVendorModalMode(null);
            void loadVendors();
            if (vendor) setSelectedVendor(vendor);
            showToast(vendorModalMode === "edit" ? "Vendor updated successfully" : "Vendor added successfully", "success");
          }}
          showToast={showToast}
        />
      ) : null}
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

function OverviewTab({
  vendor,
  onEdit,
  onApprove,
  onSuspend,
  approving,
  suspending,
}: {
  vendor: AdminVendor;
  onEdit: () => void;
  onApprove: () => void;
  onSuspend: () => void;
  approving: boolean;
  suspending: boolean;
}) {
  const canApprove = vendor.status === "pending approval";

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

      <div className={`grid gap-3 ${canApprove ? "grid-cols-3" : "grid-cols-2"}`}>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-[#FE9A00] px-3 py-2 text-[11px] font-semibold text-white"
        >
          Edit vendor
        </button>
        {canApprove ? (
          <button
            type="button"
            onClick={onApprove}
            disabled={approving}
            className="rounded-lg bg-[#16A34A] px-3 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approving ? "Approving..." : "Approve"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSuspend}
          disabled={suspending}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {suspending ? "Updating..." : vendor.status === "suspended" ? "Reactivate" : "Suspend"}
        </button>
      </div>
    </div>
  );
}

function MenuTab({ vendor, onAddItem }: { vendor: AdminVendor; onAddItem: () => void }) {
  const menu = vendor.menu ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-[#101828]">Menu Items</h3>
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-3 py-2 text-[10px] font-semibold text-white"
        >
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
        <div>
          <p className="text-[11px] font-semibold text-[#101828]">{document.name}</p>
          {document.fileUrl ? (
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[10px] font-semibold text-[#FE9A00]"
            >
              View file
            </a>
          ) : null}
        </div>
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

function getSelectedFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;

  return value;
}

async function uploadAdminFile(
  file: File | null,
  type: CloudinaryUploadType,
  onProgress?: (progress: UploadProgress) => void,
) {
  if (!file) return null;

  const maxSize = type === "vendor_document" ? 8 * 1024 * 1024 : 4 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(type === "vendor_document" ? "Documents must be 8MB or smaller" : "Images must be 4MB or smaller");
  }

  if (type !== "vendor_document" && !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }

  onProgress?.({ label: `Preparing ${file.name}`, percent: 20 });

  const signatureResponse = await fetch(`${API_BASE_URL}/uploads/signature`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });

  if (!signatureResponse.ok) {
    const errorBody = (await signatureResponse.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Unable to prepare file upload");
  }

  const { upload } = (await signatureResponse.json()) as CloudinarySignatureResponse;
  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append("file", file);
  cloudinaryFormData.append("api_key", upload.apiKey);
  cloudinaryFormData.append("timestamp", String(upload.timestamp));
  cloudinaryFormData.append("signature", upload.signature);
  cloudinaryFormData.append("folder", upload.folder);
  cloudinaryFormData.append("public_id", upload.publicId);

  onProgress?.({ label: `Uploading ${file.name}`, percent: 65 });

  const cloudinaryResponse = await fetch(upload.uploadUrl, {
    method: "POST",
    body: cloudinaryFormData,
  });

  if (!cloudinaryResponse.ok) {
    throw new Error("Unable to upload file");
  }

  const uploadedFile = (await cloudinaryResponse.json()) as CloudinaryUploadResponse;
  onProgress?.({ label: `${file.name} uploaded`, percent: 100 });

  return uploadedFile.secure_url;
}

function AddItemModal({
  vendor,
  showToast,
  onClose,
  onSaved,
}: {
  vendor: AdminVendor | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  async function submitItem(formData: FormData) {
    if (!vendor) return;

    setSaving(true);
    setProgress(null);

    try {
      const itemName = String(formData.get("itemName") ?? "").trim();
      const category = String(formData.get("category") ?? "").trim();
      const clientPrice = String(formData.get("clientPrice") ?? "").trim();

      if (!itemName || !category || !clientPrice) {
        throw new Error("Please enter item name, category, and client price");
      }

      const imageUrl = await uploadAdminFile(
        getSelectedFile(formData, "itemPhoto"),
        "menu_item_image",
        setProgress,
      );

      const response = await fetch(`${API_BASE_URL}/admin/vendors/${vendor.id}/menu-items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName,
          category,
          clientPrice,
          mandoPrice: formData.get("mandoPrice"),
          imageUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to add menu item");
      }

      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to add menu item", "error");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <ModalShell title="Add Menu Item" subtitle="Create a restaurant menu item with client and Mando pricing." onClose={onClose}>
      <form action={submitItem} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <FileUploadField label="Item photo" name="itemPhoto" accept="image/*" progress={progress} optional imageOnly />
          <FormField label="Item name" name="itemName" placeholder="Jollof rice and chicken" />
          <FormField label="Category" name="category" placeholder="Rice dishes" />
          <FormField label="Client's price" name="clientPrice" type="number" placeholder="2500" />
          <FormField label="Mando's price" name="mandoPrice" type="number" placeholder="250" />
        </div>

        <ModalActions cancelLabel="Cancel" actionLabel={saving ? "Uploading..." : "Add item"} onCancel={onClose} disabled={saving} />
      </form>
    </ModalShell>
  );
}

function VendorFormModal({
  mode,
  vendor,
  showToast,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  vendor: AdminVendor | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onClose: () => void;
  onSaved: (vendor: AdminVendor | null) => void;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const steps = ["Restaurant info", "Contact & owner", "Operations", "Documents"];

  function saveVendorFromForm() {
    if (!formRef.current || saving) return;
    void submitVendor(new FormData(formRef.current));
  }

  async function submitVendor(formData: FormData) {
    const endpoint =
      mode === "edit" && vendor
        ? `${API_BASE_URL}/admin/vendors/${vendor.id}`
        : `${API_BASE_URL}/admin/vendors`;
    const method = mode === "edit" ? "PATCH" : "POST";

    setSaving(true);
    setProgress(null);

    try {
      const requiredFields = [
        ["restaurantName", "restaurant name"],
        ["fullAddress", "full address"],
        ["serviceArea", "service area"],
        ["ownerName", "owner/manager name"],
        ["phone", "phone number"],
        ["email", "email address"],
        ["minimumOrder", "minimum order"],
      ] as const;

      for (const [fieldName, label] of requiredFields) {
        if (!String(formData.get(fieldName) ?? "").trim()) {
          throw new Error(`Please enter ${label}`);
        }
      }

      const [logoUrl, cacCertificateUrl, foodHandlerCertificateUrl, healthSafetyPermitUrl] = await Promise.all([
        uploadAdminFile(getSelectedFile(formData, "logo"), "restaurant_logo", setProgress),
        uploadAdminFile(getSelectedFile(formData, "cacCertificate"), "vendor_document", setProgress),
        uploadAdminFile(getSelectedFile(formData, "foodHandlerCertificate"), "vendor_document", setProgress),
        uploadAdminFile(getSelectedFile(formData, "healthSafetyPermit"), "vendor_document", setProgress),
      ]);

      const response = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantName: formData.get("restaurantName"),
          fullAddress: formData.get("fullAddress"),
          serviceArea: formData.get("serviceArea"),
          logoUrl,
          ownerName: formData.get("ownerName"),
          phone: formData.get("phone"),
          email: formData.get("email"),
          website: formData.get("website"),
          openingTime: formData.get("openingTime"),
          closingTime: formData.get("closingTime"),
          openDays: formData.get("openDays"),
          deliveryRadius: formData.get("deliveryRadius"),
          minimumOrder: formData.get("minimumOrder"),
          deliveryType: formData.get("deliveryType"),
          cacCertificateUrl,
          foodHandlerCertificateUrl,
          taxIdentificationNumber: formData.get("taxIdentificationNumber"),
          healthSafetyPermitUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to save vendor");
      }

      const result = (await response.json()) as { vendor: AdminVendor | null };
      onSaved(result.vendor);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save vendor", "error");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <ModalShell
      title={mode === "add" ? "Add Vendor" : "Edit Vendor"}
      subtitle={mode === "add" ? "Onboard a restaurant in four careful steps." : "Update this vendor using the same onboarding structure."}
      onClose={onClose}
      wide
    >
      <form ref={formRef} onSubmit={(event) => event.preventDefault()} noValidate>
        <div className="grid grid-cols-4 gap-2">
          {steps.map((item, index) => {
            const stepNumber = index + 1;
            const active = stepNumber === step;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setStep(stepNumber)}
                className={`rounded-lg border px-3 py-2 text-left text-[10px] font-semibold ${
                  active ? "border-[#FE9A00] bg-[#FFFBEB] text-[#101828]" : "border-gray-200 text-[#6A7282]"
                }`}
              >
                <span className="block text-[9px] text-[#99A1AF]">Step {stepNumber}</span>
                {item}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className={step === 1 ? "block" : "hidden"}><RestaurantInfoStep vendor={vendor} progress={progress} /></div>
          <div className={step === 2 ? "block" : "hidden"}><ContactOwnerStep vendor={vendor} /></div>
          <div className={step === 3 ? "block" : "hidden"}><OperationsStep vendor={vendor} /></div>
          <div className={step === 4 ? "block" : "hidden"}><DocumentsStep vendor={vendor} progress={progress} /></div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep((current) => current - 1)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282]"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={step === 4 ? saveVendorFromForm : () => setStep((current) => current + 1)}
            disabled={saving}
            className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Uploading..." : step === 4 ? (mode === "add" ? "Add vendor" : "Save vendor") : "Continue"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function RestaurantInfoStep({
  vendor,
  progress,
}: {
  vendor: AdminVendor | null;
  progress: UploadProgress | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-100 bg-[#FFFBEB] px-3 py-2 text-[10px] font-semibold text-[#B7791F]">
        Make sure the restaurant name and address match the official CAC registration details.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FileUploadField label="Logo" name="logo" accept="image/*" progress={progress} optional imageOnly />
        <FormField label="Restaurant name" name="restaurantName" defaultValue={vendor?.name} placeholder="Mama Chef Cafe" />
        <FormField label="Full address" name="fullAddress" defaultValue={vendor?.address} placeholder="Fashina Road, Ile-Ife" />
        <FormField label="Service city/area" name="serviceArea" defaultValue={vendor?.location} placeholder="Fashina, Ile-Ife" />
      </div>
    </div>
  );
}

function ContactOwnerStep({ vendor }: { vendor: AdminVendor | null }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Owner/manager name" name="ownerName" defaultValue={vendor?.manager.name} placeholder="Restaurant manager" />
        <FormField label="Phone number" name="phone" defaultValue={vendor?.manager.phone ?? vendor?.phone ?? ""} placeholder="08000000000" />
        <FormField label="Email address" name="email" type="email" defaultValue={vendor?.manager.email ?? ""} placeholder="manager@restaurant.com" />
        <FormField label="Website" name="website" defaultValue={vendor?.operations?.website ?? ""} optional placeholder="https://restaurant.com" />
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
        <h3 className="text-[11px] font-semibold text-[#101828]">Account access</h3>
        <p className="mt-1 text-[10px] text-[#6A7282]">
          A temporary password will be sent to the email address above. The vendor will be required to change it on first login.
        </p>
      </div>
    </div>
  );
}

function OperationsStep({ vendor }: { vendor: AdminVendor | null }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Opening time" name="openingTime" type="time" defaultValue={vendor?.operations?.openingTime ?? ""} />
      <FormField label="Closing time" name="closingTime" type="time" defaultValue={vendor?.operations?.closingTime ?? ""} />
      <FormField label="Open days" name="openDays" defaultValue={vendor?.operations?.openDays ?? ""} placeholder="Mon - Sat" />
      <FormField label="Delivery radius" name="deliveryRadius" defaultValue={vendor?.operations?.deliveryRadius ?? ""} placeholder="5km" />
      <FormField label="Minimum order" name="minimumOrder" type="number" defaultValue={vendor ? String(vendor.clientPrice) : ""} placeholder="2500" />
      <SelectField label="Delivery type" name="deliveryType" defaultValue={vendor?.operations?.deliveryType ?? "Mando rider"} options={["Mando rider", "Vendor delivery", "Pickup only"]} />
    </div>
  );
}

function DocumentsStep({
  vendor,
  progress,
}: {
  vendor?: AdminVendor | null;
  progress: UploadProgress | null;
}) {
  const taxDocument = vendor?.documents?.find((document) =>
    document.name.toLowerCase().includes("tax"),
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <FileUploadField label="CAC certificate" name="cacCertificate" accept="image/*,.pdf" progress={progress} />
      <FileUploadField label="Food Handler certificate" name="foodHandlerCertificate" accept="image/*,.pdf" progress={progress} />
      <FormField label="Tax Identification Number" name="taxIdentificationNumber" defaultValue={taxDocument?.documentNumber ?? ""} placeholder="TIN" />
      <FileUploadField label="Health and safety permit" name="healthSafetyPermit" accept="image/*,.pdf" progress={progress} optional />
    </div>
  );
}

function FileUploadField({
  label,
  name,
  accept,
  optional,
  imageOnly,
  progress,
}: {
  label: string;
  name: string;
  accept: string;
  optional?: boolean;
  imageOnly?: boolean;
  progress: UploadProgress | null;
}) {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImagePreview = Boolean(previewUrl);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">
        {label} {optional ? <span className="font-normal text-[#99A1AF]">(optional)</span> : null}
      </span>
      <input
        type="file"
        name={name}
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setFileName(file?.name ?? "");

          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
        }}
      />
      <div className="mt-2 flex min-h-[118px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-center transition hover:border-[#FE9A00] hover:bg-[#FFFBEB]">
        {isImagePreview ? (
          <img src={previewUrl ?? ""} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#FE9A00] shadow-sm">
            {fileName ? <FaFileAlt className="text-sm" /> : imageOnly ? <FaImage className="text-sm" /> : <FaCloudUploadAlt className="text-base" />}
          </div>
        )}
        <p className="mt-3 max-w-full truncate text-[11px] font-semibold text-[#101828]">
          {fileName || `Upload ${label.toLowerCase()}`}
        </p>
        <p className="mt-1 text-[10px] text-[#99A1AF]">
          {imageOnly ? "PNG or JPG" : "PDF, PNG or JPG"}
        </p>
        {progress && fileName ? (
          <div className="mt-3 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#FE9A00] transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-1 truncate text-[10px] font-semibold text-[#B7791F]">{progress.label}</p>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className={`max-h-[90vh] overflow-y-auto rounded-2xl border border-white/70 bg-white p-5 shadow-2xl ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">{title}</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[10px] font-semibold text-[#6A7282] transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  cancelLabel,
  actionLabel,
  onCancel,
  disabled,
}: {
  cancelLabel: string;
  actionLabel: string;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
      <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282]">
        {cancelLabel}
      </button>
      <button type="submit" disabled={disabled} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {actionLabel}
      </button>
    </div>
  );
}

function FormField({
  label,
  optional,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; optional?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">
        {label} {optional ? <span className="font-normal text-[#99A1AF]">(optional)</span> : null}
      </span>
      <input
        {...props}
        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none transition focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none transition focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
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
