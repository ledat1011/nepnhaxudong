"use client";

import { useId, useRef, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { buttonVariants } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { apiRest, langOfDetail, NOT_SAVED_NOTICE, type FieldRule, type Lang } from "@/lib/admin/field-errors";
import { toRequestText } from "@/lib/admin/localized";
import type { ContactSettings, LocalizedText } from "@/lib/admin/types";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { zaloHref, zaloNumber } from "@/lib/format";
import { SettingField } from "./SettingField";
import { SettingLoader } from "./SettingLoader";

type FormState = {
  phone: string;
  zalo: string;
  /** "Zalo dùng số điện thoại ở trên": the Zalo number sent is the phone number. The API has no such field. */
  zaloIsPhone: boolean;
  messenger: string;
  address: LocalizedText;
  mapUrl: string;
  hours: LocalizedText;
};

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

/** True when both numbers are set and dial the same digits ("0901 234 567" and "0901234567"). */
function sameNumber(phone: string | null, zalo: string | null): boolean {
  if (phone === null || zalo === null) return false;
  const digits = zaloNumber(phone);
  return digits !== null && digits === zaloNumber(zalo);
}

function stateFrom(settings: ContactSettings): FormState {
  return {
    phone: settings.phone ?? "",
    zalo: settings.zalo ?? "",
    zaloIsPhone: sameNumber(settings.phone, settings.zalo),
    messenger: settings.messenger ?? "",
    address: settings.address ?? EMPTY_TEXT,
    mapUrl: settings.mapUrl ?? "",
    hours: settings.hours ?? EMPTY_TEXT,
  };
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The Zalo number the website will use: the phone number while the tick is on. */
function zaloOf(state: FormState): string {
  return state.zaloIsPhone ? state.phone : state.zalo;
}

/** The request body. Every box may be empty: an empty box is `null`, never "". The API checks the rest. */
function toRequest(state: FormState): ContactSettings {
  return {
    phone: textOrNull(state.phone),
    zalo: textOrNull(zaloOf(state)),
    messenger: textOrNull(state.messenger),
    address: toRequestText(state.address),
    mapUrl: textOrNull(state.mapUrl),
    hours: toRequestText(state.hours),
  };
}

/** The longest text the API keeps in one language (`SettingRules.MAX_TEXT_LENGTH`). */
const MAX_TEXT_LENGTH = 500;

/** For a message that names no language (a length error): the box that is too long. */
function longBox(text: LocalizedText): Lang {
  return (text.vi ?? "").length <= MAX_TEXT_LENGTH && (text.en ?? "").length > MAX_TEXT_LENGTH ? "en" : "vi";
}

/** The API messages that name a field of this form (see `ContactSettings` and `SettingRules` of the API). */
function fieldRules(state: FormState): FieldRule[] {
  return [
    { prefix: "Số điện thoại", field: "phone" },
    // While the tick is on there is no Zalo box: the phone box holds the number.
    { prefix: "Số Zalo", field: state.zaloIsPhone ? "phone" : "zalo" },
    { prefix: "Đường dẫn Messenger", field: "messenger" },
    { prefix: "Đường dẫn bản đồ", field: "mapUrl" },
    { prefix: "Địa chỉ", field: (detail) => `address.${langOfDetail(detail, longBox(state.address))}` },
    {
      prefix: "Giờ làm việc",
      field: (detail) => `hours.${langOfDetail(detail, longBox(state.hours))}`,
      // The API calls it "Giờ làm việc"; the box here is "Giờ liên hệ".
      text: (detail) => detail.replace("Giờ làm việc", "Giờ liên hệ"),
    },
  ];
}

/** The contact details of the website: phone, Zalo, Messenger, address, map and hours. */
export function ContactForm() {
  return (
    <SettingLoader<ContactSettings> name="contact">{(initial) => <ContactFields initial={initial} />}</SettingLoader>
  );
}

function ContactFields({ initial }: { initial: ContactSettings }) {
  const sameId = useId();
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const dirty = JSON.stringify(state) !== baseline;
  useUnsavedChanges(dirty);
  const fields = useFieldErrors();
  const rules = fieldRules(state);

  // The request of the running save, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(() => {
    const body = toRequest(state);
    sent.current = JSON.stringify(body);
    return adminFetch<ContactSettings>("/admin/settings/contact", { method: "PUT", body });
  }, {
    onError: (error) => {
      fields.showApi(error.detail, rules);
    },
  });

  async function save() {
    fields.reset();
    const saved = await saving.save();
    if (saved === undefined) return;
    const fresh = stateFrom(saved);
    setBaseline(JSON.stringify(fresh));
    // Show what the API stored (it trims too), unless the user typed more while it was saving:
    // that text stays, and stays unsaved.
    setState((current) => (JSON.stringify(toRequest(current)) === sent.current ? fresh : current));
  }

  function cancel() {
    setState(JSON.parse(baseline) as FormState);
    saving.reset();
    fields.reset();
  }

  function patch(change: Partial<FormState>) {
    setState((current) => ({ ...current, ...change }));
    fields.clear(...Object.keys(change).flatMap((key) => [key, `${key}.`]));
  }

  // An error that names a field is shown under that field, not at the end of the form.
  // The part of a failed save that names no field, and errors whose box is not on screen.
  const saveError = [apiRest(saving.error, rules), ...fields.unshown].filter(Boolean).join(" ") || null;

  return (
    <div {...fields.rootProps} className="flex flex-col gap-5">
      <SettingField
        label="Điện thoại"
        inputMode="tel"
        value={state.phone}
        error={fields.errors.phone}
        onChange={(phone) => patch({ phone })}
      />
      <div className="flex flex-col gap-3">
        <label htmlFor={sameId} className="flex min-h-11 items-center gap-3 text-base">
          <input
            id={sameId}
            type="checkbox"
            className="size-5 shrink-0 accent-primary"
            checked={state.zaloIsPhone}
            onChange={(event) => patch({ zaloIsPhone: event.target.checked })}
          />
          Zalo dùng số điện thoại ở trên
        </label>
        {state.zaloIsPhone ? null : (
          <SettingField
            label="Số Zalo"
            inputMode="tel"
            hint="Ví dụ: 0912 345 678"
            value={state.zalo}
            error={fields.errors.zalo}
            onChange={(zalo) => patch({ zalo })}
          />
        )}
        <ZaloTry number={zaloOf(state)} />
      </div>
      <SettingField
        label="Messenger (đường dẫn)"
        inputMode="url"
        placeholder="https://m.me/..."
        value={state.messenger}
        error={fields.errors.messenger}
        onChange={(messenger) => patch({ messenger })}
      />
      <BilingualField
        label="Địa chỉ"
        value={state.address}
        onChange={(address) => patch({ address })}
        multiline
        errors={{ vi: fields.errors["address.vi"], en: fields.errors["address.en"] }}
      />
      <SettingField
        label="Đường dẫn bản đồ"
        inputMode="url"
        placeholder="https://maps.google.com/..."
        value={state.mapUrl}
        error={fields.errors.mapUrl}
        onChange={(mapUrl) => patch({ mapUrl })}
      />
      <BilingualField
        label="Giờ liên hệ"
        value={state.hours}
        onChange={(hours) => patch({ hours })}
        errors={{ vi: fields.errors["hours.vi"], en: fields.errors["hours.en"] }}
      />
      <ProblemMessage message={saveError} />
      <SaveBar
        dirty={dirty}
        pending={saving.pending}
        onSave={() => void save()}
        onDiscard={cancel}
        notice={fields.hasErrors ? NOT_SAVED_NOTICE : null}
      />
    </div>
  );
}

/**
 * "Thử mở Zalo": opens the chat of the number on screen, saved or not, the way the Zalo button of the public site
 * does. Shown only when there is a number to open.
 */
function ZaloTry({ number }: { number: string }) {
  if (zaloNumber(number) === null) return null;
  return (
    <a
      href={zaloHref(number)}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", className: "self-start" })}
    >
      Thử mở Zalo
      <span className="sr-only"> (mở thẻ mới)</span>
    </a>
  );
}
