import create from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  image?: string;
  restaurantName?: string;
  comboName: string;
  quantity: number;
  price: number; // unit price
  components?: CartItemComponent[];
};

export type CartItemComponent = {
  menuItemId: string;
  name: string;
  quantity: number;
  baseQuantity: number;
  unitPrice: number;
};

export type CheckoutOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
};

type CartState = {
  items: CartItem[];
  checkoutOrder: CheckoutOrder | null;
  deliveryAddress: string;
  phoneNumber: string;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setCheckoutOrder: (order: CheckoutOrder | null) => void;
  clear: () => void;
  setDeliveryAddress: (address: string) => void;
  setPhoneNumber: (phone: string) => void;
  total: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      checkoutOrder: null,
      deliveryAddress: "Add delivery address",
      phoneNumber: "",
      addItem: (item) =>
        set((state) => {
          const exists = state.items.find((i) => i.id === item.id);
          if (exists) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      ...item,
                      quantity: item.quantity || i.quantity,
                    }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, quantity } : i)) })),
      setCheckoutOrder: (order) => set({ checkoutOrder: order }),
      clear: () => set({ items: [], checkoutOrder: null }),
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),
      setPhoneNumber: (phone) => set({ phoneNumber: phone }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "mando-cart",
      partialize: (state) => ({
        items: state.items,
        checkoutOrder: state.checkoutOrder,
        deliveryAddress: state.deliveryAddress,
        phoneNumber: state.phoneNumber,
      }),
    },
  ),
);

export default useCartStore;
