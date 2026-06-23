"use client";

import ComboCard from "@/components/cards/ComboCard";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import {
  LocationIcon,
  NotificationIcon,
  SearchIcon,
} from "@/components/svgs/DefaultIcons";
import useNotificationStore from "@/store/notificationStore";

const Dashboard = () => {
  return (
    <div className="p-6 pb-28">
      {/* Header */}
      <div className="flex justify-between items-center ">
        <Link href="/customer/address" className="flex items-center space-x-3">
          <div className="w-[43px] h-[47px] flex items-center justify-center bg-[#F7F7F7] rounded-md">
            <LocationIcon />
          </div>
          <div className="flex flex-col">
            <p className="text-[14px] text-[#A4A4A4]">Delivery to</p>
            <h2 className="text-[16px] font-semibold">
              123 Ajose Adeogun Street...
            </h2>
          </div>
        </Link>
        <div className="relative">
          <Link href="/customer/notifications" className="bg-[#FFDB431A] w-[49px] h-[49px] rounded-full flex items-center justify-center relative">
            <NotificationIcon />
          </Link>
          {useNotificationStore((s) => s.unreadCount()) > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#DFB400] px-1.5 text-[10px] font-semibold text-black">
              {useNotificationStore((s) => s.unreadCount())}
            </span>
          )}
        </div>
      </div>

      <h2 className="text-[24px] font-bold my-10">
        Everything you want, delivered swiftly and{" "}
        <span className="text-[#A4A4A4]">right to your door</span>{" "}
      </h2>

      {/* search bar */}
      <div className="flex items-center space-x-3 rounded-md border border-[#cccccc] p-3 w-full">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search for combos..."
          className="placeholder:text-[#A4A4A4] text-[14px] focus:outline-none"
        />
      </div>

      <div className="mt-10">
        <img src="/ad.png" className="w-full" alt="promo-banner" />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[24px] font-semibold">Combos</h2>
          <Link href="/customer/featured-combos" className="text-[18px] text-[#A4A4A4]">
            See all combos
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-6">
          {[
            {
              id: 1,
              title: "Amala + Ewedu soup",
              price: "N2,800",
              vendor: "Mama Chef Cafe",
            },
            { id: 2, title: "Jollof + Chicken", price: "N3,200", vendor: "Spice Hub" },
            { id: 3, title: "Rice + Stew", price: "N2,500", vendor: "MealStop" },
            { id: 4, title: "Pounded Yam + Egusi", price: "N4,000", vendor: "Grandma's" },
            { id: 5, title: "Yam + Egg Sauce", price: "N1,800", vendor: "QuickBite" },
            { id: 6, title: "Beans + Plantain", price: "N2,200", vendor: "Street Eats" },
          ].map((combo) => (
            <ComboCard
              key={combo.id}
              title={combo.title}
              price={combo.price}
              vendor={combo.vendor}
              href={`/customer/featured-combos/${combo.id}`}
            />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
