"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ComboItem = {
  menuItemId: string;
  name: string;
  description: string | null;
  priceAmount: number;
  imageUrl: string | null;
  quantity: number;
  isOptional: boolean;
};

type ComboDetails = {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  imageUrl: string | null;
  restaurant: {
    id: string;
    name: string;
    slug: string;
  };
  items: ComboItem[];
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

const ComboDetailsPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = React.use(params);
  const [combo, setCombo] = useState<ComboDetails | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((s) => s.addItem);
  const cartItem = useCartStore((s) => s.items.find((item) => item.id === id));
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/combos/${id}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load combo");

        return response.json() as Promise<{ combo: ComboDetails }>;
      })
      .then((data) => {
        if (!mounted) return;

        setCombo(data.combo);
        const savedComponentQuantities = new Map(
          cartItem?.components?.map((component) => [
            component.menuItemId,
            component.quantity,
          ]) ?? [],
        );

        setQuantities(
          data.combo.items.reduce((nextQuantities, item) => {
            nextQuantities[item.menuItemId] =
              savedComponentQuantities.get(item.menuItemId) ?? item.quantity;
            return nextQuantities;
          }, {} as Record<string, number>),
        );
      })
      .catch(() => {
        if (!mounted) return;

        setCombo(null);
      })
      .finally(() => {
        if (!mounted) return;

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [cartItem?.components, id]);

  const total = useMemo(() => {
    if (!combo) return 0;

    return combo.items.reduce((sum, item) => {
      const quantity = quantities[item.menuItemId] ?? item.quantity;
      return sum + item.priceAmount * quantity;
    }, 0);
  }, [combo, quantities]);

  const updateMealQuantity = (item: ComboItem, delta: number) => {
    setQuantities((current) => {
      const currentQuantity = current[item.menuItemId] ?? item.quantity;
      const next = Math.max(item.quantity, currentQuantity + delta);

      return {
        ...current,
        [item.menuItemId]: next,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">Loading combo...</p>
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#141B34]">Combo not found</p>
          <Link href="/customer/featured-combos" className="mt-4 inline-flex text-[#DFB400]">
            Back to combos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <header className="flex items-center justify-between">
        <Link
          href="/customer/featured-combos"
          className="flex items-center gap-3"
        >
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">{combo.name}</span>
        </Link>
      </header>

      <section className="relative w-full h-[204px] overflow-hidden rounded-3xl">
        <img
          src={combo.imageUrl ?? "/test-img-one.png"}
          alt="Combo background"
          className="object-cover w-full h-full"
        />

        <div className="absolute inset-0 bg-black/45" />

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 text-[12px] text-white">
          <div>
            <p className="text-[13px]">{combo.restaurant.name}</p>
            <p className="text-[14px] font-semibold">{combo.name}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[18px] font-semibold">{combo.name}</p>
        <p className="text-[14px] text-[#4D4D4D]">
          {combo.items.map((item) => `${item.quantity} ${item.name}`).join(" + ")}
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
          <p className="text-[16px] font-semibold">Combo Items</p>
          <p className="text-[14px] text-[#A4A4A4]">Add extra portions if needed</p>
        </div>

        <div className="space-y-3">
          {combo.items.map((item) => {
            const quantity = quantities[item.menuItemId] ?? item.quantity;
            return (
              <div key={item.menuItemId} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
                <div>
                  <span className="text-[14px] font-medium">{item.name}</span>
                  <p className="mt-1 text-xs text-[#A4A4A4]">Base: {item.quantity}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
                    onClick={() => updateMealQuantity(item, -1)}
                  >
                    -
                  </button>
                  <span className="min-w-[24px] text-center text-[14px] font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="h-9 w-9 rounded-lg border border-[#D1D5DB] text-[#4D4D4D]"
                    onClick={() => updateMealQuantity(item, 1)}
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
          <p className="text-[14px] text-[#A4A4A4]">Updates with extra portions</p>
        </div>

        <div className="space-y-3">
          {combo.items.map((item) => {
            const quantity = quantities[item.menuItemId] ?? item.quantity;
            const itemTotal = item.priceAmount * quantity;
            return (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between text-[14px]"
              >
                <span>
                  {item.name} x{quantity}
                </span>
                <span className="font-semibold">
                  {formatNaira(itemTotal)}{" "}
                  <span className="text-[#A4A4A4] font-normal">
                    ({formatNaira(item.priceAmount)})
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#E5E5E5] pt-3 flex items-center justify-between text-[16px] font-semibold">
          <span>Total</span>
          <span>{formatNaira(total)}</span>
        </div>
      </section>

      <button
        type="button"
        className="w-full mt-10 rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white shadow-lg shadow-[#DFB400]/20"
        onClick={() => {
          addItem({
            id: combo.id,
            image: combo.imageUrl ?? "/test-img-one.png",
            restaurantName: combo.restaurant.name,
            comboName: combo.name,
            quantity: cartItem?.quantity ?? 1,
            price: total,
            components: combo.items.map((item) => ({
              menuItemId: item.menuItemId,
              name: item.name,
              baseQuantity: item.quantity,
              quantity: quantities[item.menuItemId] ?? item.quantity,
              unitPrice: item.priceAmount,
            })),
          });
          showToast(cartItem ? "Combo updated successfully" : "Added to cart successfully");
        }}
      >
        {cartItem ? "Update cart" : "Add to cart"}
      </button>

      <BottomNav />
    </div>
  );
};

export default ComboDetailsPage;
