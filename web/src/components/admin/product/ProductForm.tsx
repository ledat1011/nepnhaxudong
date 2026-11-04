"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ConfirmDialog } from "@/components/admin/form/ConfirmDialog";
import { RequiredNote } from "@/components/admin/form/FieldError";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import { Switch } from "@/components/admin/ui/switch";
import { adminFetch } from "@/lib/admin/api";
import { fieldOfDetail, langOfDetail, NOT_SAVED_NOTICE, type FieldErrors, type FieldRule } from "@/lib/admin/field-errors";
import { toRequestText } from "@/lib/admin/localized";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { LocalizedText, PackagingDto, ProductAdminDto, ProductRequest } from "@/lib/admin/types";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { useLeavePage, useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { FeatureList, newFeatureRow, type FeatureRow } from "./FeatureList";
import { PackagingList, newPackagingRow, packagingErrorKey, type PackagingRow } from "./PackagingList";
import { moved } from "./rows";

/** Most images one product can have (the API refuses more). */
const MAX_IMAGES = 30;

/** The largest value of the Java Integer that holds the weight. */
const MAX_WEIGHT_GRAMS = 2147483647;

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

/** The API messages that name a field of this form (see `ProductService` and `ProductRequest`). */
const FIELD_RULES: FieldRule[] = [
  { prefix: "Tên sản phẩm", field: (detail) => `name.${langOfDetail(detail)}` },
  { prefix: "Đặc điểm", field: "features" },
];

function priceOf(row: PackagingRow): number | null {
  const text = row.price.trim();
  return text === "" ? null : Number(text);
}

/** The pack boxes that the API would refuse, checked here so the error can sit under the right box. */
function packagingErrors(rows: PackagingRow[]): FieldErrors {
  const errors: Record<string, string> = {};
  for (const row of rows) {
    const weight = Number(row.weight);
    if (row.weight.trim() === "" || !Number.isInteger(weight) || weight <= 0) {
      errors[packagingErrorKey(row, "weight")] = "Khối lượng phải là số nguyên lớn hơn 0.";
    } else if (weight > MAX_WEIGHT_GRAMS) {
      errors[packagingErrorKey(row, "weight")] = "Khối lượng quá lớn.";
    }
    const price = priceOf(row);
    if (price !== null && (!Number.isInteger(price) || price < 0)) {
      errors[packagingErrorKey(row, "price")] = "Giá phải là số nguyên không âm.";
    } else if (price !== null && price > Number.MAX_SAFE_INTEGER) {
      errors[packagingErrorKey(row, "price")] = "Giá quá lớn.";
    }
  }
  return errors;
}

/** The pack sizes of the request. `packagingErrors` has checked the rows. */
function toPackagings(rows: PackagingRow[]): PackagingDto[] {
  // A hidden price is still sent: the API hides it on the public pages while "Hiện giá" is off.
  return rows.map((row) => ({ weightGrams: Number(row.weight), priceVnd: priceOf(row), sortOrder: null }));
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
  // True after a create or delete succeeded, until the page changes: no second tap may write again.
  const [leaving, setLeaving] = useState(false);
  const dirty = snapshot(state) !== baselineSnapshot;
  useUnsavedChanges(dirty && !leaving);
  const leavePage = useLeavePage();
  const fields = useFieldErrors();

  // The form as it was when the running save was sent, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(async () => {
    const body = toRequest(state, baseline?.sortOrder);
    sent.current = snapshot(state);
    return baseline === undefined
      ? adminFetch<ProductAdminDto>("/admin/products", { method: "POST", body })
      : adminFetch<ProductAdminDto>(`/admin/products/${baseline.id}`, {
          method: "PUT",
          body,
        });
  }, {
    onError: (error) => {
      const field = fieldOfDetail(error.detail, FIELD_RULES);
      if (field !== null) fields.show({ [field]: error.detail });
    },
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
    const problems = packagingErrors(state.packagings);
    if (Object.keys(problems).length > 0) {
      saving.reset();
      fields.show(problems);
      return;
    }
    fields.reset();
    const saved = await saving.save();
    if (saved === undefined) return;
    if (baseline === undefined) {
      setLeaving(true);
      leavePage(() => router.replace(`${ADMIN_ROUTES.products}/${saved.id}`));
      return;
    }
    const fresh = stateFrom(saved);
    setBaseline(saved);
    setBaselineSnapshot(snapshot(fresh));
    // Show what the API stored, unless the user typed more while it was saving: that text stays, and stays unsaved.
    setState((current) => (snapshot(current) === sent.current ? fresh : current));
  }

  async function remove() {
    if (await deleting.save()) {
      setLeaving(true);
      leavePage(() => router.push(ADMIN_ROUTES.products));
    }
  }

  function cancel() {
    const original = stateFrom(baseline);
    setState(original);
    setBaselineSnapshot(snapshot(original));
    saving.reset();
    fields.reset();
  }

  function patch(change: Partial<FormState>) {
    setState((current) => ({ ...current, ...change }));
    // The error of a field goes away once the user changes that field.
    fields.clear(...Object.keys(change).flatMap((key) => [key, `${key}.`]));
  }

  // While a new product is created the fields cannot change: the page goes to the new product and would lose the text.
  const locked = baseline === undefined && (saving.pending || leaving);
  // An error that names a field is shown under that field, not here.
  const saveError = saving.error !== null && fieldOfDetail(saving.error.detail, FIELD_RULES) === null ? saving.error : null;

  return (
    <fieldset {...fields.rootProps} disabled={locked} className="flex min-w-0 flex-col gap-6 p-4 pb-44">
      <RequiredNote />
      <BilingualField
        label="Tên sản phẩm"
        value={state.name}
        onChange={(name) => patch({ name })}
        viRequired
        errors={{ vi: fields.errors["name.vi"], en: fields.errors["name.en"] }}
      />
      <BilingualField
        label="Mô tả"
        value={state.description}
        onChange={(description) => patch({ description })}
        multiline
      />
      <FeatureList rows={state.features} onChange={(features) => patch({ features })} error={fields.errors.features} />
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
        errors={fields.errors}
      />

      <ImageSection ids={state.mediaIds} onChange={(mediaIds) => patch({ mediaIds })} />

      <ProblemMessage error={saveError ?? deleting.error} />

      {baseline !== undefined ? (
        <Button
          type="button"
          variant="destructive"
          disabled={leaving || saving.pending}
          onClick={() => setConfirmDelete(true)}
        >
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

      <SaveBar
        dirty={dirty}
        pending={saving.pending || leaving}
        onSave={() => void save()}
        onDiscard={cancel}
        notice={fields.hasErrors ? NOT_SAVED_NOTICE : null}
      />
    </fieldset>
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
      <MediaPicker mode="multiple" value={ids} onChange={onChange} max={MAX_IMAGES} />
      {ids.length >= MAX_IMAGES ? (
        <p className="text-sm text-muted-foreground">Một sản phẩm có tối đa {MAX_IMAGES} ảnh.</p>
      ) : null}
    </fieldset>
  );
}
