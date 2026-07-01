"use client";

import RoleNotificationsPage from "@/components/RoleNotificationsPage";
import SalesAgentBottomNav from "@/components/SalesAgentBottomNav";

export default function SalesAgentNotificationsPage() {
  return (
    <RoleNotificationsPage
      apiPrefix="sales-agent"
      backHref="/sales-agent/dashboard"
      bottomNav={<SalesAgentBottomNav />}
    />
  );
}
