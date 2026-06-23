"use client";

import {
  ArrowLeftIcon,
  SearchIcon,
} from "@/components/svgs/DefaultIcons";
import Link from "next/link";
import RestaurantCard from "@/components/cards/RestaurantCard";
import BottomNav from "@/components/BottomNav";

const RESTAURANTS = [
  {
    id: "mama-chef",
    name: "Mama Chef Cafe",
    description: "Local Nigerian Dishes",
    rating: "4.7",
    reviews: 124,
    timeRange: "30-40 mins",
    minOrder: "₦1500",
    area: "Modomo, Ile-Ife",
    distance: "2.8 km",
    imgUrl: "/restaurant-dummy.png",
  },
  {
    id: "spice-hut",
    name: "Spice Hut",
    description: "Fast Afro-Fusion Meals",
    rating: "4.6",
    reviews: 98,
    timeRange: "25-35 mins",
    minOrder: "₦1200",
    area: "Ogudu, Lagos",
    distance: "1.4 km",
    imgUrl: "/restaurant-dummy.png",
  },
  {
    id: "urban-grill",
    name: "Urban Grill",
    description: "Grilled Favorites & Sides",
    rating: "4.8",
    reviews: 210,
    timeRange: "20-30 mins",
    minOrder: "₦1800",
    area: "Ikeja, Lagos",
    distance: "3.2 km",
    imgUrl: "/restaurant-dummy.png",
  },
  {
    id: "bella-bites",
    name: "Bella Bites",
    description: "Quick Bites & Juices",
    rating: "4.5",
    reviews: 76,
    timeRange: "15-25 mins",
    minOrder: "₦1000",
    area: "GRA, Port Harcourt",
    distance: "2.1 km",
    imgUrl: "/restaurant-dummy.png",
  },
  {
    id: "harvest-kitchen",
    name: "Harvest Kitchen",
    description: "Healthy Plates & Bowls",
    rating: "4.9",
    reviews: 180,
    timeRange: "35-45 mins",
    minOrder: "₦2000",
    area: "Victoria Island, Lagos",
    distance: "5.3 km",
    imgUrl: "/restaurant-dummy.png",
  },
];

const SuggestedRestaurant = () => {
  return (
    <div className="p-6 pb-28">
      <header className="flex items-center mb-6">
        <Link
          href="/customer/dashboard"
          className="flex items-center space-x-3"
        >
          <ArrowLeftIcon />
          <span className="text-[24px] font-semibold">
            Suggested Restaurants
          </span>
        </Link>
      </header>

      <div className="flex items-center space-x-3 rounded-md border border-[#cccccc] p-3 w-full mb-8">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search for restaurants..."
          className="placeholder:text-[#A4A4A4] text-[14px] focus:outline-none w-full"
        />
      </div>

      <div className="grid gap-6">
        {RESTAURANTS.map((restaurant) => (
          <RestaurantCard key={restaurant.id} {...restaurant} />
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default SuggestedRestaurant;
