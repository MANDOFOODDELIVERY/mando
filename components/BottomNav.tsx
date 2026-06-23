"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiFillHome, AiOutlineHome } from "react-icons/ai";
import { MdOutlineRestaurantMenu } from "react-icons/md";
import { FiShoppingBag, FiUser } from "react-icons/fi";
import useCartStore from "@/store/cartStore";

const BottomNav = () => {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.items.length);

  const tabs = [
    {
      href: "/customer/dashboard",
      label: "Home",
      icon: AiOutlineHome,
      activeIcon: AiFillHome,
      match: "/customer/dashboard",
    },
    {
      href: "/customer/restaurants",
      label: "Restaurants",
      icon: MdOutlineRestaurantMenu,
      activeIcon: MdOutlineRestaurantMenu,
      match: "/customer/restaurants",
    },
    {
      href: "/customer/cart",
      label: "Cart",
      icon: FiShoppingBag,
      activeIcon: FiShoppingBag,
      match: "/customer/cart",
    },
    {
      href: "/customer/profile",
      label: "Profile",
      icon: FiUser,
      activeIcon: FiUser,
      match: "/customer/profile",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-4xl justify-around px-4 py-3">
        {tabs.map((tab) => {
          const isActive = pathname?.startsWith(tab.match);
          const Icon = isActive ? tab.activeIcon : tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-1 rounded-3xl px-4 py-2 transition-all duration-200 ${
                isActive ? "bg-[#FFF7E0] text-[#DFB400]" : "text-[#6B6B6B] hover:text-[#000]"
              }`}
            >
              <div className="relative">
                <Icon size={24} />
                {tab.label === "Cart" && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#DFB400] px-1.5 text-[10px] font-semibold text-black">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
