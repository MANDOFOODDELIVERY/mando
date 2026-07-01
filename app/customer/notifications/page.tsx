"use client";

import BottomNav from "@/components/BottomNav";
import RoleNotificationsPage from "@/components/RoleNotificationsPage";

export default function NotificationsPage() {
  return (
    <RoleNotificationsPage
      apiPrefix="customer"
      backHref="/customer/dashboard"
      bottomNav={<BottomNav />}
    />
  );
}
