"use client";

import RiderBottomNav from "@/components/RiderBottomNav";
import RoleNotificationsPage from "@/components/RoleNotificationsPage";

export default function RiderNotificationsPage() {
  return (
    <RoleNotificationsPage
      apiPrefix="rider"
      backHref="/rider/dashboard"
      bottomNav={<RiderBottomNav />}
    />
  );
}
