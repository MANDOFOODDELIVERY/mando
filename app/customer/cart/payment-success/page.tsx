"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CashBundleIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";

function makeOrderId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function PaymentSuccessPage() {
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const items = useCartStore((s) => s.items);

  const orderId = useMemo(() => makeOrderId(), []);
  const restaurantName = items.length > 0 ? items[0].restaurantName || "Restaurant" : "Restaurant";
  const customerName = "You";
  const riderName = "Rider Tunde";
  const riderPhone = "+234 801 234 5678";
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
          <p className="text-[#6B6B6B] mt-3">Congratulations! Your order is on its way and will be delivered as soon as possible.</p>
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
            <p className="font-semibold mt-2">{deliveryAddress}</p>
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
