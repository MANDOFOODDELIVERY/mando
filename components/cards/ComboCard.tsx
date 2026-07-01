import Link from "next/link";
import { StarIcon } from "../svgs/DefaultIcons";

type ComboCardProps = {
  title?: string;
  price?: string;
  vendor?: string;
  rating?: string;
  imgUrl?: string;
  href?: string;
};

const ComboCard = ({
  title = "Amala + Ewedu soup",
  price = "N2,800",
  vendor = "Mama Chef Cafe",
  rating,
  imgUrl = "/dummy-img.jpg",
  href,
}: ComboCardProps) => {
  const cardContent = (
    <>
      <div
        className="h-[194px] bg-cover bg-center relative rounded-lg"
        style={{ backgroundImage: `url(${imgUrl})` }}
      >
        <div className="bg-black/50 text-white h-[194px] rounded-lg p-3 flex flex-col justify-between">
          <div className="flex justify-end items-center space-x-1">
            <StarIcon />
            {rating ? <p className="text-[14px]">{rating}</p> : null}
          </div>

          <div className="flex justify-end">
            <span className="bg-white uppercase border-3 border-[#DFB400] text-[#DFB400] font-semibold py-2 px-6 rounded-lg hover:bg-[#f0f0f0]">
              Add
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span className="bg-[#DFB400] text-[#000000] font-semibold py-2 px-4 rounded-lg shadow-[0_32px_64px_rgba(223,180,0,0.45)] inline-block">
          {price}
        </span>

        <p className="text-[16px] font-semibold mt-2">{title}</p>
        <span className="text-[#4D00FF] my-2 bg-[#4D00FF1A] text-[13px] font-semibold py-1 px-3 rounded-lg inline-block">
          {vendor}
        </span>
      </div>
    </>
  );

  if (!href) {
    return <div>{cardContent}</div>;
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  );
};

export default ComboCard;
