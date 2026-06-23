"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";
import BottomNav from "@/components/BottomNav";

const CartPage = () => {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total)();
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);

  return (
    <div className="p-4 pb-24 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/customer/restaurants" className="flex items-center gap-3">
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">Checkout</span>
        </Link>
      </header>

      <section className="rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] text-[#A4A4A4]">Delivery address</p>
            <p className="font-semibold">{deliveryAddress}</p>
            <p className="text-[12px] text-[#A4A4A4]">ETA: 30-45 mins</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link href="/customer/cart/change-address" className="underline text-[#DFB400]">
              Change address
            </Link>
            <Link href="#" className="underline text-[#DFB400]">
              Add phone number
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {items.length === 0 ? (
          <p className="text-[14px] text-[#A4A4A4]">Your cart is empty.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={item.image} alt={item.comboName} className="w-28 h-28 rounded-md object-cover" />
                <div>
                  <p className="text-[14px] font-semibold">{item.restaurantName}</p>
                  <p className="text-[13px] text-[#4D4D4D] my-1">{item.comboName}</p>
                  <Link href={`/customer/featured-combos/${item.id}`} className="underline text-[13px] text-[#DFB400]">
                    edit combo quantity
                  </Link>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</p>
                <p className="text-[12px] text-[#A4A4A4]">Qty: {item.quantity}</p>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#A4A4A4]">Subtotal</span>
          <span className="font-semibold">₦{total.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#A4A4A4]">Delivery</span>
          <span className="font-semibold">₦0</span>
        </div>

        <div className="flex items-center justify-between text-[16px] font-semibold">
          <span>Total</span>
          <span>₦{total.toLocaleString()}</span>
        </div>

        <button className="w-full mt-2 rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white">
          Proceed to payment
        </button>
      </section>

      <BottomNav />
    </div>
  );
};

export default CartPage;
