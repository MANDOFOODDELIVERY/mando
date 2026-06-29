"use client";

import BottomNav from "@/components/BottomNav";
import ComboCard from "@/components/cards/ComboCard";
import { ArrowLeftIcon, SearchIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ComboSummary = {
  id: string;
  name: string;
  priceAmount: number;
  imageUrl: string | null;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

const FeaturedMealCombos = () => {
  const [combos, setCombos] = useState<ComboSummary[]>([]);
  const [filteredByServiceArea, setFilteredByServiceArea] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/combos`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load combos");

        return response.json() as Promise<{
          combos: ComboSummary[];
          filteredByServiceArea: boolean;
        }>;
      })
      .then((data) => {
        if (!mounted) return;

        setCombos(data.combos);
        setFilteredByServiceArea(data.filteredByServiceArea);
      })
      .catch(() => {
        if (!mounted) return;

        setCombos([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const groupedCombos = useMemo(() => {
    const groups = new Map<string, { restaurant: ComboSummary["restaurant"]; combos: ComboSummary[] }>();

    combos.forEach((combo) => {
      const group = groups.get(combo.restaurant.id) ?? {
        restaurant: combo.restaurant,
        combos: [],
      };

      group.combos.push(combo);
      groups.set(combo.restaurant.id, group);
    });

    return Array.from(groups.values());
  }, [combos]);

  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link
          href="/customer/dashboard"
          className="flex items-center space-x-3"
        >
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">
            Featured Meal Combos
          </span>
        </Link>
      </header>

      <div className="flex items-center space-x-3 rounded-md border border-[#cccccc] p-3 w-full">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search for combos..."
          className="placeholder:text-[#A4A4A4] text-[14px] focus:outline-none"
        />
      </div>

      <p className="mt-4 text-sm text-[#A4A4A4]">
        {filteredByServiceArea
          ? "Showing combos available around your delivery location."
          : "Showing all available Mando combos."}
      </p>

      <div className="space-y-10 mt-10">
        {groupedCombos.map((group) => (
          <section key={group.restaurant.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[22px] font-semibold">{group.restaurant.name}</h2>
                <p className="text-sm text-[#A4A4A4] mt-1">
                  {group.combos.length} combos available
                </p>
              </div>
              <Link href={`/customer/restaurants/${group.restaurant.slug}`} className="text-[16px] text-[#A4A4A4]">
                Check out restaurant
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {group.combos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  title={combo.name}
                  price={formatNaira(combo.priceAmount)}
                  vendor={group.restaurant.name}
                  imgUrl={combo.imageUrl ?? "/dummy-img.jpg"}
                  href={`/customer/featured-combos/${combo.id}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default FeaturedMealCombos;