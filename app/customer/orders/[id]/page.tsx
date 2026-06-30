"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import { useToastStore } from "@/store/toastStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalAmount: number;
  deliveryFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
  placedAt: string;
  canCancel: boolean;
  restaurant: {
    name: string;
    phone: string | null;
  };
  delivery: {
    recipientName: string;
    phone: string;
    streetAddress: string;
    serviceArea: string;
    landmark: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    unitPriceAmount: number;
    quantity: number;
    lineTotalAmount: number;
    components: Array<{
      id: string;
      itemName: string;
      quantity: number;
      unitPriceAmount: number;
      lineTotalAmount: number;
    }>;
  }>;
  timeline: Array<{
    id: string;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
  issues: Array<{
    id: string;
    status: string;
    reason: string;
    resolution: string | null;
    createdAt: string;
  }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    amount: number;
    currency: string;
  }>;
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
};

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  async function loadOrder() {
    const response = await fetch(`${API_BASE_URL}/customer/orders/${id}`, {
      credentials: "include",
    });

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? "Unable to load order");
    }

    const data = (await response.json()) as { order: OrderDetail };
    setOrder(data.order);
  }

  useEffect(() => {
    let mounted = true;

    loadOrder()
      .catch((error) => {
        if (!mounted) return;
        showToast(error instanceof Error ? error.message : "Unable to load order", "error");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  async function cancelOrder() {
    if (!order) return;

    setCancelling(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/orders/${order.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      const data = (await response.json().catch(() => null)) as
        | { order?: Pick<OrderDetail, "id" | "status" | "canCancel">; message?: string }
        | null;

      if (!response.ok || !data?.order) {
        throw new Error(data?.message ?? "Unable to cancel order");
      }

      setOrder((currentOrder) =>
        currentOrder
          ? { ...currentOrder, status: data.order!.status, canCancel: false }
          : currentOrder,
      );
      showToast("Order cancelled successfully", "success");
      await loadOrder();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to cancel order", "error");
    } finally {
      setCancelling(false);
    }
  }

  async function reportOrder() {
    const trimmedReason = reportReason.trim();

    if (!order || trimmedReason.length < 5) {
      showToast("Please describe the issue", "error");
      return;
    }

    setReporting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/orders/${order.id}/report`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to report issue");
      }

      setReportReason("");
      showToast("Issue reported successfully", "success");
      await loadOrder();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to report issue", "error");
    } finally {
      setReporting(false);
    }
  }

  async function submitReview() {
    if (!order || selectedRating === 0) {
      showToast("Please choose a rating", "error");
      return;
    }

    setSubmittingReview(true);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/orders/${order.id}/review`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: selectedRating,
          comment: reviewComment.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to submit review");
      }

      showToast("Review submitted successfully", "success");
      await loadOrder();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to submit review", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-[#141B34]">Order not found</p>
          <Link href="/customer/profile" className="mt-4 inline-flex text-[#DFB400]">
            Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] p-6 pb-24">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link href="/customer/profile" className="inline-flex items-center gap-3 text-[#4D4D4D]">
          <ArrowLeftIcon />
          <span className="text-lg font-semibold">Order details</span>
        </Link>
        <span className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">
          {getStatusLabel(order.status)}
        </span>
      </header>

      <section className="mb-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-[#A4A4A4]">Order ID</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#141B34]">{order.orderNumber}</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">{formatDate(order.placedAt)}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F9F9F9] p-4">
            <p className="text-sm text-[#A4A4A4]">Restaurant</p>
            <p className="mt-1 font-semibold text-[#141B34]">{order.restaurant.name}</p>
            {order.restaurant.phone ? (
              <p className="mt-1 text-sm text-[#6B6B6B]">{order.restaurant.phone}</p>
            ) : null}
          </div>
          <div className="rounded-2xl bg-[#F9F9F9] p-4">
            <p className="text-sm text-[#A4A4A4]">Delivery</p>
            <p className="mt-1 font-semibold text-[#141B34]">{order.delivery.streetAddress}</p>
            <p className="mt-1 text-sm text-[#6B6B6B]">{order.delivery.serviceArea}</p>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#141B34]">Items</h2>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-[#F9F9F9] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#141B34]">{item.name}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold text-[#141B34]">{formatNaira(item.lineTotalAmount)}</p>
              </div>
              {item.components.length > 0 ? (
                <div className="mt-3 space-y-1 border-t border-gray-200 pt-3">
                  {item.components.map((component) => (
                    <p key={component.id} className="text-sm text-[#6B6B6B]">
                      {component.itemName} x{component.quantity}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between text-[#6B6B6B]">
            <span>Subtotal</span>
            <span>{formatNaira(order.subtotalAmount)}</span>
          </div>
          <div className="flex justify-between text-[#6B6B6B]">
            <span>Delivery</span>
            <span>{formatNaira(order.deliveryFeeAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-[#141B34]">
            <span>Total</span>
            <span>{formatNaira(order.totalAmount)}</span>
          </div>
        </div>
      </section>

      <section className="mb-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#141B34]">Tracking</h2>
        <div className="space-y-4">
          {order.timeline.map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="mt-1 h-3 w-3 rounded-full bg-[#DFB400]" />
              <div>
                <p className="font-semibold text-[#141B34]">{getStatusLabel(event.status)}</p>
                <p className="text-sm text-[#6B6B6B]">{event.note ?? "Status updated"}</p>
                <p className="mt-1 text-xs text-[#A4A4A4]">{formatDate(event.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[#141B34]">Need help?</h2>
        {order.canCancel ? (
          <button
            type="button"
            disabled={cancelling}
            onClick={() => setShowCancelConfirmation(true)}
            className="mb-4 w-full rounded-2xl border border-[#E53E3E] py-3 text-sm font-semibold text-[#E53E3E] disabled:opacity-60"
          >
            {cancelling ? "Cancelling..." : "Cancel order"}
          </button>
        ) : null}
        <textarea
          value={reportReason}
          onChange={(event) => setReportReason(event.target.value)}
          rows={4}
          placeholder="Report a problem with this order"
          className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] p-4 text-sm text-[#141B34]"
        />
        <button
          type="button"
          disabled={reporting}
          onClick={reportOrder}
          className="mt-3 w-full rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {reporting ? "Submitting..." : "Report issue"}
        </button>

        {order.issues.length > 0 ? (
          <div className="mt-5 space-y-3">
            {order.issues.map((issue) => (
              <div key={issue.id} className="rounded-2xl bg-[#F9F9F9] p-4">
                <p className="text-sm font-semibold text-[#141B34]">{getStatusLabel(issue.status)}</p>
                <p className="mt-1 text-sm text-[#6B6B6B]">{issue.reason}</p>
                {issue.resolution ? (
                  <p className="mt-2 text-sm text-[#141B34]">{issue.resolution}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {order.status === "delivered" ? (
        <section className="mb-5 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[#141B34]">Rate this order</h2>
          {order.review ? (
            <div className="rounded-2xl bg-[#F9F9F9] p-4">
              <p className="font-semibold text-[#141B34]">{order.review.rating} out of 5</p>
              {order.review.comment ? (
                <p className="mt-2 text-sm text-[#6B6B6B]">{order.review.comment}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setSelectedRating(rating)}
                    className={`h-11 w-11 rounded-full text-sm font-semibold ${
                      selectedRating >= rating
                        ? "bg-[#DFB400] text-white"
                        : "bg-[#F3F3F3] text-[#A4A4A4]"
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                rows={4}
                placeholder="Leave a short review"
                className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] p-4 text-sm text-[#141B34]"
              />
              <button
                type="button"
                disabled={submittingReview}
                onClick={submitReview}
                className="mt-3 w-full rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submittingReview ? "Submitting..." : "Submit review"}
              </button>
            </>
          )}
        </section>
      ) : null}

      <ConfirmationModal
        open={showCancelConfirmation}
        title="Cancel order?"
        description="This will stop the order before the restaurant starts processing it. You can report an issue instead if the order is already in progress."
        confirmLabel="Cancel order"
        confirming={cancelling}
        danger
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={() => {
          setShowCancelConfirmation(false);
          void cancelOrder();
        }}
      />
    </div>
  );
}
