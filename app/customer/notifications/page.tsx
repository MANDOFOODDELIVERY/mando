"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  NotificationIcon,
} from "@/components/svgs/DefaultIcons";
import useNotificationStore from "@/store/notificationStore";

export default function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);

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
        </header>

        <div className="space-y-0 bg-white rounded-md overflow-hidden">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-5 py-4 border-b border-gray-200 ${notification.read ? "bg-white opacity-90" : "bg-white"}`}
            >
              <div className="flex flex-col">
                <div className="flex items-start justify-between">
                  <h2 className="text-[16px] font-semibold">
                    {notification.title}
                  </h2>
                  {!notification.read && (
                    <span className="ml-4 h-3 w-3 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="text-sm text-[#6B6B6B] mt-2">
                  {notification.description}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[#A4A4A4]">
                    {notification.time}
                  </span>
                  {!notification.read && (
                    <button
                      onClick={() => markRead(notification.id)}
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
