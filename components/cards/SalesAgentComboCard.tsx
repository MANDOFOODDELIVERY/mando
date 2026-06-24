"use client";

import { useToastStore } from "@/store/toastStore";

type SalesAgentComboCardProps = {
  title?: string;
  price?: string;
  vendor?: string;
  imgUrl?: string;
  uniqueUrl?: string;
};

const SalesAgentComboCard = ({
  title = "Amala + Ewedu soup",
  price = "N2,800",
  vendor = "Mama Chef Cafe",
  imgUrl = "/dummy-img.jpg",
  uniqueUrl = "https://mando.app/r/agent-123",
}: SalesAgentComboCardProps) => {
  const showToast = useToastStore((s) => s.showToast);

  const handleShare = async () => {
    const shareText = `Check out this amazing combo: ${title}\n${price}\nFrom ${vendor}\n\nShop now: ${uniqueUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: uniqueUrl,
        });
        showToast("Shared successfully", "success");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          showToast("Share failed, try again", "error");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      showToast("Share text copied to clipboard", "success");
    }
  };

  return (
    <div className="overflow-hidden rounded-[24px] bg-white shadow-sm border border-gray-200">
      <div
        className="h-[194px] bg-cover bg-center"
        style={{ backgroundImage: `url(${imgUrl})` }}
      />

      <div className="p-4">
        <p className="text-sm text-[#A4A4A4]">{vendor}</p>
        <p className="mt-2 text-base font-semibold text-[#141B34]">{title}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-block rounded-2xl bg-[#DFB400] px-4 py-2 text-sm font-semibold text-[#141B34]">
            {price}
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="rounded-2xl bg-[#141B34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#101828]"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesAgentComboCard;
