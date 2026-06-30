"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ServiceArea = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type SavedAddress = {
  id: string;
  label: string;
  streetAddress: string;
  isDefault: boolean;
  serviceArea: ServiceArea;
};

function formatAddress(address: SavedAddress) {
  return `${address.streetAddress}, ${address.serviceArea.name}`;
}

export default function AddressPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState("");
  const [street, setStreet] = useState("");
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedServiceArea = serviceAreas.find((area) => area.id === selectedServiceAreaId);
  const addressPreview = street.trim() && selectedServiceArea
    ? `${street.trim()}, ${selectedServiceArea.name}`
    : "";

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch(`${API_BASE_URL}/customer/service-areas`).then(async (response) => {
        if (!response.ok) throw new Error("Unable to load delivery locations");

        return response.json() as Promise<{ serviceAreas: ServiceArea[] }>;
      }),
      fetch(`${API_BASE_URL}/customer/addresses`, {
        credentials: "include",
      }).then(async (response) => {
        if (response.status === 401) return { addresses: [] as SavedAddress[] };
        if (!response.ok) throw new Error("Unable to load saved addresses");

        return response.json() as Promise<{ addresses: SavedAddress[] }>;
      }),
    ])
      .then(([serviceAreaData, addressData]) => {
        if (!mounted) return;

        setServiceAreas(serviceAreaData.serviceAreas);
        setSelectedServiceAreaId(serviceAreaData.serviceAreas[0]?.id ?? "");
        setSavedAddresses(addressData.addresses);
      })
      .catch((error) => {
        if (!mounted) return;

        showToast(error instanceof Error ? error.message : "Unable to load delivery locations", "error");
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingAreas(false);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  function clear() {
    setSelectedServiceAreaId(serviceAreas[0]?.id ?? "");
    setStreet("");
  }

  async function save() {
    if (!selectedServiceAreaId) {
      showToast("Please choose a delivery location", "error");
      return;
    }

    if (!street.trim()) {
      showToast("Please enter your street address", "error");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/addresses`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceAreaId: selectedServiceAreaId,
          label: "Home",
          streetAddress: street.trim(),
          isDefault: true,
        }),
      });

      if (response.status === 401) {
        showToast("Please log in to save an address", "error");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to save address");
      }

      showToast("Address saved successfully", "success");
      await fetch(`${API_BASE_URL}/customer/addresses`, {
        credentials: "include",
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return response.json() as Promise<{ addresses: SavedAddress[] }>;
        })
        .then((data) => {
          if (data) setSavedAddresses(data.addresses);
        });
      router.push("/customer/dashboard");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save address", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link href="/customer/dashboard" className="flex items-center space-x-3">
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">Address</span>
        </Link>
      </header>

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Select your location</h3>
        <div className="flex flex-wrap gap-3">
          {loadingAreas ? (
            <p className="text-sm text-[#A4A4A4]">Loading delivery locations...</p>
          ) : null}
          {!loadingAreas && serviceAreas.length === 0 ? (
            <p className="text-sm text-[#A4A4A4]">No delivery locations available yet.</p>
          ) : null}
          {serviceAreas.map((area) => {
            const active = selectedServiceAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedServiceAreaId(area.id)}
                className={`px-4 py-2 rounded-md border ${
                  active ? "border-[#DFB400] bg-[#FFF7E0] text-[#000]" : "border-gray-300 text-[#6B6B6B]"
                }`}
              >
                {area.name}
              </button>
            );
          })}
        </div>
      </section>

      {savedAddresses.length > 0 ? (
        <section className="mb-8">
          <h3 className="text-sm text-[#A4A4A4] mb-3">Saved addresses</h3>
          <div className="space-y-3">
            {savedAddresses.map((address) => (
              <div key={address.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#141B34]">{address.label}</p>
                    <p className="mt-1 text-sm text-[#4D4D4D]">{formatAddress(address)}</p>
                  </div>
                  {address.isDefault ? (
                    <span className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">
                      Default
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Enter your street address</h3>
        <div className="border border-gray-200 rounded-md p-4 relative">
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={selectedServiceArea ? `e.g. 12 ${selectedServiceArea.name} street` : "Select a location first"}
            className="w-full focus:outline-none text-[14px]"
          />
        </div>
          {addressPreview ? (
            <p className="mt-3 rounded-xl bg-[#FFF7E0] px-4 py-3 text-sm font-semibold text-[#141B34]">
              {addressPreview}
            </p>
          ) : null}
          <div className="text-sm text-[#A4A4A4] flex justify-end mt-3">Can&apos;t find your location?</div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
        <button onClick={clear} className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600">
          Clear
        </button>
        <button disabled={saving} onClick={save} className="flex-1 py-3 rounded-md bg-[#DFB400] text-white font-semibold disabled:opacity-60">
          {saving ? "Saving..." : "Save address"}
        </button>
      </div>
    </div>
  );
}
