"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeftIcon, DefaultUserIcon, GreyedStarIcon, StarIcon } from "@/components/svgs/DefaultIcons";
import useAuthStore from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import BottomNav from "@/components/BottomNav";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type SavedAddress = {
  id: string;
  label: string;
  streetAddress: string;
  landmark: string | null;
  isDefault: boolean;
  serviceArea: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
};

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  return { value: day, label: String(index + 1) };
});

function getBirthdayParts(value: string | null | undefined) {
  if (!value) return { month: "", day: "" };

  const match = value.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
  return {
    month: match?.[1] ?? "",
    day: match?.[2] ?? "",
  };
}

function getBirthdayValue(month: string, day: string) {
  if (!month || !day) return null;
  return `${month}-${day}`;
}

function formatBirthdayLabel(value: string | null | undefined) {
  const { month, day } = getBirthdayParts(value);
  const monthLabel = MONTH_OPTIONS.find((option) => option.value === month)?.label;

  if (!monthLabel || !day) return "No birthday saved yet.";

  return `${monthLabel} ${Number(day)}`;
}

function formatAddress(address: SavedAddress) {
  return `${address.streetAddress}, ${address.serviceArea.name}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuthStore((s) => s.auth);
  const authLoading = useAuthStore((s) => s.loading);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const updateCustomerProfile = useAuthStore((s) => s.updateCustomerProfile);
  const logoutAuth = useAuthStore((s) => s.logout);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [editingBirthday, setEditingBirthday] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [orders] = useState([
    { id: "A1B2C3", title: "Amala + Ewedu", date: "2026-06-21", total: "₦2,800", rating: 4, status: "Delivered" },
    { id: "D4E5F6", title: "Jollof + Chicken", date: "2026-05-10", total: "₦3,200", rating: 0, status: "On the way" },
  ]);

  const [feedback, setFeedback] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);

  useEffect(() => {
    let mounted = true;

    fetchCurrentUser()
      .then((currentAuth) => {
        if (!mounted) return;

        if (!currentAuth) {
          showToast("Please log in to continue", "error");
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!mounted) return;

        showToast("Unable to load your profile", "error");
        router.replace("/login");
      })
      .finally(() => {
        if (!mounted) return;

        setCheckingAuth(false);
      });

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser, router, showToast]);

  useEffect(() => {
    if (!auth) return;

    let mounted = true;

    fetch(`${API_BASE_URL}/customer/addresses`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load saved addresses");

        return response.json() as Promise<{ addresses: SavedAddress[] }>;
      })
      .then((data) => {
        if (!mounted) return;

        setAddresses(data.addresses);
      })
      .catch((error) => {
        if (!mounted) return;

        showToast(error instanceof Error ? error.message : "Unable to load saved addresses", "error");
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingAddresses(false);
      });

    return () => {
      mounted = false;
    };
  }, [auth, showToast]);

  async function saveProfile() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      showToast("Please enter your full name", "error");
      return;
    }

    setSavingProfile(true);

    try {
      await updateCustomerProfile({
        fullName: trimmedName,
        phone: phone.trim() || null,
        birthday: getBirthdayValue(birthdayMonth, birthdayDay),
      });

      setName(trimmedName);
      setEditing(false);
      showToast("Profile updated successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveBirthday() {
    const birthdayValue = getBirthdayValue(birthdayMonth, birthdayDay);

    if (!birthdayValue) {
      showToast("Please choose your birthday month and day", "error");
      return;
    }

    setSavingBirthday(true);

    try {
      await updateCustomerProfile({
        birthday: birthdayValue,
      });

      setEditingBirthday(false);
      showToast("Birthday saved successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save birthday", "error");
    } finally {
      setSavingBirthday(false);
    }
  }

  function discardProfileEdits() {
    if (!auth) return;

    const birthdayParts = getBirthdayParts(auth.profile?.birthday);

    setName(auth.profile?.fullName ?? "");
    setEmail(auth.user.email);
    setPhone(auth.profile?.phone ?? "");
    setBirthdayMonth(birthdayParts.month);
    setBirthdayDay(birthdayParts.day);
    setEditing(false);
  }

  function openProfileEditor() {
    if (!auth) return;

    const birthdayParts = getBirthdayParts(auth.profile?.birthday);

    setName(auth.profile?.fullName ?? "");
    setEmail(auth.user.email);
    setPhone(auth.profile?.phone ?? "");
    setBirthdayMonth(birthdayParts.month);
    setBirthdayDay(birthdayParts.day);
    setEditing(true);
  }

  function toggleProfileEditor() {
    if (editing) {
      setEditing(false);
      return;
    }

    openProfileEditor();
  }

  function openBirthdayEditor() {
    const birthdayParts = getBirthdayParts(auth?.profile?.birthday);

    setBirthdayMonth(birthdayParts.month);
    setBirthdayDay(birthdayParts.day);
    setEditingBirthday(true);
  }

  async function deleteAddress(addressId: string) {
    setDeletingAddressId(addressId);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/addresses/${addressId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? "Unable to delete address");
      }

      setAddresses((currentAddresses) => currentAddresses.filter((address) => address.id !== addressId));
      showToast("Address deleted successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete address", "error");
    } finally {
      setDeletingAddressId(null);
    }
  }

  async function logout() {
    setLoggingOut(true);

    try {
      await logoutAuth();

      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      showToast("Logged out successfully", "success");
      router.push("/login");
    } catch {
      showToast("Logout failed. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F8] p-6">
        <p className="text-sm font-medium text-[#6B6B6B]">
          {checkingAuth || authLoading ? "Checking your session..." : "Redirecting to login..."}
        </p>
      </div>
    );
  }

  const displayName = editing ? name : auth.profile?.fullName ?? "";
  const displayEmail = editing ? email : auth.user.email;
  const displayPhone = editing ? phone : auth.profile?.phone ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen bg-[#F8F8F8] pb-28"
    >
      <div className="p-6">
        <header className="flex items-center justify-between mb-6">
          <Link href="/customer/dashboard" className="inline-flex items-center gap-3 text-[#4D4D4D]">
            <ArrowLeftIcon />
            <span className="text-lg font-semibold">Profile</span>
          </Link>
        </header>

        <section className="mb-6 overflow-hidden rounded-[28px] border border-[#F1D86F] bg-[#FFF8DC] p-4 shadow-[0_18px_50px_rgba(20,27,52,0.08)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-24 sm:w-24">
              <DefaultUserIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6A00]">Customer profile</p>
                  <h2 className="mt-1 break-words text-2xl font-semibold leading-tight text-[#141B34] sm:text-3xl">
                    {displayName || (authLoading ? "Loading..." : "Customer")}
                  </h2>
                  <p className="mt-2 break-all text-sm text-[#6B6B6B]">{displayEmail}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">
                    {displayPhone || "No phone number saved"}
                  </p>
                  {auth.profile?.birthday ? (
                    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#141B34] shadow-sm">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#DFB400]" />
                      <span className="truncate">Birthday: {formatBirthdayLabel(auth.profile.birthday)}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={toggleProfileEditor}
                  className="w-full rounded-2xl bg-[#141B34] px-4 py-3 text-sm font-semibold text-white shadow-sm sm:w-auto"
                >
                  {editing ? "Close" : "Edit profile"}
                </button>
              </div>
            </div>
          </div>

          {editing && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-[24px] bg-white p-5 shadow-sm border border-gray-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-gray-200 p-4" placeholder="Full name" />
                <input value={email} readOnly className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-[#6B6B6B]" aria-label="Email address" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-2xl border border-gray-200 p-4" placeholder="Phone number" />
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button disabled={savingProfile} onClick={saveProfile} className="flex-1 rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
                <button disabled={savingProfile} onClick={discardProfileEdits} className="flex-1 rounded-2xl border border-gray-300 py-3 text-sm font-semibold text-[#141B34] disabled:opacity-60">Discard</button>
              </div>
            </motion.div>
          )}
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Birthday perks</h3>
              <p className="text-sm text-[#6B6B6B]">Add your birthday to unlock special discounts from us.</p>
            </div>
            <div className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">Premium</div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            {auth.profile?.birthday && !editingBirthday ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#141B34]">{formatBirthdayLabel(auth.profile.birthday)}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">We will use this for birthday perks only.</p>
                </div>
                <button
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-[#141B34]"
                  onClick={openBirthdayEditor}
                >
                  Change birthday
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-center">
                <select
                  value={birthdayMonth}
                  onChange={(event) => setBirthdayMonth(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-3 text-[#141B34]"
                >
                  <option value="">Month</option>
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <select
                  value={birthdayDay}
                  onChange={(event) => setBirthdayDay(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-3 text-[#141B34]"
                >
                  <option value="">Day</option>
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <button
                  disabled={savingBirthday}
                  className="rounded-2xl bg-[#141B34] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={saveBirthday}
                >
                  {savingBirthday ? "Saving..." : "Save birthday"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Recent orders</h3>
              <p className="text-sm text-[#6B6B6B]">Track your latest order activity and status.</p>
            </div>
          </div>
          <div className="space-y-3">
            {orders.map((o) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] bg-white p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#6B6B6B]">{o.date}</p>
                    <p className="text-lg font-semibold text-[#141B34]">{o.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#A4A4A4]">Order ID</p>
                    <p className="text-sm font-semibold">{o.id}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="flex items-center justify-between gap-4 text-sm text-[#6B6B6B]">
                    <p>{o.total}</p>
                    <span className="rounded-full bg-[#FFF7E0] px-3 py-1 text-xs font-semibold text-[#141B34]">{o.rating ? `${o.rating}★` : "No rating"}</span>
                  </div>
                  <div className="rounded-3xl bg-[#F9F9F9] p-4">
                    <p className="text-sm text-[#6B6B6B] mb-3">Order status</p>
                    <div className="flex items-center gap-2">
                      {[
                        { label: "Placed", step: 0 },
                        { label: "Preparing", step: 1 },
                        { label: "On the way", step: 2 },
                        { label: "Delivered", step: 3 },
                      ].map((step, index) => {
                        const statusIndex = ["Placed", "Preparing", "On the way", "Delivered"].indexOf(o.status);
                        const active = index <= statusIndex;
                        return (
                          <Fragment key={step.label}>
                            <div className="flex min-w-[58px] flex-col items-center gap-2 text-center">
                              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${active ? "bg-[#141B34] text-white" : "bg-white text-[#A4A4A4] border border-gray-200"}`}>
                                {index + 1}
                              </div>
                              <p className="max-w-[70px] text-[10px] leading-4 text-[#6B6B6B]">{step.label}</p>
                            </div>
                            {index < 3 ? (
                              <div className={`flex-1 h-px self-center ${index < statusIndex ? "bg-[#141B34]" : "bg-gray-200"}`} />
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Saved addresses</h3>
              <p className="text-sm text-[#6B6B6B]">Keep up to 3 delivery addresses ready for checkout.</p>
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            {loadingAddresses ? (
              <p className="text-sm text-[#6B6B6B]">Loading saved addresses...</p>
            ) : null}

            {!loadingAddresses && addresses.length === 0 ? (
              <p className="text-sm text-[#6B6B6B]">No saved address yet.</p>
            ) : null}

            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div key={address.id} className="rounded-2xl border border-gray-200 bg-[#F9F9F9] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#141B34]">{address.label}</p>
                          {address.isDefault ? (
                            <span className="rounded-full bg-[#FFF7E0] px-2.5 py-1 text-[11px] font-semibold text-[#141B34]">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-[#4D4D4D]">{formatAddress(address)}</p>
                        {address.landmark ? (
                          <p className="mt-1 text-xs text-[#6B6B6B]">{address.landmark}</p>
                        ) : null}
                      </div>
                      <button
                        disabled={deletingAddressId === address.id}
                        onClick={() => deleteAddress(address.id)}
                        className="rounded-xl border border-[#E53E3E] px-3 py-2 text-xs font-semibold text-[#E53E3E] disabled:opacity-60"
                      >
                        {deletingAddressId === address.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <Link href="/customer/address" className="mt-4 inline-flex rounded-2xl bg-[#141B34] px-5 py-3 text-sm font-semibold text-white">
              Add address
            </Link>
          </div>
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-[#141B34]">Rate & Feedback</h3>
              <p className="text-sm text-[#6B6B6B]">Review an order and help us improve your experience.</p>
            </div>
          </div>
          <div className="rounded-[28px] bg-white p-5 shadow-sm border border-gray-200">
            <select
              className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-3 mb-4"
              onChange={(e) => setSelectedOrder(e.target.value)}
              value={selectedOrder ?? ""}
            >
              <option value="">Choose an order</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} — {o.id}
                </option>
              ))}
            </select>
            <div className="mb-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="rounded-full p-3"
                >
                  {selectedRating >= star ? <StarIcon /> : <GreyedStarIcon />}
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-2xl border border-gray-200 bg-[#F9F9F9] px-4 py-4 text-sm text-[#141B34]"
              placeholder="Write your feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl bg-[#141B34] py-3 text-sm font-semibold text-white"
                onClick={() => {
                  showToast("Feedback submitted successfully", "success");
                }}
              >
                Submit feedback
              </button>
              <button
                className="flex-1 rounded-2xl bg-[#4D4D4D] py-3 text-sm font-semibold text-white"
                onClick={() => {
                  setFeedback("");
                  setSelectedOrder(null);
                  setSelectedRating(0);
                }}
              >
                Clear form
              </button>
            </div>
          </div>
        </section>

        <div className="mb-20">
          <button disabled={loggingOut} onClick={logout} className="w-full rounded-2xl bg-[#E53E3E] py-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60">
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}
