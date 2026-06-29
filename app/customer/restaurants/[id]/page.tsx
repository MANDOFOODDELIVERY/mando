import RestaurantDetailsClient from "./RestaurantDetailsClient";

export default async function RestaurantDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <RestaurantDetailsClient restaurantId={id} />;
}