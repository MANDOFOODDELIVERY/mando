"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiFillHome, AiOutlineHome } from "react-icons/ai";
import { FiUser } from "react-icons/fi";
import { MdOutlineCardGiftcard, MdCardGiftcard } from "react-icons/md";

const SalesAgentBottomNav = () => {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/sales-agent/dashboard",
      label: "Dashboard",
      icon: AiOutlineHome,
      activeIcon: AiFillHome,
      match: "/sales-agent/dashboard",
    },
    {
      href: "/sales-agent/referral",
      label: "Referral",
      icon: MdOutlineCardGiftcard,
      activeIcon: MdCardGiftcard,
      match: "/sales-agent/referral",
    },
    {
      href: "/sales-agent/profile",
      label: "Account",
      icon: FiUser,
      activeIcon: FiUser,
      match: "/sales-agent/profile",
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
              <Icon size={24} />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default SalesAgentBottomNav;
