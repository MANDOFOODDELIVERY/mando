"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import BottomNav from "@/components/BottomNav";
import { ArrowLeftIcon, LocationIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");

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
  ratingAverage?: number;
  reviewCount?: number;
  serviceArea: {
    name: string;
    city: string;
    state: string;
  };
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  imageUrl: string | null;
  isAvailable: boolean;
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/restaurants/${restaurantId}`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load restaurant");

        return response.json() as Promise<{
          restaurant: RestaurantDetails;
          menuItems: MenuItem[];
        }>;
      })
      .then((data) => {
        if (!mounted) return;

        setRestaurant(data.restaurant);
        setMenuItems(data.menuItems);
      })
      .catch(() => {
        if (!mounted) return;

        setRestaurant(null);
        setMenuItems([]);
      })
      .finally(() => {
        if (!mounted) return;

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  const selectedItems = useMemo(
    () =>
      menuItems
        .map((item) => ({
          ...item,
          quantity: selectedQuantities[item.id] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [menuItems, selectedQuantities],
  );
  const customComboTotal = selectedItems.reduce(
    (total, item) => total + item.priceAmount * item.quantity,
    0,
  );

  function updateQuantity(menuItemId: string, nextQuantity: number) {
    setSelectedQuantities((current) => {
      const quantity = Math.max(0, Math.min(20, nextQuantity));

      if (quantity === 0) {
        const { [menuItemId]: _removed, ...rest } = current;
        return rest;
      }

      return {
        ...current,
        [menuItemId]: quantity,
      };
    });
  }

  function addCustomComboToCart() {
    if (!restaurant || selectedItems.length === 0) {
      showToast("Please select at least one food item", "error");
      return;
    }

    const readableItems = selectedItems
      .map((item) => `${item.quantity} ${item.name}`)
      .join(", ");

    addItem({
      id: `custom-${restaurant.id}-${Date.now()}`,
      customRestaurantId: restaurant.id,
      isCustomCombo: true,
      image: selectedItems[0]?.imageUrl ?? restaurant.imageUrl ?? "/dummy-img.jpg",
      restaurantName: restaurant.name,
      comboName: `Custom combo: ${readableItems}`,
      quantity: 1,
      price: customComboTotal,
      components: selectedItems.map((item) => ({
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        baseQuantity: 0,
        unitPrice: item.priceAmount,
      })),
    });

    setSelectedQuantities({});
    showToast("Custom combo added to cart", "success");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] p-4 pb-24">
        <div className="h-8 w-36 animate-pulse rounded-full bg-gray-200" />
        <div className="mt-6 h-[204px] animate-pulse rounded-3xl bg-gray-200" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
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
    <div className="min-h-screen bg-[#F8F8F8] p-3 pb-36">
      <header className="mb-5 flex items-center justify-between">
        <Link href="/customer/restaurants" className="flex items-center gap-3">
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">{restaurant.name}</span>
        </Link>
        <Link href="/customer/cart" className="rounded-full bg-[#141B34] px-4 py-2 text-sm font-semibold text-white">
          Cart
        </Link>
      </header>

      <section className="relative h-[204px] w-full overflow-hidden rounded-3xl">
        <img
          src={restaurant.imageUrl ?? "/restaurant-dummy.png"}
          alt={restaurant.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/45" />

        {restaurant.isVerified ? (
          <div className="absolute right-0 top-0 rounded-tr-3xl bg-[#DFB400] px-6 py-3 text-[14px] font-semibold text-white">
            Verified Vendor
          </div>
        ) : null}

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
            <span>{formatTimeRange(restaurant.preparationMinMinutes, restaurant.preparationMaxMinutes)}</span>
            <span>{restaurant.serviceArea.name}, {restaurant.serviceArea.city}</span>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm leading-6 text-[#6B6B6B]">
              {restaurant.description ?? "Pick your preferred food items and build a custom combo."}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm text-[#4D4D4D]">
              <LocationIcon />
              <span>{restaurant.streetAddress}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#FFF7E0] px-3 py-2">
            <FaStar className="text-[#DFB400]" />
            <span className="text-sm font-semibold">{restaurant.ratingAverage ?? 0}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold text-[#141B34]">Build your combo</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">Select food items from {restaurant.name}.</p>
          </div>
          <p className="text-sm font-semibold text-[#141B34]">Min: {formatNaira(restaurant.minimumOrderAmount)}</p>
        </div>

        {menuItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-center text-sm text-[#6B6B6B]">
            No food items are available from this restaurant yet.
          </div>
        ) : null}

        {menuItems.map((item) => {
          const quantity = selectedQuantities[item.id] ?? 0;

          return (
            <div key={item.id} className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <img
                src={item.imageUrl ?? "/dummy-img.jpg"}
                alt={item.name}
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[#141B34]">{item.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6B6B6B]">
                      {item.description ?? "Freshly prepared by this restaurant."}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-[#141B34]">
                    {formatNaira(item.priceAmount)}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs font-medium text-[#6B6B6B]">
                    {quantity > 0 ? `${quantity} selected` : "Tap + to add"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg font-semibold text-[#141B34]"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DFB400] text-lg font-semibold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {selectedItems.length > 0 ? (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-3xl bg-[#141B34] p-4 text-white shadow-[0_18px_50px_rgba(20,27,52,0.22)]">
            <div>
              <p className="text-xs text-white/70">{selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} selected</p>
              <p className="text-lg font-semibold">{formatNaira(customComboTotal)}</p>
            </div>
            <button
              type="button"
              onClick={addCustomComboToCart}
              className="rounded-2xl bg-[#DFB400] px-5 py-3 text-sm font-semibold text-white"
            >
              Add custom combo
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
};

export default RestaurantDetailsClient;
