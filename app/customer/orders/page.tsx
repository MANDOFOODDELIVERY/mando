"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import BottomNav from "@/components/BottomNav";
import { ArrowLeftIcon, GreyedStarIcon, StarIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const PAGE_SIZE = 5;
const HIDDEN_ORDER_IDS_KEY = "mando_hidden_customer_orders";

type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  restaurant: {
    name: string;
  };
};

export default function CustomerOrdersPage() {
  const showToast = useToastStore((s) => s.showToast);
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [openReviewOrderId, setOpenReviewOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  function getHiddenOrderIds() {
    if (typeof window === "undefined") return [];

    try {
      const saved = window.localStorage.getItem(HIDDEN_ORDER_IDS_KEY);
      const parsed = saved ? (JSON.parse(saved) as unknown) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/customer/orders`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load orders");
        return response.json() as Promise<{ orders: CustomerOrderSummary[] }>;
      })
      .then((data) => {
        if (mounted) {
          const hiddenOrderIds = new Set(getHiddenOrderIds());
          setOrders(data.orders.filter((order) => !hiddenOrderIds.has(order.id)));
        }
      })
      .catch((error) => {
        if (mounted) showToast(error instanceof Error ? error.message : "Unable to load orders", "error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [showToast]);

  const totalPages = Math.max(Math.ceil(orders.length / PAGE_SIZE), 1);
  const visibleOrders = useMemo(
    () => orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [orders, page],
  );

  async function submitReview(orderId: string) {
    if (!rating) {
      showToast("Please choose a rating", "error");
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/orders/${orderId}/review`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });

      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Unable to submit review");

      showToast("Review submitted successfully", "success");
      setOpenReviewOrderId(null);
      setRating(0);
      setComment("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to submit review", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  function deleteRecentOrder(orderId: string) {
    const hiddenOrderIds = new Set(getHiddenOrderIds());
    hiddenOrderIds.add(orderId);
    window.localStorage.setItem(
      HIDDEN_ORDER_IDS_KEY,
      JSON.stringify(Array.from(hiddenOrderIds)),
    );

    setOrders((current) => {
      const nextOrders = current.filter((order) => order.id !== orderId);
      const nextTotalPages = Math.max(Math.ceil(nextOrders.length / PAGE_SIZE), 1);
      setPage((currentPage) => Math.min(currentPage, nextTotalPages));
      return nextOrders;
    });
    showToast("Order removed from recent history", "success");
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <Link href="/customer/profile" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Order history</span>
          </Link>
        </header>

        <div className="space-y-4">
          {loading ? (
            [0, 1, 2].map((item) => (
              <div key={item} className="h-36 animate-pulse rounded-[24px] border border-gray-200 bg-white" />
            ))
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-gray-300 bg-white p-6 text-center text-sm font-semibold text-[#6B6B6B]">
              No orders yet.
            </div>
          ) : (
            visibleOrders.map((order) => (
              <div key={order.id} className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{formatDate(order.placedAt)}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#141B34]">{order.restaurant.name}</h2>
                    <p className="text-sm text-[#A4A4A4]">{order.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#141B34]">{formatCurrency(order.totalAmount)}</p>
                    <p className="mt-1 text-xs capitalize text-[#6B6B6B]">{order.status.replaceAll("_", " ")}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/customer/orders/${order.id}`}
                    className="flex-1 rounded-2xl bg-[#141B34] py-3 text-center text-sm font-semibold text-white"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    className="flex-1 rounded-2xl border border-[#141B34] py-3 text-sm font-semibold text-[#141B34]"
                    onClick={() => {
                      setOpenReviewOrderId((current) => (current === order.id ? null : order.id));
                      setRating(0);
                      setComment("");
                    }}
                  >
                    Rate order
                  </button>
                  <button
                    type="button"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E53E3E] py-3 text-sm font-semibold text-[#E53E3E]"
                    onClick={() => deleteRecentOrder(order.id)}
                  >
                    <FiTrash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>

                {openReviewOrderId === order.id ? (
                  <div className="mt-4 rounded-2xl bg-[#F9F9F9] p-4">
                    <div className="mb-4 flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="rounded-full p-2"
                        >
                          {rating >= star ? <StarIcon /> : <GreyedStarIcon />}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm text-[#141B34]"
                      placeholder="Write your review"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={4}
                    />
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={() => void submitReview(order.id)}
                      className="mt-3 w-full rounded-2xl bg-[#DFB400] py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {submittingReview ? "Submitting..." : "Submit review"}
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        {orders.length > PAGE_SIZE ? (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-[#141B34] disabled:opacity-50"
            >
              Previous
            </button>
            <p className="text-sm text-[#6B6B6B]">Page {page} of {totalPages}</p>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-semibold text-[#141B34] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
