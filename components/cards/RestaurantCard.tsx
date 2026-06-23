import Link from "next/link";
import { FaStar } from "react-icons/fa";
import { LocationIcon, MoneyIcon, TimerIcon } from "@/components/svgs/DefaultIcons";

type RestaurantCardProps = {
  id: string;
  name: string;
  description: string;
  rating: string;
  reviews: number;
  timeRange: string;
  minOrder: string;
  area: string;
  distance: string;
  imgUrl: string;
};

const RestaurantCard = ({
  id,
  name,
  description,
  rating,
  reviews,
  timeRange,
  minOrder,
  area,
  distance,
  imgUrl,
}: RestaurantCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img src={imgUrl} alt={`${name} image`} className="w-full h-52 object-cover" />
      <div className="p-6">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <p className="text-[14px] text-[#A4A4A4]">{name}</p>
            <h2 className="text-[16px] font-bold mt-1">{description}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <FaStar className="text-[#DFB400]" />
              <span className="text-[14px] font-semibold">{rating}</span>
            </div>
            <span className="text-[14px] text-[#A4A4A4]">({reviews})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-[14px] text-[#333333]">
          <div className="flex items-center gap-2">
            <TimerIcon />
            <span>{timeRange}</span>
          </div>
          <div className="flex items-center gap-2">
            <MoneyIcon />
            <span>Min order: {minOrder}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LocationIcon />
            <div className="flex flex-col">
              <span className="text-[14px] text-[#333333]">{area}</span>
              <span className="text-[14px] text-[#A4A4A4]">({distance})</span>
            </div>
          </div>

          <Link
            href={`/customer/restaurants/${id}`}
            className="border border-[#DFB400] text-[#DFB400] font-semibold py-2 px-4 rounded-md hover:bg-[#DFB400] hover:text-white"
          >
            Check restaurant
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
