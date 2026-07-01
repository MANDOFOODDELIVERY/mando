"use client";

import RestaurantBottomNav from "@/components/RestaurantBottomNav";
import RoleNotificationsPage from "@/components/RoleNotificationsPage";

export default function RestaurantNotificationsPage() {
  return (
    <RoleNotificationsPage
      apiPrefix="restaurant"
      backHref="/restaurant/dashboard"
      bottomNav={<RestaurantBottomNav />}
    />
  );
}
