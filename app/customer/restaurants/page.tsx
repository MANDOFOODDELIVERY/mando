"use client";

import {
  ArrowLeftIcon,
  SearchIcon,
} from "@/components/svgs/DefaultIcons";
import Link from "next/link";
import { useEffect, useState } from "react";
import RestaurantCard from "@/components/cards/RestaurantCard";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RestaurantSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  minimumOrderAmount: number;
  preparationMinMinutes: number | null;
  preparationMaxMinutes: number | null;
  serviceArea: {
    name: string;
    city: string;
    state: string;
  };
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatTimeRange(min: number | null, max: number | null) {
  if (!min || !max) return "30-45 mins";
  return `${min}-${max} mins`;
}

const SuggestedRestaurant = () => {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<RestaurantSummary[]>([]);
  const [hasNearbyLocation, setHasNearbyLocation] = useState(false);
  const [restaurantsLoading, setRestaurantsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const readRestaurants = async (url: string) => {
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Unable to load restaurants");

      return response.json() as Promise<{
        restaurants: RestaurantSummary[];
        filteredByServiceArea: boolean;
      }>;
    };

    Promise.all([
      readRestaurants(`${API_BASE_URL}/customer/restaurants?nearby=true`),
      readRestaurants(`${API_BASE_URL}/customer/restaurants`),
    ])
      .then(([nearbyData, allData]) => {
        if (!mounted) return;

        setNearbyRestaurants(nearbyData.restaurants);
        setHasNearbyLocation(nearbyData.filteredByServiceArea);
        setRestaurants(allData.restaurants);
      })
      .catch(() => {
        if (!mounted) return;

        setNearbyRestaurants([]);
        setRestaurants([]);
      })
      .finally(() => {
        if (!mounted) return;

        setRestaurantsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link
          href="/customer/dashboard"
          className="flex items-center space-x-3"
        >
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">
            Suggested Restaurants
          </span>
        </Link>
      </header>

      <div className="flex items-center space-x-3 rounded-md border border-[#cccccc] p-3 w-full mb-4">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search for restaurants..."
          className="placeholder:text-[#A4A4A4] text-[14px] focus:outline-none w-full"
        />
      </div>

      {restaurantsLoading ? (
        <div className="space-y-10">
          <RestaurantSectionSkeleton title="Restaurants Nearby" />
          <RestaurantSectionSkeleton title="All Restaurants" count={4} />
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4">
              <h2 className="text-[22px] font-semibold">Restaurants Nearby</h2>
              <p className="mt-1 text-sm text-[#A4A4A4]">
                {hasNearbyLocation
                  ? "Based on your default delivery area."
                  : "Add a delivery address to see restaurants close to you."}
              </p>
            </div>

            {nearbyRestaurants.length > 0 ? (
              <RestaurantGrid restaurants={nearbyRestaurants} distance="Nearby" />
            ) : (
              <p className="rounded-md bg-[#F7F7F7] p-5 text-center text-sm text-[#A4A4A4]">
                {hasNearbyLocation
                  ? "No nearby restaurants are available in your area yet."
                  : "No nearby restaurants to show until you set a delivery address."}
              </p>
            )}
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-[22px] font-semibold">All Restaurants</h2>
              <p className="mt-1 text-sm text-[#A4A4A4]">
                Every restaurant Mando currently operates.
              </p>
            </div>

            {restaurants.length > 0 ? (
              <RestaurantGrid restaurants={restaurants} distance="Mando" />
            ) : (
              <p className="rounded-md bg-[#F7F7F7] p-5 text-center text-sm text-[#A4A4A4]">
                No restaurants are available right now.
              </p>
            )}
          </section>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

function RestaurantGrid({
  restaurants,
  distance,
}: {
  restaurants: RestaurantSummary[];
  distance: string;
}) {
  return (
    <div className="grid gap-6">
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          id={restaurant.slug}
          name={restaurant.name}
          description={restaurant.description ?? "Mando restaurant"}
          rating="4.7"
          reviews={124}
          timeRange={formatTimeRange(restaurant.preparationMinMinutes, restaurant.preparationMaxMinutes)}
          minOrder={formatNaira(restaurant.minimumOrderAmount)}
          area={`${restaurant.serviceArea.name}, ${restaurant.serviceArea.city}`}
          distance={distance}
          imgUrl={restaurant.imageUrl ?? "/restaurant-dummy.png"}
        />
      ))}
    </div>
  );
}

function RestaurantSectionSkeleton({
  title,
  count = 2,
}: {
  title: string;
  count?: number;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[22px] font-semibold">{title}</h2>
        <div className="mt-2 h-3 w-56 rounded bg-[#EFEFEF]" />
      </div>
      <div className="grid gap-6">
        {Array.from({ length: count }).map((_, index) => (
          <RestaurantSkeleton key={`${title}-skeleton-${index}`} />
        ))}
      </div>
    </section>
  );
}

function RestaurantSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-md border border-[#EFEFEF] bg-white">
      <div className="h-40 bg-[#EFEFEF]" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-2/3 rounded bg-[#EFEFEF]" />
        <div className="h-3 w-full rounded bg-[#EFEFEF]" />
        <div className="h-3 w-4/5 rounded bg-[#EFEFEF]" />
        <div className="flex gap-3 pt-2">
          <div className="h-4 w-20 rounded bg-[#EFEFEF]" />
          <div className="h-4 w-24 rounded bg-[#EFEFEF]" />
        </div>
      </div>
    </div>
  );
}

export default SuggestedRestaurant;
