"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FaBan,
  FaBicycle,
  FaCarSide,
  FaDownload,
  FaEllipsisH,
  FaFilter,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaPlus,
  FaRoute,
  FaWallet,
} from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

type RiderStatus = "active" | "offline" | "on delivery" | "suspended";
type VehicleType = "Motorcycle" | "Bicycle" | "Car";

type Rider = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  address: string;
  status: RiderStatus;
  availability: "Online" | "Offline" | "Busy";
  location: string;
  vehicleType: VehicleType;
  plateNumber: string;
  vehicleColor: string | null;
  vehicleModel: string | null;
  lastSeen: string;
  orders: number;
  rating: number;
  joined: string;
  totalDeliveries: number;
  totalEarnings: number;
  completionRate: number;
  riderCode: string;
  documents: RiderDocument[];
};

type RiderDocument = {
  id: string;
  type: string;
  name: string;
  fileUrl: string | null;
  status: "pending" | "uploaded" | "verified" | "rejected";
};

type ServiceArea = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type RidersResponse = {
  stats: {
    total: number;
    active: number;
    onDelivery: number;
    offline: number;
    suspended: number;
  };
  riders: Rider[];
  serviceAreas: ServiceArea[];
};

const emptyResponse: RidersResponse = {
  stats: { total: 0, active: 0, onDelivery: 0, offline: 0, suspended: 0 },
  riders: [],
  serviceAreas: [],
};

const vehicleOptions: VehicleType[] = ["Motorcycle", "Bicycle", "Car"];
const vehicleStyles: Record<VehicleType, string> = {
  Motorcycle: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
  Bicycle: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
  Car: "border-[#E9D5FF] bg-[#FAF5FF] text-[#9333EA]",
};
const zoneStyles = [
  "bg-[#FFF7E0] text-[#B7791F] ring-[#FDE68A]",
  "bg-[#ECFDF5] text-[#047857] ring-[#A7F3D0]",
  "bg-[#EFF6FF] text-[#1D4ED8] ring-[#BFDBFE]",
  "bg-[#FDF2F8] text-[#BE185D] ring-[#FBCFE8]",
];

export default function AdminRidersPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [data, setData] = useState<RidersResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningRider, setAssigningRider] = useState<Rider | null>(null);
  const [updatingRiderId, setUpdatingRiderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "All",
    availability: "All",
    location: "All",
    vehicleType: "All",
  });

  const serviceAreaNames = useMemo(
    () => Array.from(new Set(data.serviceAreas.map((area) => area.name))),
    [data.serviceAreas],
  );

  async function loadRiders() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to load riders");

      const payload = (await response.json()) as RidersResponse;
      setData(payload);
      setSelectedRider((current) => {
        if (!payload.riders.length) return null;
        if (!current) return payload.riders[0];
        return payload.riders.find((rider) => rider.id === current.id) ?? payload.riders[0];
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load riders", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRiders();
  }, []);

  const filteredRiders = useMemo(
    () =>
      data.riders.filter((rider) =>
        (filters.status === "All" || rider.status === filters.status) &&
        (filters.availability === "All" || rider.availability === filters.availability) &&
        (filters.location === "All" || rider.location === filters.location) &&
        (filters.vehicleType === "All" || rider.vehicleType === filters.vehicleType),
      ),
    [data.riders, filters],
  );

  const stats = [
    { id: 1, statTitle: "Total Riders", qty: String(data.stats.total), crease: "All riders", theme: "bg-[#FFFBEB]", increase: true, icon: <FaMotorcycle />, iconColor: "text-[#FE9A00]" },
    { id: 2, statTitle: "Active", qty: String(data.stats.active), crease: "Available riders", theme: "bg-[#ECFDF5]", increase: true, icon: <FaRoute />, iconColor: "text-[#10B981]" },
    { id: 3, statTitle: "On Delivery", qty: String(data.stats.onDelivery), crease: "Currently assigned", theme: "bg-[#EFF6FF]", increase: true, icon: <FaMapMarkerAlt />, iconColor: "text-[#2B7FFF]" },
    { id: 4, statTitle: "Offline", qty: String(data.stats.offline), crease: "Not available", theme: "bg-[#F3F4F6]", increase: false, icon: <FaEllipsisH />, iconColor: "text-[#6A7282]" },
    { id: 5, statTitle: "Suspended", qty: String(data.stats.suspended), crease: "Restricted access", theme: "bg-[#FEF2F2]", increase: false, icon: <FaBan />, iconColor: "text-[#FF6467]" },
  ];

  async function updateRiderStatus(rider: Rider) {
    const nextStatus = rider.status === "suspended" ? "active" : "suspended";
    setUpdatingRiderId(rider.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders/${rider.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Unable to update rider status");

      const payload = (await response.json()) as { rider: Rider };
      setSelectedRider(payload.rider);
      await loadRiders();
      showToast(nextStatus === "suspended" ? "Rider suspended" : "Rider reactivated", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update rider status", "error");
    } finally {
      setUpdatingRiderId(null);
    }
  }

  async function assignZone(rider: Rider, serviceAreas: string[]) {
    if (!serviceAreas.length) {
      showToast("Choose at least one service area", "error");
      return;
    }
    setUpdatingRiderId(rider.id);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/riders/${rider.id}/zone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ serviceArea: serviceAreas[0], serviceAreas }),
      });
      if (!response.ok) throw new Error("Unable to assign rider zone");

      const payload = (await response.json()) as { rider: Rider };
      setSelectedRider(payload.rider);
      setAssigningRider(null);
      await loadRiders();
      showToast("Rider zone updated", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to assign rider zone", "error");
    } finally {
      setUpdatingRiderId(null);
    }
  }

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Riders</h2>
          <p className="text-[11px] text-[#99A1AF]">Manage rider availability, zones, performance and payouts.</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-5 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <section className={`mt-8 grid gap-5 ${selectedRider ? "grid-cols-[1fr_400px]" : "grid-cols-1"}`}>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Status" value={filters.status} options={["All", "active", "on delivery", "offline", "suspended"]} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
              <FilterSelect label="Availability" value={filters.availability} options={["All", "Online", "Busy", "Offline"]} onChange={(value) => setFilters((current) => ({ ...current, availability: value }))} />
              <FilterSelect label="Location" value={filters.location} options={["All", ...serviceAreaNames]} onChange={(value) => setFilters((current) => ({ ...current, location: value }))} />
              <FilterSelect label="Vehicle type" value={filters.vehicleType} options={["All", ...vehicleOptions]} onChange={(value) => setFilters((current) => ({ ...current, vehicleType: value }))} />
              <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
                <FaFilter className="text-[10px]" />
                More filters
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
                <FaDownload className="text-[10px]" />
                Export
              </button>
              <Link href="/admin/dashboard/riders/commissions" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
                <FaWallet className="text-[10px]" />
                Commission & Withdrawal
              </Link>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-[#FE9A00] px-3 py-2 text-[10px] font-semibold text-white">
                <FaPlus className="text-[10px]" />
                Add Rider
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1.45fr_0.8fr_0.9fr_1fr_0.9fr_0.6fr_0.6fr_0.85fr_0.7fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Rider</p>
            <p>Status</p>
            <p>Availability</p>
            <p>Location</p>
            <p>Vehicle Type</p>
            <p>Orders</p>
            <p>Rating</p>
            <p>Joined</p>
            <p>Action</p>
          </div>
          <div className="space-y-1">
            {loading ? <TableSkeleton /> : null}
            {!loading && filteredRiders.length === 0 ? (
              <div className="rounded-lg px-3 py-8 text-center text-[11px] text-[#99A1AF]">No riders found.</div>
            ) : null}
            {!loading && filteredRiders.map((rider) => (
              <button
                key={rider.id}
                onClick={() => setSelectedRider(rider)}
                className={`grid w-full grid-cols-[1.45fr_0.8fr_0.9fr_1fr_0.9fr_0.6fr_0.6fr_0.85fr_0.7fr] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedRider?.id === rider.id ? "bg-[#FFF7E0]" : ""}`}
              >
                <RiderIdentity rider={rider} />
                <StatusPill status={rider.status} />
                <AvailabilityPill availability={rider.availability} />
                <p>{rider.location}</p>
                <p>{rider.vehicleType}</p>
                <p>{rider.orders}</p>
                <p>{rider.rating.toFixed(1)}</p>
                <p>{formatDate(rider.joined)}</p>
                <p className="font-semibold text-[#FE9A00]">View</p>
              </button>
            ))}
          </div>
        </div>

        {selectedRider ? (
          <aside className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <RiderIdentity rider={selectedRider} large />
              <button onClick={() => setSelectedRider(null)} className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
            </div>

            <PanelSection title="Rider Information">
              <DetailRow label="Rider code" value={selectedRider.riderCode} />
              <DetailRow label="Email address" value={selectedRider.email} />
              <DetailRow label="Phone number" value={selectedRider.phone} />
              <DetailRow label="Address" value={selectedRider.address} />
            </PanelSection>

            <PanelSection title="Vehicle Details">
              <DetailRow label="Vehicle" value={selectedRider.vehicleType} />
              <DetailRow label="Plate number" value={selectedRider.plateNumber} />
              <DetailRow label="Color" value={selectedRider.vehicleColor ?? "Not recorded"} />
              <DetailRow label="Model" value={selectedRider.vehicleModel ?? "Not recorded"} />
              <DetailRow label="Last seen" value={selectedRider.lastSeen} />
            </PanelSection>

            <PanelSection title="Documents">
              {selectedRider.documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]">
                  <div>
                    <p className="font-semibold text-[#101828]">{document.name}</p>
                    {document.fileUrl ? <a href={document.fileUrl} target="_blank" className="text-[#FE9A00]" rel="noreferrer">View file</a> : <p className="text-[#99A1AF]">No file uploaded</p>}
                  </div>
                  <StatusPill status={document.status} />
                </div>
              ))}
            </PanelSection>

            <PanelSection title="Performance Summary">
              <div className="grid grid-cols-2 gap-3">
                <PerformanceCard title="Total Deliveries" value={String(selectedRider.totalDeliveries)} theme="bg-[#EFF6FF]" />
                <PerformanceCard title="Total Earnings" value={formatCurrency(selectedRider.totalEarnings)} theme="bg-[#ECFDF5]" />
                <PerformanceCard title="Rating" value={selectedRider.rating.toFixed(1)} theme="bg-[#FFFBEB]" />
                <PerformanceCard title="Completion Rate" value={`${selectedRider.completionRate}%`} theme="bg-[#F5F3FF]" />
              </div>
            </PanelSection>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button disabled={updatingRiderId === selectedRider.id} onClick={() => setAssigningRider(selectedRider)} className="rounded-lg bg-[#FE9A00] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60">Assign Zone</button>
              <button disabled={updatingRiderId === selectedRider.id} onClick={() => updateRiderStatus(selectedRider)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600 disabled:opacity-60">
                {selectedRider.status === "suspended" ? "Reactivate" : "Suspend"}
              </button>
            </div>
          </aside>
        ) : null}
      </section>

      {showAddModal ? (
        <AddRiderModal
          serviceAreas={serviceAreaNames}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => {
            setShowAddModal(false);
            await loadRiders();
            showToast("Rider added successfully", "success");
          }}
        />
      ) : null}
      {assigningRider ? (
        <AssignZoneModal
          rider={assigningRider}
          serviceAreas={serviceAreaNames}
          saving={updatingRiderId === assigningRider.id}
          onClose={() => setAssigningRider(null)}
          onSave={(areas) => void assignZone(assigningRider, areas)}
        />
      ) : null}
    </div>
  );
}

function AddRiderModal({ serviceAreas, onClose, onSaved }: { serviceAreas: string[]; onClose: () => void; onSaved: () => void }) {
  const showToast = useToastStore((s) => s.showToast);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>("Motorcycle");
  const [selectedServiceAreas, setSelectedServiceAreas] = useState<string[]>(serviceAreas[0] ? [serviceAreas[0]] : []);
  const steps = ["Personal info", "Vehicle & zone", "Documents", "Bank details"];

  useEffect(() => {
    if (!selectedServiceAreas.length && serviceAreas[0]) setSelectedServiceAreas([serviceAreas[0]]);
  }, [selectedServiceAreas.length, serviceAreas]);

  async function submitRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    const formData = new FormData(event.currentTarget);

    setSaving(true);
    setUploadProgress(null);
    try {
      const [governmentIdUrl, vehicleLicenseUrl, proofOfAddressUrl] = await Promise.all([
        uploadAdminDocument(getSelectedFile(formData, "governmentIdFile"), setUploadProgress),
        uploadAdminDocument(getSelectedFile(formData, "vehicleLicenseFile"), setUploadProgress),
        uploadAdminDocument(getSelectedFile(formData, "proofOfAddressFile"), setUploadProgress),
      ]);
      const body = {
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        vehicleType,
        plateNumber: String(formData.get("plateNumber") ?? ""),
        vehicleColor: String(formData.get("vehicleColor") ?? ""),
        vehicleModel: String(formData.get("vehicleModel") ?? ""),
        serviceArea: selectedServiceAreas[0] ?? serviceAreas[0] ?? "",
        serviceAreas: selectedServiceAreas,
        governmentIdUrl,
        vehicleLicenseUrl,
        proofOfAddressUrl,
        bankName: String(formData.get("bankName") ?? ""),
        accountNumber: String(formData.get("accountNumber") ?? ""),
        accountName: String(formData.get("accountName") ?? ""),
      };
      const response = await fetch(`${API_BASE_URL}/admin/riders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to add rider");
      onSaved();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to add rider", "error");
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <form onSubmit={submitRider} noValidate className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">Add Rider</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">Onboard rider details, zone, documents and bank account.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {steps.map((item, index) => (
            <button type="button" key={item} onClick={() => setStep(index + 1)} className={`rounded-lg border px-3 py-2 text-left text-[10px] font-semibold ${step === index + 1 ? "border-[#FE9A00] bg-[#FFFBEB]" : "border-gray-200 text-[#6A7282]"}`}>
              <span className="block text-[9px] text-[#99A1AF]">Step {index + 1}</span>
              {item}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <div className={step === 1 ? "block" : "hidden"}><PersonalInfoStep /></div>
          <div className={step === 2 ? "block" : "hidden"}><VehicleZoneStep serviceAreas={serviceAreas} selectedServiceAreas={selectedServiceAreas} vehicleType={vehicleType} onServiceAreaToggle={(area) => setSelectedServiceAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area])} onVehicleTypeChange={setVehicleType} /></div>
          <div className={step === 3 ? "block" : "hidden"}><DocumentsStep progress={uploadProgress} /></div>
          <div className={step === 4 ? "block" : "hidden"}><BankDetailsStep /></div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button type="button" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282]">
            {step === 1 ? "Cancel" : "Back"}
          </button>
          <button disabled={saving} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
            {saving ? "Saving..." : step === 4 ? "Add rider" : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PersonalInfoStep() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField name="fullName" label="Full name" placeholder="Rider full name" required />
      <FormField name="email" label="Email address" type="email" placeholder="rider@mando.ng" required />
      <FormField name="phone" label="Phone number" placeholder="08000000000" required />
      <FormField name="address" label="Home address" placeholder="Rider residential address" required />
    </div>
  );
}

function VehicleZoneStep({
  serviceAreas,
  selectedServiceAreas,
  vehicleType,
  onServiceAreaToggle,
  onVehicleTypeChange,
}: {
  serviceAreas: string[];
  selectedServiceAreas: string[];
  vehicleType: VehicleType;
  onServiceAreaToggle: (value: string) => void;
  onVehicleTypeChange: (value: VehicleType) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold text-[#6A7282]">Vehicle type</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {vehicleOptions.map((vehicle) => (
            <VehicleOption key={vehicle} vehicle={vehicle} selected={vehicleType === vehicle} onSelect={() => onVehicleTypeChange(vehicle)} />
          ))}
        </div>
      </div>
      <FormField name="plateNumber" label="Plate number" placeholder="ABC-123-XY" />
      <div className="grid grid-cols-2 gap-4">
        <FormField name="vehicleColor" label="Vehicle color" placeholder="Black" />
        <FormField name="vehicleModel" label="Vehicle model" placeholder="Bajaj Boxer" />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#6A7282]">Assign zone</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {serviceAreas.map((area, index) => (
            <button type="button" key={`${area}-${index}`} onClick={() => onServiceAreaToggle(area)} className={`rounded-full px-3 py-2 text-[10px] font-semibold ring-1 ${zoneStyles[index % zoneStyles.length]} ${selectedServiceAreas.includes(area) ? "shadow-sm outline outline-2 outline-offset-2 outline-[#FE9A00]" : ""}`}>
              <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-current" />
              {area}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({ progress }: { progress: UploadProgress | null }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <UploadBox label="Government ID" inputName="governmentIdFile" progress={progress} />
      <UploadBox label="Vehicle license" inputName="vehicleLicenseFile" progress={progress} />
      <UploadBox label="Proof of address" inputName="proofOfAddressFile" progress={progress} />
    </div>
  );
}

function BankDetailsStep() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField name="bankName" label="Bank name" placeholder="Access Bank" required />
      <FormField name="accountNumber" label="Account number" placeholder="0123456789" required />
      <FormField name="accountName" label="Account name" placeholder="Rider account name" required />
      <FormField name="payoutNote" label="Payout note" placeholder="Optional payout note" />
    </div>
  );
}

function VehicleOption({ vehicle, selected, onSelect }: { vehicle: VehicleType; selected: boolean; onSelect: () => void }) {
  const icon = vehicle === "Motorcycle" ? <FaMotorcycle /> : vehicle === "Bicycle" ? <FaBicycle /> : <FaCarSide />;
  return (
    <button type="button" onClick={onSelect} className={`flex min-h-[118px] flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center text-[11px] font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${vehicleStyles[vehicle]} ${selected ? "outline outline-2 outline-offset-2 outline-[#FE9A00]" : ""}`}>
      <span className="text-4xl">{icon}</span>
      <span className="text-[#101828]">{vehicle}</span>
    </button>
  );
}

function AssignZoneModal({
  rider,
  serviceAreas,
  saving,
  onClose,
  onSave,
}: {
  rider: Rider;
  serviceAreas: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (areas: string[]) => void;
}) {
  const initialAreas = rider.location
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initialAreas);

  function toggleArea(area: string) {
    setSelectedAreas((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area],
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">Assign Rider Zones</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">Choose one or more service areas for {rider.name}.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282] disabled:opacity-60">Close</button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {serviceAreas.map((area, index) => (
            <button
              type="button"
              key={`${area}-${index}`}
              onClick={() => toggleArea(area)}
              disabled={saving}
              className={`rounded-2xl p-4 text-left text-[11px] font-semibold ring-1 transition disabled:opacity-60 ${zoneStyles[index % zoneStyles.length]} ${selectedAreas.includes(area) ? "outline outline-2 outline-offset-2 outline-[#FE9A00]" : ""}`}
            >
              <span className="mb-3 inline-flex h-3 w-3 rounded-full bg-current" />
              <span className="block text-[#101828]">{area}</span>
              <span className="mt-1 block text-[10px] opacity-70">{selectedAreas.includes(area) ? "Selected" : "Tap to assign"}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282] disabled:opacity-60">Cancel</button>
          <button type="button" onClick={() => onSave(selectedAreas)} disabled={saving} className="rounded-lg bg-[#FE9A00] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60">
            {saving ? "Assigning..." : "Assign zones"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.currentTarget.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
      <option value={value}>{label}: {value}</option>
      {options.filter((option) => option !== value).map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}

function RiderIdentity({ rider, large }: { rider: Rider; large?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`${large ? "h-11 w-11 text-sm" : "h-7 w-7 text-[10px]"} flex shrink-0 items-center justify-center rounded-full bg-[#FE9A00] font-semibold text-white`}>
        {rider.initials}
      </div>
      <div className="min-w-0">
        <h3 className={`${large ? "text-sm" : "text-[10px]"} truncate font-semibold text-[#101828]`}>{rider.name}</h3>
        <p className="truncate text-[10px] text-[#99A1AF]">{rider.phone}</p>
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-5"><h4 className="text-xs font-semibold text-[#101828]">{title}</h4><div className="mt-3 space-y-2">{children}</div></section>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 rounded-lg bg-gray-50 p-3 text-[10px]"><p className="text-[#99A1AF]">{label}</p><p className="max-w-[62%] text-right font-semibold text-[#101828]">{value}</p></div>;
}

function PerformanceCard({ title, value, theme }: { title: string; value: string; theme: string }) {
  return <div className={`rounded-xl ${theme} p-3`}><p className="text-[10px] text-[#6A7282]">{title}</p><p className="mt-2 text-sm font-semibold text-[#101828]">{value}</p></div>;
}

function StatusPill({ status }: { status: RiderStatus | string }) {
  const positive = status === "active";
  const busy = status === "on delivery";
  const negative = status === "suspended";
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${positive ? "bg-[#DCFCE7] text-[#10B981]" : busy ? "bg-[#EFF6FF] text-[#2B7FFF]" : negative ? "bg-[#FEF2F2] text-[#FF6467]" : "bg-gray-100 text-[#6A7282]"}`}>{status}</p>;
}

function AvailabilityPill({ availability }: { availability: Rider["availability"] }) {
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold ${availability === "Online" ? "bg-[#DCFCE7] text-[#10B981]" : availability === "Busy" ? "bg-[#FFF7E0] text-[#B7791F]" : "bg-gray-100 text-[#6A7282]"}`}>{availability}</p>;
}

function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}

function UploadBox({ label, inputName, progress }: { label: string; inputName: string; progress: UploadProgress | null }) {
  const [fileName, setFileName] = useState("");
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center hover:border-[#FE9A00] hover:bg-[#FFFBEB]">
      <FaDownload className="mx-auto text-[#FE9A00]" />
      <p className="mt-3 text-[11px] font-semibold text-[#101828]">{label}</p>
      <p className="mt-1 text-[10px] text-[#99A1AF]">{fileName || "PDF or image, max 8MB"}</p>
      {progress ? <p className="mt-2 text-[10px] font-semibold text-[#FE9A00]">{progress.label} - {progress.percent}%</p> : null}
      <input name={inputName} type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")} />
    </label>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

type CloudinarySignatureResponse = {
  upload: {
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
    uploadUrl: string;
  };
};

type CloudinaryUploadResponse = {
  secure_url: string;
};

type UploadProgress = {
  label: string;
  percent: number;
};

function getSelectedFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadAdminDocument(file: File | null, onProgress?: (progress: UploadProgress) => void) {
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error("Documents must be 8MB or smaller");
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") throw new Error("Documents must be an image or PDF");

  onProgress?.({ label: `Preparing ${file.name}`, percent: 20 });
  const signatureResponse = await fetch(`${API_BASE_URL}/uploads/signature`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "vendor_document" }),
  });
  if (!signatureResponse.ok) throw new Error("Unable to prepare document upload");

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
  if (!cloudinaryResponse.ok) throw new Error("Unable to upload document");

  const uploadedFile = (await cloudinaryResponse.json()) as CloudinaryUploadResponse;
  onProgress?.({ label: `${file.name} uploaded`, percent: 100 });
  return uploadedFile.secure_url;
}
