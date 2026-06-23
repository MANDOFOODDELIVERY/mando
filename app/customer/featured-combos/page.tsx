"use client";

import BottomNav from "@/components/BottomNav";
import ComboCard from "@/components/cards/ComboCard";
import { ArrowLeftIcon, SearchIcon } from "@/components/svgs/DefaultIcons";
import Link from "next/link";

const RESTAURANT_COMBOS = [
  {
    id: "iya-ruka",
    restaurant: "Iya Ruka Restaurant",
    combos: [
      { id: "1-1", title: "Ofada Rice + Beef Stew", price: "N3,500", vendor: "Iya Ruka Restaurant" },
      { id: "1-2", title: "Amala + Ewedu Soup", price: "N3,200", vendor: "Iya Ruka Restaurant" },
    ],
  },
  {
    id: "mama-chef",
    restaurant: "Mama Chef Cafe",
    combos: [
      { id: "2-1", title: "Jollof + Chicken", price: "N3,200", vendor: "Mama Chef Cafe" },
      { id: "2-2", title: "Rice + Stew", price: "N2,600", vendor: "Mama Chef Cafe" },
    ],
  },
  {
    id: "spice-hub",
    restaurant: "Spice Hub",
    combos: [
      { id: "3-1", title: "Fried Rice + Suya", price: "N3,100", vendor: "Spice Hub" },
      { id: "3-2", title: "Efo Riro + Amala", price: "N3,700", vendor: "Spice Hub" },
    ],
  },
  {
    id: "mealstop",
    restaurant: "MealStop",
    combos: [
      { id: "4-1", title: "Beans + Plantain", price: "N2,200", vendor: "MealStop" },
      { id: "4-2", title: "Yam + Egg Sauce", price: "N1,800", vendor: "MealStop" },
    ],
  },
  {
    id: "quickbite",
    restaurant: "QuickBite",
    combos: [
      { id: "5-1", title: "Pounded Yam + Egusi", price: "N4,000", vendor: "QuickBite" },
      { id: "5-2", title: "Jollof + Plantain", price: "N2,900", vendor: "QuickBite" },
    ],
  },
];

const FeaturedMealCombos = () => {
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

      <div className="space-y-10 mt-10">
        {RESTAURANT_COMBOS.slice(0, 5).map((restaurant) => (
          <section key={restaurant.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[22px] font-semibold">{restaurant.restaurant}</h2>
                <p className="text-sm text-[#A4A4A4] mt-1">
                  {restaurant.combos.length} combos available
                </p>
              </div>
              <Link href={`/customer/restaurants/${restaurant.id}`} className="text-[16px] text-[#A4A4A4]">
                Check out restaurant
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {restaurant.combos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  title={combo.title}
                  price={combo.price}
                  vendor={combo.vendor}
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
