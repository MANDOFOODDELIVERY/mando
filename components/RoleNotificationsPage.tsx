"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useNotificationStore, { Notification } from "@/store/notificationStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type Filter = "all" | "unread" | "read" | "today";

type RoleNotificationsPageProps = {
  apiPrefix: string;
  backHref: string;
  bottomNav?: React.ReactNode;
};

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Today", value: "today" },
];

export default function RoleNotificationsPage({
  apiPrefix,
  backHref,
  bottomNav,
}: RoleNotificationsPageProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/${apiPrefix}/notifications`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notifications");
        return response.json() as Promise<{ notifications: Notification[] }>;
      })
      .then((data) => {
        if (mounted) setNotifications(data.notifications);
      })
      .catch((error) => {
        if (mounted) {
          showToast(error instanceof Error ? error.message : "Unable to load notifications", "error");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiPrefix, setNotifications, showToast]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, activeFilter)),
    [activeFilter, notifications],
  );

  async function markNotificationRead(notificationId: string) {
    markRead(notificationId);
    await fetch(`${API_BASE_URL}/${apiPrefix}/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include",
    });
  }

  async function markEveryNotificationRead() {
    markAllRead();
    await fetch(`${API_BASE_URL}/${apiPrefix}/notifications/read-all`, {
      method: "POST",
      credentials: "include",
    });
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[#4D4D4D]"
          >
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-[#141B34]">Notifications</h1>
            <p className="text-sm text-[#6B6B6B]">{notifications.length} total updates</p>
          </div>
          {notifications.some((notification) => !notification.readAt) ? (
            <button
              type="button"
              onClick={() => void markEveryNotificationRead()}
              className="ml-auto text-xs font-semibold text-[#DFB400]"
            >
              Mark all read
            </button>
          ) : null}
        </header>

        <div className="mb-5 flex gap-2 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                activeFilter === filter.value
                  ? "bg-[#141B34] text-white"
                  : "border border-gray-200 bg-white text-[#6B6B6B]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {loading ? (
            <div className="px-5 py-4 text-sm text-[#6B6B6B]">Loading notifications...</div>
          ) : null}

          {!loading && visibleNotifications.length === 0 ? (
            <div className="px-5 py-4 text-sm text-[#6B6B6B]">No notifications here.</div>
          ) : null}

          {visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-b border-gray-200 px-5 py-4 last:border-b-0 ${
                notification.readAt ? "bg-white opacity-80" : "bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold text-[#141B34]">{notification.title}</h2>
                {!notification.readAt ? <span className="mt-1 h-3 w-3 rounded-full bg-red-500" /> : null}
              </div>
              <p className="mt-2 text-sm text-[#6B6B6B]">{notification.body}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-[#A4A4A4]">{formatNotificationTime(notification.createdAt)}</span>
                {!notification.readAt ? (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(notification.id)}
                    className="text-xs font-semibold text-[#DFB400]"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
      {bottomNav}
    </div>
  );
}

function matchesFilter(notification: Notification, filter: Filter) {
  if (filter === "unread") return !notification.readAt;
  if (filter === "read") return Boolean(notification.readAt);
  if (filter === "today") {
    const created = new Date(notification.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  }
  return true;
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
