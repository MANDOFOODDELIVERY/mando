"use client";

import ComboCard from "@/components/cards/ComboCard";
import CustomerSearchDropdown from "@/components/CustomerSearchDropdown";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FiMessageCircle } from "react-icons/fi";
import {
  LocationIcon,
  NotificationIcon,
  SearchIcon,
} from "@/components/svgs/DefaultIcons";
import useNotificationStore from "@/store/notificationStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const SUPPORT_WHATSAPP_URL =
  `https://wa.me/2349164716562?text=${encodeURIComponent("Hi Mando Support, I need help with")}`;

type SavedAddress = {
  id: string;
  streetAddress: string;
  isDefault: boolean;
  serviceArea: {
    name: string;
  };
};

type ComboSummary = {
  id: string;
  name: string;
  priceAmount: number;
  imageUrl: string | null;
  ratingAverage: number;
  reviewCount: number;
  restaurant: {
    name: string;
  };
};

function formatAddress(address: SavedAddress) {
  return `${address.streetAddress}, ${address.serviceArea.name}`;
}

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

const Dashboard = () => {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount());
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const [deliveryAddress, setDeliveryAddress] = useState("Add delivery address");
  const [combos, setCombos] = useState<ComboSummary[]>([]);
  const [combosLoading, setCombosLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/addresses`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;

        return response.json() as Promise<{ addresses: SavedAddress[] }>;
      })
      .then((data) => {
        if (!mounted || !data) return;

        const defaultAddress = data.addresses.find((address) => address.isDefault) ?? data.addresses[0];

        if (defaultAddress) {
          setDeliveryAddress(formatAddress(defaultAddress));
        }
      });

    fetch(`${API_BASE_URL}/customer/combos`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load combos");

        return response.json() as Promise<{ combos: ComboSummary[] }>;
      })
      .then((data) => {
        if (!mounted) return;

        setCombos(data.combos.slice(0, 6));
      })
      .catch(() => {
        if (!mounted) return;

        setCombos([]);
      })
      .finally(() => {
        if (!mounted) return;

        setCombosLoading(false);
      });

    fetch(`${API_BASE_URL}/customer/notifications`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;

        return response.json() as Promise<{ notifications: Parameters<typeof setNotifications>[0] }>;
      })
      .then((data) => {
        if (!mounted || !data) return;

        setNotifications(data.notifications);
      });

    return () => {
      mounted = false;
    };
  }, [setNotifications]);

  useEffect(() => {
    const storedSearches = localStorage.getItem("mando_recent_searches");
    if (storedSearches) setRecentSearches(JSON.parse(storedSearches) as string[]);
  }, []);

  const comboSearchResults = useMemo(
    () =>
      combos
        .filter((combo) => {
          const query = searchQuery.trim().toLowerCase();
          if (!query) return true;
          return `${combo.name} ${combo.restaurant.name}`.toLowerCase().includes(query);
        })
        .map((combo) => ({
          label: combo.name,
          href: `/customer/featured-combos/${combo.id}`,
          meta: combo.restaurant.name,
        })),
    [combos, searchQuery],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) return;

    const nextSearches = Array.from(new Set([query, ...recentSearches])).slice(0, 6);
    setRecentSearches(nextSearches);
    localStorage.setItem("mando_recent_searches", JSON.stringify(nextSearches));
    router.push(`/customer/featured-combos?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="p-6 pb-28">
      <div className="flex justify-between items-center ">
        <Link href="/customer/address" className="flex items-center space-x-3">
          <div className="w-[43px] h-[47px] flex items-center justify-center bg-[#F7F7F7] rounded-md">
            <LocationIcon />
          </div>
          <div className="flex flex-col">
            <p className="text-[14px] text-[#A4A4A4]">Delivery to</p>
            <h2 className="max-w-[190px] truncate text-[16px] font-semibold">
              {deliveryAddress}
            </h2>
          </div>
        </Link>
        <div className="relative">
          <Link href="/customer/notifications" className="bg-[#FFDB431A] w-[49px] h-[49px] rounded-full flex items-center justify-center relative">
            <NotificationIcon />
          </Link>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#DFB400] px-1.5 text-[10px] font-semibold text-black">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <h2 className="text-[24px] font-bold my-10">
        Everything you want, delivered swiftly and{" "}
        <span className="text-[#A4A4A4]">right to your door</span>{" "}
      </h2>

      <div className="relative">
        <form onSubmit={submitSearch} className="flex items-center space-x-3 rounded-md border border-[#cccccc] p-3 w-full">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search for combos..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full placeholder:text-[#A4A4A4] text-[14px] focus:outline-none"
          />
        </form>
        <CustomerSearchDropdown
          query={searchQuery}
          results={comboSearchResults}
          recentSearches={recentSearches}
          onRecentSearch={setSearchQuery}
          filters={[
            { label: "Combos", href: `/customer/featured-combos?q=${encodeURIComponent(searchQuery)}` },
            { label: "Restaurants", href: `/customer/restaurants?q=${encodeURIComponent(searchQuery)}` },
            { label: "Nearby", href: "/customer/restaurants?filter=nearby" },
          ]}
        />
      </div>

      <div className="mt-10">
        <img src="/ad.png" className="w-full" alt="promo-banner" />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-semibold">Combos</h2>
          <Link href="/customer/featured-combos" className="text-[18px] text-[#A4A4A4]">
            See all combos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-6">
          {combosLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <ComboSkeleton key={`combo-skeleton-${index}`} />
            ))
          ) : combos.length > 0 ? (
            combos.map((combo) => (
              <ComboCard
                key={combo.id}
                title={combo.name}
                price={formatNaira(combo.priceAmount)}
                vendor={combo.restaurant.name}
                rating={`${combo.ratingAverage || "New"}${combo.reviewCount ? ` (${combo.reviewCount})` : ""}`}
                imgUrl={combo.imageUrl ?? "/dummy-img.jpg"}
                href={`/customer/featured-combos/${combo.id}`}
              />
            ))
          ) : (
            <p className="col-span-2 rounded-md bg-[#F7F7F7] p-5 text-center text-sm text-[#A4A4A4]">
              No combos are available right now.
            </p>
          )}
        </div>
      </div>

      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with customer support"
        title="Customer support"
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-[0_14px_30px_rgba(37,211,102,0.35)]"
      >
        <FiMessageCircle className="h-6 w-6" />
        <span className="text-sm font-semibold">Help</span>
      </a>

      <BottomNav />
    </div>
  );
};

function ComboSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-md border border-[#EFEFEF] bg-white">
      <div className="aspect-square bg-[#EFEFEF]" />
      <div className="space-y-3 p-3">
        <div className="h-4 w-4/5 rounded bg-[#EFEFEF]" />
        <div className="h-3 w-3/5 rounded bg-[#EFEFEF]" />
        <div className="h-4 w-1/2 rounded bg-[#EFEFEF]" />
      </div>
    </div>
  );
}

export default Dashboard;
