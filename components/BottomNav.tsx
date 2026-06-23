import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { MdRestaurant } from "react-icons/md";
import { FaUser } from "react-icons/fa";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center py-3 px-6 shadow-sm z-50">
      <Link href="/customer/dashboard" className="flex flex-col items-center text-[#4D4D4D]">
        <AiFillHome size={24} />
        <span className="text-[12px] mt-1">Home</span>
      </Link>

      <Link href="/customer/restaurants" className="flex flex-col items-center text-[#4D4D4D]">
        <MdRestaurant size={24} />
        <span className="text-[12px] mt-1">Restaurant</span>
      </Link>

      <Link href="/customer/profile" className="flex flex-col items-center text-[#4D4D4D]">
        <FaUser size={22} />
        <span className="text-[12px] mt-1">Profile</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
