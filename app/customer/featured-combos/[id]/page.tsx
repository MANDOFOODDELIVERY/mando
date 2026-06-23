"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import { FaStar } from "react-icons/fa";

const COMBOS = [
  {
    id: "1-1",
    restaurant: "Iya Ruka Restaurant",
    comboName: "Ofada Rice + Beef Stew",
    constituents: ["Ofada Rice", "Beef Stew", "Salad"],
    description:
      "A hearty combo with rich, slow-cooked beef stew served with fragrant ofada rice and a fresh salad.",
    price: 3500,
  },
  {
    id: "1-2",
    restaurant: "Iya Ruka Restaurant",
    comboName: "Amala + Ewedu Soup",
    constituents: ["Amala", "Ewedu Soup", "Beef"],
    description:
      "Soft amala paired with traditional ewedu soup and tender beef for a classic local dining experience.",
    price: 3200,
  },
  {
    id: "2-1",
    restaurant: "Mama Chef Cafe",
    comboName: "Jollof + Chicken",
    constituents: ["Jollof Rice", "Chicken", "Salad"],
    description:
      "Flavorful jollof rice with perfectly roasted chicken and a crisp side salad.",
    price: 3200,
  },
  {
    id: "2-2",
    restaurant: "Mama Chef Cafe",
    comboName: "Rice + Stew",
    constituents: ["White Rice", "Stew", "Plantain"],
    description:
      "Comforting rice and stew served with sweet fried plantain on the side.",
    price: 2600,
  },
];

const MEAL_OPTIONS = [
  { id: "jollof", label: "Jollof Rice", price: 1200 },
  { id: "chicken", label: "Chicken", price: 900 },
  { id: "salad", label: "Salad", price: 500 },
  { id: "plantain", label: "Plantain", price: 500 },
];

const ComboDetails = ({ params }: { params: { id: string } }) => {
  const combo = COMBOS.find((item) => item.id === params.id) ?? COMBOS[0];
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
    <div className="p-6 pb-24 space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/customer/featured-combos"
          className="flex items-center gap-3"
        >
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">{combo.comboName}</span>
        </Link>
      </header>

      <section className="relative w-full h-[204px] overflow-hidden rounded-3xl">
        <img
          src="/test-img-one.png"
          alt="Combo background"
          className="object-cover w-full h-full"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-[12px] text-white">
          <div>
            <p className="text-[13px]">{combo.restaurant}</p>
            <p className="text-[14px] font-semibold">{combo.comboName}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[18px] font-semibold">{combo.comboName}</p>
        <p className="text-[14px] text-[#4D4D4D]">
          {combo.constituents.join(" + ")}
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-[16px] font-semibold">About Meal</p>
        <p className="text-[14px] leading-6 text-[#4D4D4D]">
          {combo.description}
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
                <label className="flex items-center gap-3">
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

      <section className="space-y-4 rounded-3xl border border-[#E5E5E5] p-4 bg-white">
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
                    ₦{itemTotal.toLocaleString()} {" "}
                    <span className="text-[#A4A4A4] font-normal">
                      (₦{meal.price.toLocaleString()})
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

      <button
        type="button"
        className="w-full mt-10 rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white shadow-lg shadow-[#DFB400]/20"
      >
        Add to cart
      </button>
    </div>
  );
};

export default ComboDetails;
