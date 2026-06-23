import { notFound } from "next/navigation";
import RestaurantDetailsClient from "./RestaurantDetailsClient";

const RESTAURANTS = [
  {
    id: "mama-chef",
    name: "Mama Chef Cafe",
    rating: "4.7",
    prepTime: "30-40 mins",
    area: "Modomo, Ile-Ife",
    description:
      "Enjoy authentic local Nigerian dishes made fresh daily. Our menu features comforting classics with bold, home-style flavors.",
  },
  {
    id: "spice-hut",
    name: "Spice Hut",
    rating: "4.6",
    prepTime: "25-35 mins",
    area: "Ogudu, Lagos",
    description:
      "Fast Afro-fusion meals crafted for flavor seekers. Try our spicy jollof rice and grilled chicken combos today.",
  },
  {
    id: "urban-grill",
    name: "Urban Grill",
    rating: "4.8",
    prepTime: "20-30 mins",
    area: "Ikeja, Lagos",
    description:
      "Grilled favorites and sides served with a modern twist. Perfect for hearty lunch and dinner orders.",
  },
];

export default async function RestaurantDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = RESTAURANTS.find((item) => item.id === id);

  if (!restaurant) {
    notFound();
  }

  return <RestaurantDetailsClient restaurant={restaurant} />;
}
