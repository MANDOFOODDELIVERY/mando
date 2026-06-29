"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  LocationIcon,
} from "@/components/svgs/DefaultIcons";
import { FaStar } from "react-icons/fa";
import ComboCard from "@/components/cards/ComboCard";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RestaurantDetails = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isVerified: boolean;
  minimumOrderAmount: number;
  preparationMinMinutes: number | null;
  preparationMaxMinutes: number | null;
  streetAddress: string;
  serviceArea: {
    name: string;
    city: string;
    state: string;
  };
};

type ComboSummary = {
  id: string;
  name: string;
  priceAmount: number;
  imageUrl: string | null;
  restaurant: {
    name: string;
  };
};

export type RestaurantDetailsProps = {
  restaurantId: string;
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatTimeRange(min: number | null, max: number | null) {
  if (!min || !max) return "30-45 mins";
  return `${min}-${max} mins`;
}

const RestaurantDetailsClient = ({ restaurantId }: RestaurantDetailsProps) => {
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [combos, setCombos] = useState<ComboSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/restaurants/${restaurantId}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load restaurant");

        return response.json() as Promise<{
          restaurant: RestaurantDetails;
          combos: ComboSummary[];
        }>;
      })
      .then((data) => {
        if (!mounted) return;

        setRestaurant(data.restaurant);
        setCombos(data.combos);
      })
      .catch(() => {
        if (!mounted) return;

        setRestaurant(null);
        setCombos([]);
      })
      .finally(() => {
        if (!mounted) return;

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">Loading restaurant...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#141B34]">Restaurant not found</p>
          <Link href="/customer/restaurants" className="mt-4 inline-flex text-[#DFB400]">
            Back to restaurants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 pb-24 space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/customer/restaurants" className="flex items-center gap-3">
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">{restaurant.name}</span>
        </Link>
      </header>

      <section className="relative w-full h-[204px] overflow-hidden rounded-3xl">
        <img
          src={restaurant.imageUrl ?? "/restaurant-dummy.png"}
          alt="Restaurant background"
          className="object-cover w-full h-full"
        />

        <div className="absolute inset-0 bg-black/45" />

        {restaurant.isVerified ? (
          <div className="absolute top-0 right-0 rounded-tr-3xl bg-[#DFB400] px-6 py-3 text-[14px] font-semibold text-white">
            Verified Vendor
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-[12px] text-white">
          <div className="flex flex-col gap-2 mb-6">
            <span>Preparation Time</span>
            <span className="font-semibold">{formatTimeRange(restaurant.preparationMinMinutes, restaurant.preparationMaxMinutes)}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span>Location</span>
            <span className="font-semibold">{restaurant.serviceArea.name}, {restaurant.serviceArea.city}</span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[12px] uppercase text-[#A4A4A4]">
            Restaurant name
          </p>
          <p className="text-[16px] font-semibold">{restaurant.name}</p>
        </div>
        <div className="text-right flex items-center gap-2">
          <FaStar className="text-[#DFB400]" />
          <p className="text-[14px] font-semibold">4.7</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[16px] font-semibold">About Restaurant</p>
        <p className="text-[14px] leading-6 text-[#a4a4a4]">
          {restaurant.description}
        </p>
        <div className="flex items-center gap-2 text-sm text-[#4D4D4D]">
          <LocationIcon />
          <span>{restaurant.streetAddress}</span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[18px] font-semibold">Available combos</p>
            <p className="text-[13px] text-[#A4A4A4]">Choose one of {restaurant.name}&apos;s curated combos.</p>
          </div>
          <p className="text-[13px] font-semibold text-[#141B34]">Min: {formatNaira(restaurant.minimumOrderAmount)}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              title={combo.name}
              price={formatNaira(combo.priceAmount)}
              vendor={restaurant.name}
              imgUrl={combo.imageUrl ?? "/dummy-img.jpg"}
              href={`/customer/featured-combos/${combo.id}`}
            />
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default RestaurantDetailsClient;