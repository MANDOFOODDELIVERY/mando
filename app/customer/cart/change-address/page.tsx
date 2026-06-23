"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";

const LOCATIONS = [
  "Fashina",
  "Modomo",
  "Moremi Estate",
  "Ikeja Road",
  "Mayfair",
  "Ede Road",
  "Modakeke",
];

export default function ChangeAddressPage() {
  const router = useRouter();
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress);
  const [selected, setSelected] = useState<string | null>(LOCATIONS[0]);
  const [street, setStreet] = useState("");

  function clear() {
    setSelected(null);
    setStreet("");
  }

  function save() {
    if (!selected) return;
    const newAddress = street ? `${street}, ${selected}` : selected;
    setDeliveryAddress(newAddress);
    router.push("/customer/cart");
  }

  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link href="/customer/cart" className="flex items-center space-x-3">
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">Change address</span>
        </Link>
      </header>

      <section className="mb-6 rounded-xl border border-gray-200 p-4 bg-[#FAFAFA]">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Current location</h3>
        <p className="text-[16px] font-semibold">{deliveryAddress}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Select your location</h3>
        <div className="flex flex-wrap gap-3">
          {LOCATIONS.map((loc) => {
            const active = selected === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelected(loc)}
                className={`px-4 py-2 rounded-md border ${
                  active ? "border-[#DFB400] bg-[#FFF7E0] text-[#000]" : "border-gray-300 text-[#6B6B6B]"
                }`}
              >
                {loc}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm text-[#A4A4A4] mb-3">Enter your street address</h3>
        <div className="border border-gray-200 rounded-md p-4 relative">
          <input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={selected ? `e.g. 12 ${selected} street` : "Select a location first"}
            className="w-full focus:outline-none text-[14px]"
          />
        </div>
        <div className="text-sm text-[#A4A4A4] flex justify-end mt-3">Can't find your location?</div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3">
        <button onClick={clear} className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600">
          Clear
        </button>
        <button onClick={save} className="flex-1 py-3 rounded-md bg-[#DFB400] text-black font-semibold">
          Save address
        </button>
      </div>
    </div>
  );
}
