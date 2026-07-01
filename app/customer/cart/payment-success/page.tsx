"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CashBundleIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";

export default function PaymentSuccessPage() {
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const items = useCartStore((s) => s.items);
  const checkoutOrder = useCartStore((s) => s.checkoutOrder);
  const [queryOrderId, setQueryOrderId] = useState<string | null>(null);
  const [queryOrderNumber, setQueryOrderNumber] = useState<string | null>(null);
  const [snapshot] = useState(() => ({
    deliveryAddress,
    restaurantName: items.length > 0 ? items[0].restaurantName || "Restaurant" : "Restaurant",
    orderNumber: checkoutOrder?.orderNumber,
  }));

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    setQueryOrderId(query.get("orderId"));
    setQueryOrderNumber(query.get("orderNumber"));
  }, []);

  const orderId =
    queryOrderNumber ??
    snapshot.orderNumber ??
    queryOrderId ??
    "Pending";
  const restaurantName = snapshot.restaurantName;
  const customerName = "You";
  const riderName = "Assigning rider";
  const riderPhone = "Pending";
  const eta = "30-45 mins";

  return (
    <div className="min-h-screen bg-[#F9F9F9] p-6 pb-20">
      <div className="mb-6">
        <Link href="/customer/dashboard" className="inline-flex items-center text-[#4D4D4D] font-medium">
          ← Home
        </Link>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-200 text-center space-y-6">
        <div className="flex justify-center">
          <CashBundleIcon />
        </div>

        <div>
          <h1 className="text-[24px] font-semibold">Your order is placed</h1>
          <p className="text-[#6B6B6B] mt-3">
            We&apos;ve recorded your order and will confirm payment before sending it to the restaurant.
          </p>
        </div>


        <div className="rounded-3xl bg-[#FAFAFA] p-6 border border-gray-200 space-y-5 text-left">
        <div className="bg-[#F3F3F3] px-4 py-3 text-[14px] font-semibold text-[#4D4D4D]">
          Order ID: {orderId}
        </div>
          <div className="flex justify-between text-[14px] text-[#4D4D4D]">
            <div>
              <p className="text-[#A4A4A4]">From</p>
              <p className="font-semibold">{restaurantName}</p>
            </div>
            <div className="text-right">
              <p className="text-[#A4A4A4]">To</p>
              <p className="font-semibold">{customerName}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#A4A4A4]">Delivery address</p>
            <p className="font-semibold mt-2">{snapshot.deliveryAddress}</p>
          </div>

          <div className="rounded-xl bg-white p-4 border border-gray-200 space-y-3">
            <div className="flex justify-between text-[14px] text-[#4D4D4D]">
              <p className="text-[#A4A4A4]">Rider</p>
              <p className="font-semibold">{riderName}</p>
            </div>
            <div className="flex justify-between text-[14px] text-[#4D4D4D]">
              <p className="text-[#A4A4A4]">Rider phone</p>
              <p className="font-semibold">{riderPhone}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-[#A4A4A4]">Estimated arrival</p>
            <p className="font-semibold mt-2">{eta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
