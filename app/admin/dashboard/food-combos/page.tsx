"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBan, FaCheckCircle, FaClock, FaCloudUploadAlt, FaEdit, FaFilter, FaImage, FaPlus, FaSearch, FaShoppingBag, FaTrash, FaUtensils } from "react-icons/fa";
import StatsCard from "@/components/cards/StatsCard";

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const comboCategories = ["Rice", "Local dish", "Pasta", "Swallow", "Grill", "Breakfast", "Promo", "Other"];

type ComboStatus = "active" | "draft" | "paused" | "sold out";
type ComboCampaignStatus = "draft" | "scheduled" | "active" | "paused" | "expired";
type ComboCampaign = {
  id: string;
  flyerUrl: string | null;
  flyerPublicId: string | null;
  content: string;
  startsAt: string | null;
  endsAt: string | null;
  status: ComboCampaignStatus;
  stats: { viewed: number; clicked: number; shared: number };
};

type Combo = {
  id: string;
  name: string;
  restaurant: string;
  category: string;
  image: string;
  price: number;
  margin: number;
  orders: number;
  rating: number;
  status: ComboStatus;
  isPromoCombo: boolean;
  isFeatured: boolean;
  items: { name: string; quantity: string; extraPrice: number }[];
  campaign: ComboCampaign | null;
};

type FoodCombosResponse = {
  stats: {
    total: number;
    active: number;
    inactive: number;
    outOfStock: number;
    totalOrdersThisWeek: number;
  };
  combos: Combo[];
  restaurants: string[];
  serviceAreas: { id: string; name: string }[];
  menuItemsByRestaurant: Record<string, string[]>;
};

type CloudinarySignatureResponse = {
  upload: {
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
    publicId: string;
    uploadUrl: string;
  };
};

type CloudinaryUploadResponse = {
  secure_url: string;
};

type UploadProgress = {
  label: string;
  percent: number;
};

const emptyData: FoodCombosResponse = {
  stats: { total: 0, active: 0, inactive: 0, outOfStock: 0, totalOrdersThisWeek: 0 },
  combos: [],
  restaurants: [],
  serviceAreas: [],
  menuItemsByRestaurant: {},
};

export default function AdminFoodCombosPage() {
  const [status, setStatus] = useState("All");
  const [data, setData] = useState<FoodCombosResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [comboModalMode, setComboModalMode] = useState<"add" | "edit" | null>(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  async function loadCombos() {
    const payload = await fetch(`${API_BASE_URL}/admin/food-combos`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load food combos");
        return response.json() as Promise<FoodCombosResponse>;
      });
    setData(payload);
    setSelectedCombo((current) => current ? payload.combos.find((combo) => combo.id === current.id) ?? payload.combos[0] ?? null : payload.combos[0] ?? null);
  }

  useEffect(() => {
    let mounted = true;

    void Promise.resolve()
      .then(() => loadCombos())
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCombos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.combos.filter((combo) => {
      const statusMatch = status === "All" || combo.status === status.toLowerCase();
      const searchMatch = !query || [combo.name, combo.restaurant, combo.category].some((value) => value.toLowerCase().includes(query));
      return statusMatch && searchMatch;
    });
  }, [data.combos, search, status]);

  async function removeCombo(combo: Combo) {
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/admin/food-combos/${combo.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setNotice(response.ok ? "Combo removed." : "Unable to remove combo.");
    if (response.ok) await loadCombos();
  }

  const stats = [
    { id: 1, statTitle: "Total Combos", qty: String(data.stats.total), crease: "Catalog combos", theme: "bg-[#FFFBEB]", increase: true, icon: <FaUtensils />, iconColor: "text-[#FE9A00]" },
    { id: 2, statTitle: "Active", qty: String(data.stats.active), crease: "Visible to customers", theme: "bg-[#ECFDF5]", increase: true, icon: <FaCheckCircle />, iconColor: "text-[#16A34A]" },
    { id: 3, statTitle: "Inactive Combos", qty: String(data.stats.inactive), crease: "Draft or paused", theme: "bg-[#F3F4F6]", increase: false, icon: <FaBan />, iconColor: "text-[#6A7282]" },
    { id: 4, statTitle: "Out of Stock", qty: String(data.stats.outOfStock), crease: "Unavailable now", theme: "bg-[#FEF2F2]", increase: false, icon: <FaClock />, iconColor: "text-[#FF6467]" },
    { id: 5, statTitle: "Total Orders", qty: String(data.stats.totalOrdersThisWeek), crease: "This week", theme: "bg-[#EFF6FF]", increase: true, icon: <FaShoppingBag />, iconColor: "text-[#2563EB]" },
  ];

  return (
    <div className="pb-10 pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-[#101828]">Food Combos</h2>
          <p className="text-[11px] text-[#99A1AF]">Create coherent meal bundles from restaurant menu items and control what customers see.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<FaCloudUploadAlt />}>Import items</Button>
          <Button icon={<FaPlus />} onClick={() => setComboModalMode("add")}>Create combo</Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-5 gap-3">
        {stats.map((item) => <StatsCard key={item.id} {...item} />)}
      </div>

      <section className={`mt-8 grid gap-5 ${selectedCombo ? "grid-cols-[1fr_380px]" : "grid-cols-1"}`}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#101828]">Combo Catalog</h3>
              <p className="mt-1 text-[11px] text-[#99A1AF]">Review pricing, portions, availability and performance.</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[10px] text-[#99A1AF]"><FaSearch /><input value={search} onChange={(event) => setSearch(event.currentTarget.value)} className="w-36 outline-none" placeholder="Search combos" /></label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]"><FaFilter /><select value={status} onChange={(event) => setStatus(event.currentTarget.value)} className="outline-none"><option>All</option><option>active</option><option>draft</option><option>paused</option><option>sold out</option></select></label>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[1.6fr_1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr] gap-4 rounded-lg bg-gray-50 p-3 text-[10px] font-semibold text-[#99A1AF]">
            <p>Combo</p><p>Restaurant</p><p>Category</p><p>Price</p><p>Orders</p><p>Rating</p><p>Status</p>
          </div>
          <div className="space-y-1">
            {filteredCombos.map((combo) => (
              <button key={combo.id} onClick={() => setSelectedCombo(combo)} className={`grid w-full grid-cols-[1.6fr_1.2fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-4 rounded-lg px-2 py-3 text-left text-[10px] text-[#6A7282] hover:bg-[#FFF7E0] ${selectedCombo?.id === combo.id ? "bg-[#FFF7E0]" : ""}`}>
                <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-[#FFFBEB]" /><div><p className="font-semibold text-[#101828]">{combo.name}</p><p className="text-[#99A1AF]">{combo.items.length} items</p></div></div>
                <p>{combo.restaurant}</p><p>{combo.category}</p><p>{formatCurrency(combo.price)}</p><p>{combo.orders}</p><p>{combo.rating.toFixed(1)}</p><StatusPill status={combo.status} />
              </button>
            ))}
            {!loading && filteredCombos.length === 0 ? <p className="py-8 text-center text-[11px] text-[#99A1AF]">No combos found.</p> : null}
          </div>
        </div>

        {selectedCombo ? (
          <aside className="sticky top-24 h-fit rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-sm font-semibold text-[#101828]">{selectedCombo.name}</h3><p className="mt-1 text-[10px] text-[#99A1AF]">{selectedCombo.restaurant}</p></div>
              <button onClick={() => setSelectedCombo(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-[#6A7282]">Close</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniCard label="Price" value={formatCurrency(selectedCombo.price)} />
              <MiniCard label="Margin" value={formatCurrency(selectedCombo.margin)} />
              <MiniCard label="Orders" value={String(selectedCombo.orders)} />
            </div>
            <section className="mt-5">
              <h4 className="text-xs font-semibold text-[#101828]">Combo Items</h4>
              <div className="mt-3 space-y-2">
                {selectedCombo.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-[10px]">
                    <div><p className="font-semibold text-[#101828]">{item.name}</p><p className="text-[#99A1AF]">{item.quantity}</p></div>
                    <p className="font-semibold text-[#6A7282]">+{formatCurrency(item.extraPrice)}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-5 rounded-2xl border border-[#FFE7B8] bg-[#FFFBEB] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-[#101828]">Sales campaign</h4>
                  <p className="mt-1 text-[10px] text-[#927238]">Flyer and caption shown to sales agents.</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-semibold capitalize text-[#B7791F] shadow-sm">
                  {selectedCombo.campaign?.status ?? "not set"}
                </span>
              </div>
              {selectedCombo.campaign ? (
                <div className="mt-4 space-y-3">
                  {selectedCombo.campaign.flyerUrl ? <img src={selectedCombo.campaign.flyerUrl} alt="" className="h-32 w-full rounded-xl object-cover" /> : null}
                  <p className="rounded-xl bg-white/80 p-3 text-[10px] leading-5 text-[#6A7282]">
                    {selectedCombo.campaign.content || "No campaign caption yet."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniCard label="Starts" value={formatScheduleDate(selectedCombo.campaign.startsAt)} />
                    <MiniCard label="Ends" value={formatScheduleDate(selectedCombo.campaign.endsAt)} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniCard label="Viewed" value={String(selectedCombo.campaign.stats.viewed)} />
                    <MiniCard label="Clicked" value={String(selectedCombo.campaign.stats.clicked)} />
                    <MiniCard label="Shared" value={String(selectedCombo.campaign.stats.shared)} />
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-white/80 p-3 text-[10px] text-[#927238]">No campaign has been configured for this combo yet.</p>
              )}
            </section>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button icon={<FaEdit />} onClick={() => setComboModalMode("edit")}>Edit combo</Button>
              <Button variant="danger" icon={<FaTrash />} onClick={() => removeCombo(selectedCombo)}>Remove</Button>
            </div>
          </aside>
        ) : null}
      </section>

      {notice ? <p className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#101828] px-4 py-3 text-[11px] font-semibold text-white shadow-xl">{notice}</p> : null}
      {comboModalMode ? <ComboModal mode={comboModalMode} combo={comboModalMode === "edit" ? selectedCombo : null} restaurants={data.restaurants} serviceAreas={data.serviceAreas} menuItemsByRestaurant={data.menuItemsByRestaurant} onClose={() => setComboModalMode(null)} onSaved={() => { setNotice(comboModalMode === "add" ? "Combo saved." : "Combo updated."); setComboModalMode(null); void loadCombos(); }} /> : null}
    </div>
  );
}

function ComboModal({ mode, combo, restaurants, serviceAreas, menuItemsByRestaurant, onClose, onSaved }: { mode: "add" | "edit"; combo: Combo | null; restaurants: string[]; serviceAreas: { id: string; name: string }[]; menuItemsByRestaurant: Record<string, string[]>; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"Basic info" | "Pricing" | "Availability" | "Items" | "Campaign">("Basic info");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(combo?.restaurant ?? restaurants[0] ?? "");
  const [itemRowCount, setItemRowCount] = useState(combo?.items.length ?? 1);
  const tabs = ["Basic info", "Pricing", "Availability", "Items", "Campaign"] as const;
  const itemOptions = menuItemsByRestaurant[selectedRestaurant] ?? [];
  const baseItemSlots = combo?.items.length ? combo.items : [
    { name: "", quantity: "1", extraPrice: 0 },
    { name: "", quantity: "1", extraPrice: 0 },
    { name: "", quantity: "1", extraPrice: 0 },
    { name: itemOptions.find((item) => item.toLowerCase().includes("takeaway")) ?? "", quantity: "1", extraPrice: 0 },
  ];
  const itemSlots = Array.from({ length: itemRowCount }, (_, index) => baseItemSlots[index] ?? { name: "", quantity: "1", extraPrice: 0 });

  async function submit(formData: FormData) {
    setSaving(true);
    setProgress(null);
    setError("");
    try {
      const imageUrl = await uploadAdminImage(getSelectedFile(formData, "comboImage"), "combo_image", setProgress);
      const campaignFlyerUrl = await uploadAdminImage(getSelectedFile(formData, "campaignFlyer"), "promo_banner", setProgress);
      const items = Array.from({ length: itemRowCount }, (_, index) => index)
        .map((index) => ({
          name: String(formData.get(`itemName${index}`) ?? "").trim(),
          quantity: Number(formData.get(`itemQuantity${index}`) || 1),
          extraPrice: Number(formData.get(`itemPrice${index}`) || 0),
        }))
        .filter((item) => item.name);
      const response = await fetch(`${API_BASE_URL}/admin/food-combos${mode === "edit" && combo ? `/${combo.id}` : ""}`, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.get("name"),
          restaurant: formData.get("restaurant"),
          category: formData.get("category"),
          description: formData.get("description"),
          imageUrl: imageUrl ?? combo?.image ?? "",
          price: formData.get("price"),
          status: String(formData.get("status") ?? "active").toLowerCase(),
          isFeatured: formData.get("isFeatured") === "Yes",
          isPromoCombo: formData.get("isPromoCombo") === "Yes",
          serviceArea: formData.get("serviceArea"),
          campaign: {
            flyerUrl: campaignFlyerUrl ?? combo?.campaign?.flyerUrl ?? null,
            flyerPublicId: combo?.campaign?.flyerPublicId ?? null,
            content: formData.get("campaignContent"),
            startsAt: formData.get("campaignStartsAt") || null,
            endsAt: formData.get("campaignEndsAt") || null,
            status: formData.get("campaignStatus") || "draft",
          },
          items,
        }),
      });
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(payload?.message ?? "Unable to save combo");
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save combo");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#101828]">{mode === "add" ? "Add Combo" : "Edit Combo"}</h2>
            <p className="mt-1 text-[11px] text-[#6A7282]">Create a coherent combo from restaurant menu items.</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-[10px] font-semibold text-[#6A7282]">Close</button>
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2 rounded-xl bg-gray-100 p-1">
          {tabs.map((item) => (
            <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${tab === item ? "bg-white text-[#101828] shadow-sm" : "text-[#6A7282]"}`}>
              {item}
            </button>
          ))}
        </div>

        <form action={submit} noValidate className="mt-5">
          <div className={tab === "Basic info" ? "grid grid-cols-2 gap-4" : "hidden"}>
              <FormField name="name" label="Combo name" defaultValue={combo?.name ?? ""} placeholder="Jollof Rice & Chicken" />
              <SelectField name="restaurant" label="Restaurant" options={restaurants.length ? restaurants : combo?.restaurant ? [combo.restaurant] : []} value={selectedRestaurant} onChange={(event) => setSelectedRestaurant(event.currentTarget.value)} />
              <SelectField name="category" label="Category" options={comboCategories} defaultValue={comboCategories.includes(combo?.category ?? "") ? combo?.category : "Other"} />
              <FormField name="description" label="Short description" defaultValue="" placeholder="What makes this combo special" />
              <div className="col-span-2">
                <FileUploadField label="Combo image" name="comboImage" currentUrl={combo?.image} progress={progress} />
              </div>
          </div>
          <div className={tab === "Pricing" ? "grid grid-cols-2 gap-4" : "hidden"}>
              <FormField name="price" label="Customer price" type="number" defaultValue={combo ? String(combo.price) : ""} placeholder="2500" />
              <FormField label="Mando price" type="number" defaultValue={combo ? String(combo.margin) : ""} placeholder="300" />
              <FormField label="Restaurant payout" type="number" defaultValue={combo ? String(combo.price - combo.margin) : ""} placeholder="2200" />
              <FormField label="Promo price" type="number" placeholder="Optional" />
          </div>
          <div className={tab === "Availability" ? "grid grid-cols-2 gap-4" : "hidden"}>
              <SelectField name="status" label="Status" options={["active", "draft", "paused", "sold out"]} defaultValue={combo?.status ?? "active"} />
              <SelectField name="isFeatured" label="Featured" options={["No", "Yes"]} />
              <SelectField name="isPromoCombo" label="Promo combo" options={["No", "Yes"]} defaultValue={combo?.isPromoCombo ? "Yes" : "No"} />
              <SelectField name="serviceArea" label="Service area" options={["All service areas", ...serviceAreas.map((area) => area.name)]} defaultValue="All service areas" />
              <FormField label="Available from" type="time" />
              <FormField label="Available until" type="time" />
              <FormField label="Daily stock limit" type="number" placeholder="Optional" />
          </div>
          <div className={tab === "Items" ? "space-y-3" : "hidden"}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold text-[#6A7282]">Combo food items</p>
                <button type="button" onClick={() => setItemRowCount((count) => count + 1)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold text-[#6A7282]">
                  Add new item
                </button>
              </div>
              {itemSlots.map((item, index) => (
                <div key={`${item.name || "item"}-${index}`} className="grid grid-cols-[1fr_120px_120px] gap-3 rounded-xl bg-gray-50 p-3">
                  <SelectField name={`itemName${index}`} label={`Food item ${index + 1}`} options={itemOptions.length ? itemOptions : combo?.items.map((comboItem) => comboItem.name) ?? []} defaultValue={item.name} />
                  <FormField name={`itemQuantity${index}`} label="Quantity" type="number" defaultValue={String(parseComboItemQuantity(item.quantity))} placeholder="2" />
                  <FormField name={`itemPrice${index}`} label="Extra price" type="number" defaultValue={String(item.extraPrice ?? 0)} placeholder="0" />
                </div>
              ))}
          </div>
          <div className={tab === "Campaign" ? "space-y-4" : "hidden"}>
              <div className="rounded-2xl border border-[#FFE7B8] bg-[#FFFBEB] p-4">
                <p className="text-[11px] font-semibold text-[#101828]">Sales agent campaign</p>
                <p className="mt-1 text-[10px] leading-5 text-[#927238]">Upload the flyer and caption sales agents will share. The agent-specific combo link is attached later by the sales dashboard.</p>
              </div>
              <FileUploadField label="Campaign flyer" name="campaignFlyer" currentUrl={combo?.campaign?.flyerUrl ?? undefined} progress={progress} />
              <TextAreaField name="campaignContent" label="Campaign caption" defaultValue={combo?.campaign?.content ?? ""} placeholder="Write the caption sales agents should post with this flyer." />
              <div className="grid grid-cols-3 gap-4">
                <FormField name="campaignStartsAt" label="Starts at" type="datetime-local" defaultValue={formatDateTimeInput(combo?.campaign?.startsAt)} />
                <FormField name="campaignEndsAt" label="Ends at" type="datetime-local" defaultValue={formatDateTimeInput(combo?.campaign?.endsAt)} />
                <SelectField name="campaignStatus" label="Campaign status" options={["draft", "scheduled", "active", "paused", "expired"]} defaultValue={combo?.campaign?.status ?? "draft"} />
              </div>
          </div>
          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{error}</p> : null}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-[11px] font-semibold text-[#6A7282] disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save combo"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getSelectedFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadAdminImage(
  file: File | null,
  type: "combo_image" | "promo_banner",
  onProgress?: (progress: UploadProgress) => void,
) {
  if (!file) return null;

  if (file.size > 4 * 1024 * 1024) {
    throw new Error("Images must be 4MB or smaller");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file");
  }

  onProgress?.({ label: `Preparing ${file.name}`, percent: 20 });

  const signatureResponse = await fetch(`${API_BASE_URL}/uploads/signature`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });

  if (!signatureResponse.ok) {
    throw new Error("Unable to prepare image upload");
  }

  const { upload } = (await signatureResponse.json()) as CloudinarySignatureResponse;
  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append("file", file);
  cloudinaryFormData.append("api_key", upload.apiKey);
  cloudinaryFormData.append("timestamp", String(upload.timestamp));
  cloudinaryFormData.append("signature", upload.signature);
  cloudinaryFormData.append("folder", upload.folder);
  cloudinaryFormData.append("public_id", upload.publicId);

  onProgress?.({ label: `Uploading ${file.name}`, percent: 65 });

  const cloudinaryResponse = await fetch(upload.uploadUrl, {
    method: "POST",
    body: cloudinaryFormData,
  });

  if (!cloudinaryResponse.ok) {
    throw new Error("Unable to upload image");
  }

  const uploadedFile = (await cloudinaryResponse.json()) as CloudinaryUploadResponse;
  onProgress?.({ label: `${file.name} uploaded`, percent: 100 });

  return uploadedFile.secure_url;
}

function FileUploadField({ label, name, currentUrl, progress }: { label: string; name: string; currentUrl?: string; progress: UploadProgress | null }) {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <label className="block">
      <span className="text-[10px] font-semibold text-[#6A7282]">{label}</span>
      <input
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setFileName(file?.name ?? "");
          if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(file ? URL.createObjectURL(file) : currentUrl ?? null);
        }}
      />
      <div className="mt-2 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-center transition hover:border-[#FE9A00] hover:bg-[#FFFBEB]">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-20 w-24 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#FE9A00] shadow-sm">
            <FaImage />
          </div>
        )}
        <p className="mt-3 max-w-full truncate text-[11px] font-semibold text-[#101828]">{fileName || "Upload combo image"}</p>
        <p className="mt-1 text-[10px] text-[#99A1AF]">PNG or JPG, 4MB max</p>
        {progress && fileName ? (
          <div className="mt-3 w-full">
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[#FE9A00] transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <p className="mt-1 truncate text-[10px] font-semibold text-[#B7791F]">{progress.label}</p>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function FormField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><input {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}

function SelectField({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><select {...props} className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10">{options.map((option, index) => <option key={`${option}-${index}`}>{option}</option>)}</select></label>;
}

function TextAreaField({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return <label className="block"><span className="text-[10px] font-semibold text-[#6A7282]">{label}</span><textarea {...props} className="mt-2 min-h-28 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[11px] leading-5 outline-none focus:border-[#FE9A00] focus:ring-2 focus:ring-[#FE9A00]/10" /></label>;
}

function Button({ children, icon, variant = "primary", onClick, type = "button", disabled }: { children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "secondary" | "danger"; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const style = variant === "primary" ? "bg-[#FE9A00] text-white" : variant === "danger" ? "border border-red-200 bg-red-50 text-red-600" : "border border-gray-200 bg-white text-[#6A7282]";
  return <button type={type} disabled={disabled} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${style}`}>{icon}{children}</button>;
}
function MiniCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-[#99A1AF]">{label}</p><p className="mt-2 text-xs font-semibold text-[#101828]">{value}</p></div>;
}
function StatusPill({ status }: { status: ComboStatus }) {
  const styles = { active: "bg-[#DCFCE7] text-[#16A34A]", draft: "bg-[#EFF6FF] text-[#1D4ED8]", paused: "bg-gray-100 text-[#6A7282]", "sold out": "bg-[#FEF2F2] text-[#DC2626]" };
  return <p className={`rounded-lg px-2 py-1 text-center text-[10px] font-semibold capitalize ${styles[status]}`}>{status}</p>;
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function parseComboItemQuantity(quantity: string) {
  const parsed = Number.parseInt(quantity, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatScheduleDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}