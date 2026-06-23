import create from "zustand";

export type Notification = {
  id: number;
  title: string;
  description: string;
  time: string;
  read?: boolean;
};

type NotificationState = {
  notifications: Notification[];
  addNotification: (n: Notification) => void;
  markRead: (id: number) => void;
  unreadCount: () => number;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    { id: 1, title: "Your order is on the way", description: "The rider is picking up your meal from Mama Chef Cafe.", time: "2 mins ago", read: false },
    { id: 2, title: "New combo available", description: "Try the new Suya Rice combo at a special launch price.", time: "1 hour ago", read: false },
  ],
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
  markRead: (id) => set((s) => ({ notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: true } : x)) })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));

export default useNotificationStore;
