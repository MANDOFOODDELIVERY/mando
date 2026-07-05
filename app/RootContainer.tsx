"use client";

import { usePathname } from "next/navigation";

const RootContainer = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div
      className={
        isAdminRoute
          ? "w-full min-h-screen bg-white"
          : "w-full lg:max-w-[420px] min-h-screen mx-auto bg-white"
      }
    >
      {children}
    </div>
  );
};

export default RootContainer;
