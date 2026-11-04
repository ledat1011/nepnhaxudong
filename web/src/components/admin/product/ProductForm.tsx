"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import { Switch } from "@/components/admin/ui/switch";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError } from "@/lib/admin/errors";
import { toRequestText } from "@/lib/admin/localized";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { LocalizedText, PackagingDto, ProductAdminDto, ProductRequest } from "@/lib/admin/types";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { FeatureList, newFeatureRow, type FeatureRow } from "./FeatureList";
import { PackagingList, newPackagingRow, type PackagingRow } from "./PackagingList";
import { moved } from "./rows";

/** Most images one product can have (the API refuses more). */
const MAX_IMAGES = 30;

type FormState = {
  name: LocalizedText;
  description: LocalizedText;
  cookingTips: LocalizedText;
  features: FeatureRow[];
  showPrice: boolean;
  packagings: PackagingRow[];
  mediaIds: number[];
};

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

function stateFrom(product: ProductAdminDto | undefined): FormState {
  if (product === undefined) {
    return {
      name: EMPTY_TEXT,
      description: EMPTY_TEXT,
      cookingTips: EMPTY_TEXT,
      features: [],
      showPrice: false,
      packagings: [],
      mediaIds: [],
    };
  }
  const count = Math.max(product.features.vi.length, product.features.en.length);
  return {
    name: product.name,
    description: product.description,
    cookingTips: product.cookingTips,
    features: Array.from({ length: count }, (_, i) =>
      newFeatureRow(product.features.vi[i] ?? "", product.features.en[i] ?? ""),
    ),
    showPrice: product.showPrice,
    packagings: product.packagings.map((p) =>
      newPackagingRow(String(p.weightGrams), p.priceVnd === null ? "" : String(p.priceVnd)),
    ),
    mediaIds: product.mediaIds,
  };
}

/** What the user can change, without the row keys: two states with the same snapshot are the same content. */
function snapshot(state: FormState): string {
  return JSON.stringify({
    ...state,
    features: state.features.map(({ vi, en }) => ({ vi, en })),
    packagings: state.packagings.map(({ weight, price }) => ({
      weight,
      price,
    })),
  });
}

function invalid(message: string): AdminApiError {
  return new AdminApiError(400, message);
}

function toPackagings(rows: PackagingRow[]): PackagingDto[] {
  return rows.map((row, index) => {
    const weight = Number(row.weight);
    if (row.weight.trim() === "" || !Number.isInteger(weight) || weight <= 0) {
      throw invalid(`Quy cách ${index + 1}: khối lượng phải là số nguyên lớn hơn 0.`);
    }
    // A hidden price is still sent: the API hides it on the public pages while "Hiện giá" is off.
    const priceText = row.price.trim();
    const price = priceText === "" ? null : Number(priceText);
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      throw invalid(`Quy cách ${index + 1}: giá phải là số nguyên không âm.`);
    }
    return { weightGrams: weight, priceVnd: price, sortOrder: null };
  });
}

/** The request body. A blank English box is `null`; the lists keep only the rows that have text. */
function toRequest(state: FormState, sortOrder: number | undefined): ProductRequest {
  const vi = state.features.map((row) => row.vi.trim()).filter((text) => text !== "");
  const en = state.features.map((row) => row.en.trim()).filter((text) => text !== "");
  return {
    sortOrder,
    showPrice: state.showPrice,
    name: toRequestText(state.name),
    description: toRequestText(state.description),
    features: { vi, en },
    cookingTips: toRequestText(state.cookingTips),
    packagings: toPackagings(state.packagings),
    mediaIds: state.mediaIds,
  };
}

/** The editor of one product. Without `initial` it creates a new product. */
export function ProductForm({ initial }: { initial?: ProductAdminDto }) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<ProductAdminDto | undefined>(initial);
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baselineSnapshot, setBaselineSnapshot] = useState(() => snapshot(stateFrom(initial)));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = snapshot(state) !== baselineSnapshot;
  useUnsavedChanges(dirty);

  const saving = useSave(async () => {
    const body = toRequest(state, baseline?.sortOrder);
    return baseline === undefined
      ? adminFetch<ProductAdminDto>("/admin/products", { method: "POST", body })
      : adminFetch<ProductAdminDto>(`/admin/products/${baseline.id}`, {
          method: "PUT",
          body,
        });
  });
  const deleting = useSave(
    async () => {
      await adminFetch<void>(`/admin/products/${baseline?.id}`, {
        method: "DELETE",
      });
      return true;
    },
    { successMessage: "Đã xóa sản phẩm." },
  );

  async function save() {
    const saved = await saving.save();
    if (saved === undefined) return;
    if (baseline === undefined) {
      router.push(ADMIN_ROUTES.products);
      return;
    }
    const fresh = stateFrom(saved);
    setBaseline(saved);
    setState(fresh);
    setBaselineSnapshot(snapshot(fresh));
  }

  async function remove() {
    if (await deleting.save()) router.push(ADMIN_ROUTES.products);
  }

  function cancel() {
    const original = stateFrom(baseline);
    setState(original);
    setBaselineSnapshot(snapshot(original));
    saving.reset();
  }

  function patch(change: Partial<FormState>) {
    setState((current) => ({ ...current, ...change }));
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-44">
      <BilingualField label="Tên sản phẩm" value={state.name} onChange={(name) => patch({ name })} viRequired />
      <BilingualField
        label="Mô tả"
        value={state.description}
        onChange={(description) => patch({ description })}
        multiline
      />
      <FeatureList rows={state.features} onChange={(features) => patch({ features })} />
      <BilingualField
        label="Mẹo nấu"
        value={state.cookingTips}
        onChange={(cookingTips) => patch({ cookingTips })}
        multiline
      />

      <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border p-3 text-base font-semibold">
        <span id="show-price-label">Hiện giá</span>
        <Switch
          aria-labelledby="show-price-label"
          checked={state.showPrice}
          onCheckedChange={(showPrice) => patch({ showPrice })}
        />
      </label>
      <PackagingList
        rows={state.packagings}
        showPrice={state.showPrice}
        onChange={(packagings) => patch({ packagings })}
      />

      <ImageSection ids={state.mediaIds} onChange={(mediaIds) => patch({ mediaIds })} />

      <ProblemMessage error={saving.error ?? deleting.error} />

      {baseline !== undefined ? (
        <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
          Xóa sản phẩm
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa sản phẩm này?"
        description="Sản phẩm sẽ biến mất khỏi website. Bạn có thể khôi phục từ mục Lịch sử."
        confirmLabel="Xóa"
        destructive
        onConfirm={() => void remove()}
      />

      <SaveBar dirty={dirty} pending={saving.pending} onSave={() => void save()} onCancel={cancel} />
    </div>
  );
}

function ImageSection({ ids, onChange }: { ids: number[]; onChange(ids: number[]): void }) {
  const { items } = useMediaByIds(ids);
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="mb-2 text-base font-semibold">Ảnh</legend>
      <ul className="flex flex-col gap-2">
        {ids.map((id, index) => {
          const media = items.find((item) => item.id === id);
          const name = media?.altVi ?? `số ${id}`;
          return (
            <li key={id} className="flex items-center gap-2 rounded-md border p-2">
              {media !== undefined ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={media.url}
                  alt={name}
                  width={media.width}
                  height={media.height}
                  className="size-16 rounded object-cover"
                />
              ) : (
                <span className="size-16 rounded bg-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Đưa ảnh ${name} lên`}
                disabled={index === 0}
                onClick={() => onChange(moved(ids, index, -1))}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Đưa ảnh ${name} xuống`}
                disabled={index === ids.length - 1}
                onClick={() => onChange(moved(ids, index, 1))}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Bỏ ảnh ${name}`}
                onClick={() => onChange(ids.filter((other) => other !== id))}
              >
                <X />
              </Button>
            </li>
          );
        })}
      </ul>
      <MediaPicker mode="multiple" value={ids} onChange={(next) => onChange(next.slice(0, MAX_IMAGES))} />
      {ids.length >= MAX_IMAGES ? (
        <p className="text-sm text-muted-foreground">Một sản phẩm có tối đa {MAX_IMAGES} ảnh.</p>
      ) : null}
    </fieldset>
  );
}
