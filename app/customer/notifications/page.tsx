"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
} from "@/components/svgs/DefaultIcons";
import useNotificationStore from "@/store/notificationStore";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/notifications`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load notifications");

        return response.json() as Promise<{ notifications: typeof notifications }>;
      })
      .then((data) => {
        if (!mounted) return;

        setNotifications(data.notifications);
      })
      .catch((error) => {
        if (!mounted) return;

        showToast(error instanceof Error ? error.message : "Unable to load notifications", "error");
      })
      .finally(() => {
        if (!mounted) return;

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [setNotifications, showToast]);

  async function markNotificationRead(notificationId: string) {
    markRead(notificationId);

    await fetch(`${API_BASE_URL}/customer/notifications/${notificationId}/read`, {
      method: "PATCH",
      credentials: "include",
    });
  }

  async function markEveryNotificationRead() {
    markAllRead();

    await fetch(`${API_BASE_URL}/customer/notifications/read-all`, {
      method: "POST",
      credentials: "include",
    });
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="p-6">
        <header className="flex items-center gap-3 mb-6">
          <Link
            href="/customer/dashboard"
            className="inline-flex items-center justify-center w-10 h-10 rounded-md text-[#4D4D4D]"
          >
            <ArrowLeftIcon />
          </Link>
          <div>
            <p className="text-[24px] text-[#A4A4A4]">Notifications</p>
          </div>
          {notifications.some((notification) => !notification.readAt) && (
            <button
              type="button"
              onClick={markEveryNotificationRead}
              className="ml-auto text-xs font-semibold text-[#DFB400]"
            >
              Mark all read
            </button>
          )}
        </header>

        <div className="space-y-0 bg-white rounded-md overflow-hidden">
          {loading ? (
            <div className="px-5 py-4 text-sm text-[#6B6B6B]">
              Loading notifications...
            </div>
          ) : null}

          {!loading && notifications.length === 0 ? (
            <div className="px-5 py-4 text-sm text-[#6B6B6B]">
              No notifications yet.
            </div>
          ) : null}

          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-5 py-4 border-b border-gray-200 ${notification.readAt ? "bg-white opacity-90" : "bg-white"}`}
            >
              <div className="flex flex-col">
                <div className="flex items-start justify-between">
                  <h2 className="text-[16px] font-semibold">
                    {notification.title}
                  </h2>
                  {!notification.readAt && (
                    <span className="ml-4 h-3 w-3 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="text-sm text-[#6B6B6B] mt-2">
                  {notification.body}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[#A4A4A4]">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                  {!notification.readAt && (
                    <button
                      onClick={() => markNotificationRead(notification.id)}
                      className="text-xs text-[#DFB400] font-semibold"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* <div className="mt-6 text-center text-[#6B6B6B] text-sm">
          No more notifications yet.
        </div>
*/}
      </div>
    </div>
  );
}
