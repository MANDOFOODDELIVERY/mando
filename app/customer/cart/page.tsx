"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import PhoneNumberModal from "@/components/PhoneNumberModal";
import useAuthStore from "@/store/authStore";
import useCartStore from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SavedAddress = {
  id: string;
  label: string;
  streetAddress: string;
  isDefault: boolean;
  serviceArea: {
    name: string;
  };
};

function formatAddress(address: SavedAddress) {
  return `${address.streetAddress}, ${address.serviceArea.name}`;
}

function EmptyCartIcon() {
  return (
    <svg
      width="132"
      height="132"
      viewBox="0 0 132 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="66" cy="66" r="66" fill="#FFF7E0" />
      <path
        d="M42 45H48.5L55.2 82.3C55.9 86.1 59.2 88.8 63.1 88.8H88.3C92.1 88.8 95.4 86.1 96.2 82.4L100 64.5H56.3"
        stroke="#141B34"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M66 102C68.8 102 71 99.8 71 97C71 94.2 68.8 92 66 92C63.2 92 61 94.2 61 97C61 99.8 63.2 102 66 102Z" fill="#DFB400" />
      <path d="M88 102C90.8 102 93 99.8 93 97C93 94.2 90.8 92 88 92C85.2 92 83 94.2 83 97C83 99.8 85.2 102 88 102Z" fill="#DFB400" />
    </svg>
  );
}

const CartPage = () => {
  const router = useRouter();
  const auth = useAuthStore((s) => s.auth);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const updateCustomerProfile = useAuthStore((s) => s.updateCustomerProfile);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total)();
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const phoneNumber = useCartStore((s) => s.phoneNumber);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const setPhoneNumber = useCartStore((s) => s.setPhoneNumber);
  const showToast = useToastStore((s) => s.showToast);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState(phoneNumber);
  const [savingPhone, setSavingPhone] = useState(false);
  const [hasDeliveryAddress, setHasDeliveryAddress] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchCurrentUser().then((currentAuth) => {
      if (!mounted || !currentAuth?.profile?.phone) return;

      setPhoneNumber(currentAuth.profile.phone);
      setInputPhone(currentAuth.profile.phone);
    });

    fetch(`${API_BASE_URL}/customer/addresses`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ addresses: SavedAddress[] }>;
      })
      .then((data) => {
        if (!mounted || !data) return;

        const defaultAddress = data.addresses.find((address) => address.isDefault) ?? data.addresses[0];
        if (defaultAddress) {
          setDeliveryAddress(formatAddress(defaultAddress));
          setHasDeliveryAddress(true);
        } else {
          setDeliveryAddress("Add delivery address");
          setHasDeliveryAddress(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, setDeliveryAddress, setPhoneNumber]);

  async function savePhoneNumber() {
    const trimmedPhone = inputPhone.trim();

    if (!trimmedPhone) {
      showToast("Please enter your phone number", "error");
      return;
    }

    setSavingPhone(true);

    try {
      await updateCustomerProfile({ phone: trimmedPhone });
      setPhoneNumber(trimmedPhone);
      setShowPhoneModal(false);
      showToast("Phone number saved successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save phone number", "error");
    } finally {
      setSavingPhone(false);
    }
  }

  const savedPhone = auth?.profile?.phone ?? phoneNumber;
  const checkoutReady = Boolean(auth && hasDeliveryAddress && savedPhone);

  function proceedToPayment() {
    if (!auth) {
      showToast("Please log in to continue to payment", "error");
      router.push("/login");
      return;
    }

    if (!hasDeliveryAddress) {
      showToast("Please add a delivery address", "error");
      router.push("/customer/cart/change-address");
      return;
    }

    if (!savedPhone) {
      showToast("Please add your phone number", "error");
      setInputPhone(savedPhone);
      setShowPhoneModal(true);
      return;
    }

    router.push("/customer/cart/payment");
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="flex max-w-[320px] flex-col items-center text-center">
          <EmptyCartIcon />
          <h1 className="mt-8 text-3xl font-semibold text-[#141B34]">Your cart is empty</h1>
        </div>
        <BottomNav />
      </div>
    );
  }

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
            <p className="mt-2 text-[14px] text-[#A4A4A4]">Phone number</p>
            <p className="font-semibold">{savedPhone || "No phone number added"}</p>
            <p className="text-[12px] text-[#A4A4A4]">ETA: 30-45 mins</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link href="/customer/cart/change-address" className="underline text-[#DFB400]">
              Change address
            </Link>
            <button
              onClick={() => {
                setInputPhone(savedPhone);
                setShowPhoneModal(true);
              }}
              className="underline text-[#DFB400] bg-transparent border-0 cursor-pointer"
            >
              {savedPhone ? "Change phone number" : "Add phone number"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {items.map((item) => (
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
        ))}
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

        <button
          type="button"
          aria-disabled={!checkoutReady}
          onClick={proceedToPayment}
          className={`w-full mt-2 rounded-xl py-4 text-[16px] font-semibold text-white ${
            checkoutReady ? "bg-[#DFB400]" : "bg-[#DFB400]/50 cursor-not-allowed"
          }`}
        >
          Proceed to payment
        </button>
      </section>

      <BottomNav />

      <PhoneNumberModal
        open={showPhoneModal}
        phone={inputPhone}
        saving={savingPhone}
        onPhoneChange={setInputPhone}
        onSave={savePhoneNumber}
        onClose={() => setShowPhoneModal(false)}
      />
    </div>
  );
};

export default CartPage;