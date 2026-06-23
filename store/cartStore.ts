import create from "zustand";

export type CartItem = {
  id: string;
  image?: string;
  restaurantName?: string;
  comboName: string;
  quantity: number;
  price: number; // unit price
};

type CartState = {
  items: CartItem[];
  deliveryAddress: string;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setDeliveryAddress: (address: string) => void;
  total: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  deliveryAddress: "No 12, Example Street, Lagos",
  addItem: (item) =>
    set((state) => {
      const exists = state.items.find((i) => i.id === item.id);
      if (exists) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
          ),
        };
      }
      return { items: [...state.items, item] };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  updateQuantity: (id, quantity) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity } : i)) })),
  clear: () => set({ items: [] }),
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));

export default useCartStore;
