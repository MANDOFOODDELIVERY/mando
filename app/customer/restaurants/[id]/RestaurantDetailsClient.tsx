"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  LocationIcon,
  TimerIcon,
} from "@/components/svgs/DefaultIcons";
import { FaStar } from "react-icons/fa";

const MEAL_OPTIONS = [
  { id: "jollof", label: "Jollof Rice", price: 1200 },
  { id: "amala", label: "Amala + Ewedu", price: 1400 },
  { id: "beef", label: "Beef Stew", price: 900 },
  { id: "plantain", label: "Fried Plantain", price: 500 },
  { id: "sprite", label: "Sprite", price: 400 },
];

export type RestaurantDetailsProps = {
  restaurant: {
    id: string;
    name: string;
    rating: string;
    prepTime: string;
    area: string;
    description: string;
  };
};

const RestaurantDetailsClient = ({ restaurant }: RestaurantDetailsProps) => {
  const initialQuantities = useMemo(
    () =>
      MEAL_OPTIONS.reduce(
        (acc, meal) => {
          acc[meal.id] = 0;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [],
  );

  const [quantities, setQuantities] =
    useState<Record<string, number>>(initialQuantities);
  const [extraPlates, setExtraPlates] = useState(1);

  const selectedMeals = MEAL_OPTIONS.filter((meal) => quantities[meal.id] > 0);

  const subTotal = selectedMeals.reduce(
    (sum, meal) => sum + meal.price * quantities[meal.id],
    0,
  );

  const total = subTotal * extraPlates;

  const toggleMeal = (mealId: string) => {
    setQuantities((current) => ({
      ...current,
      [mealId]: current[mealId] > 0 ? 0 : 1,
    }));
  };

  const updateMealQuantity = (mealId: string, delta: number) => {
    setQuantities((current) => {
      const next = Math.max(0, current[mealId] + delta);
      return {
        ...current,
        [mealId]: next,
      };
    });
  };

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
          src="/test-img-one.png"
          alt="Restaurant background"
          className="object-cover w-full h-full"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="absolute top-0 right-0 rounded-tr-3xl bg-[#DFB400] px-6 py-3 text-[14px] font-semibold text-white">
          Verified Vendor
        </div>

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-[12px] text-white">
          <div className="flex flex-col gap-2 mb-6">
            <span>Preparation Time</span>
            <span className="font-semibold">{restaurant.prepTime}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span>Location</span>
            <span className="font-semibold">{restaurant.area}</span>
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
          <p className="text-[14px] font-semibold">{restaurant.rating}</p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[16px] font-semibold">About Restaurant</p>
        <p className="text-[14px] leading-6 text-[#a4a4a4]">
          {restaurant.description}
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold">Meal Quantity</p>
          <p className="text-[14px] text-[#A4A4A4]">Choose meals to add</p>
        </div>

        <div className="space-y-3">
          {MEAL_OPTIONS.map((meal) => {
            const quantity = quantities[meal.id];
            return (
              <div key={meal.id} className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={quantity > 0}
                    onChange={() => toggleMeal(meal.id)}
                    className="h-5 w-5 accent-[#DFB400]"
                  />
                  <span className="text-[14px] font-medium">{meal.label}</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
                    onClick={() => updateMealQuantity(meal.id, -1)}
                  >
                    -
                  </button>
                  <span className="min-w-[24px] text-center text-[14px] font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
                    onClick={() => updateMealQuantity(meal.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 mt-10">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold">Pricing</p>
          <p className="text-[14px] text-[#A4A4A4]">Based on selected meals</p>
        </div>

        <div className="space-y-3">
          {selectedMeals.length === 0 ? (
            <p className="text-[14px] text-[#A4A4A4]">No meals selected yet.</p>
          ) : (
            selectedMeals.map((meal) => {
              const quantity = quantities[meal.id];
              const itemTotal = meal.price * quantity;
              return (
                <div
                  key={meal.id}
                  className="flex items-center justify-between text-[14px]"
                >
                  <span>
                    {meal.label} x{quantity}
                  </span>
                  <span className="font-semibold">
                    ₦{itemTotal.toLocaleString()}
                    <span className="text-[12px] text-[#A4A4A4]">
                      {" "}
                      (₦{meal.price.toLocaleString()} each)
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-[#E5E5E5] pt-3 flex items-center justify-between text-[16px] font-semibold">
          <span>Total</span>
          <span>₦{total.toLocaleString()}</span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[16px] font-semibold">Add Extra Plate</p>
            <p className="text-[12px] text-[#A4A4A4]">
              Selected meals are doubled per extra plate quantity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-10 w-10 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
              onClick={() => setExtraPlates((value) => Math.max(1, value - 1))}
            >
              -
            </button>
            <span className="min-w-[20px] text-center text-[16px] font-semibold">
              {extraPlates}
            </span>
            <button
              type="button"
              className="h-10 w-10 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
              onClick={() => setExtraPlates((value) => value + 1)}
            >
              +
            </button>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="w-full rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white shadow-lg shadow-[#DFB400]/20 mt-10"
      >
        Add to cart
      </button>
    </div>
  );
};

export default RestaurantDetailsClient;
