"use client";

import Link from "next/link";

type SearchResult = {
  label: string;
  href: string;
  meta?: string;
};

type CustomerSearchDropdownProps = {
  query: string;
  results: SearchResult[];
  recentSearches: string[];
  onRecentSearch: (value: string) => void;
  filters: { label: string; href: string }[];
};

export default function CustomerSearchDropdown({
  query,
  results,
  recentSearches,
  onRecentSearch,
  filters,
}: CustomerSearchDropdownProps) {
  if (!query.trim() && recentSearches.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.12)]">
      <div className="border-b border-gray-100 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-[#A4A4A4]">Filters</p>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.href}
              href={filter.href}
              className="rounded-full bg-[#FFF7E0] px-3 py-1.5 text-xs font-semibold text-[#141B34]"
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </div>

      {recentSearches.length > 0 ? (
        <div className="border-b border-gray-100 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-[#A4A4A4]">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 4).map((search) => (
              <button
                key={search}
                type="button"
                onClick={() => onRecentSearch(search)}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#6B6B6B]"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-[#A4A4A4]">Matching results</p>
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.slice(0, 5).map((result) => (
              <Link
                key={result.href}
                href={result.href}
                className="block rounded-xl px-3 py-2 hover:bg-[#F7F7F7]"
              >
                <p className="text-sm font-semibold text-[#141B34]">{result.label}</p>
                {result.meta ? <p className="text-xs text-[#6B6B6B]">{result.meta}</p> : null}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6B6B6B]">No close matches yet.</p>
        )}
      </div>
    </div>
  );
}
