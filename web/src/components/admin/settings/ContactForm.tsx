"use client";

import { useRef, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { adminFetch } from "@/lib/admin/api";
import { toRequestText } from "@/lib/admin/localized";
import type { ContactSettings, LocalizedText } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { SettingField } from "./SettingField";
import { SettingLoader } from "./SettingLoader";

type FormState = {
  phone: string;
  zalo: string;
  messenger: string;
  address: LocalizedText;
  mapUrl: string;
  hours: LocalizedText;
};

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

function stateFrom(settings: ContactSettings): FormState {
  return {
    phone: settings.phone ?? "",
    zalo: settings.zalo ?? "",
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

/** The request body. Every box may be empty: an empty box is `null`, never "". The API checks the rest. */
function toRequest(state: FormState): ContactSettings {
  return {
    phone: textOrNull(state.phone),
    zalo: textOrNull(state.zalo),
    messenger: textOrNull(state.messenger),
    address: toRequestText(state.address),
    mapUrl: textOrNull(state.mapUrl),
    hours: toRequestText(state.hours),
  };
}

/** The contact details of the website: phone, Zalo, Messenger, address, map and hours. */
export function ContactForm() {
  return (
    <SettingLoader<ContactSettings> name="contact">{(initial) => <ContactFields initial={initial} />}</SettingLoader>
  );
}

function ContactFields({ initial }: { initial: ContactSettings }) {
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const dirty = JSON.stringify(state) !== baseline;
  useUnsavedChanges(dirty);

  // The request of the running save, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(() => {
    const body = toRequest(state);
    sent.current = JSON.stringify(body);
    return adminFetch<ContactSettings>("/admin/settings/contact", { method: "PUT", body });
  });

  async function save() {
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
  }

  function patch(change: Partial<FormState>) {
    setState((current) => ({ ...current, ...change }));
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingField label="Điện thoại" inputMode="tel" value={state.phone} onChange={(phone) => patch({ phone })} />
      <SettingField label="Zalo (chỉ số)" inputMode="tel" value={state.zalo} onChange={(zalo) => patch({ zalo })} />
      <SettingField
        label="Messenger (đường dẫn)"
        inputMode="url"
        placeholder="https://m.me/..."
        value={state.messenger}
        onChange={(messenger) => patch({ messenger })}
      />
      <BilingualField label="Địa chỉ" value={state.address} onChange={(address) => patch({ address })} multiline />
      <SettingField
        label="Đường dẫn bản đồ"
        inputMode="url"
        placeholder="https://maps.google.com/..."
        value={state.mapUrl}
        onChange={(mapUrl) => patch({ mapUrl })}
      />
      <BilingualField label="Giờ liên hệ" value={state.hours} onChange={(hours) => patch({ hours })} />
      <ProblemMessage error={saving.error} />
      <SaveBar dirty={dirty} pending={saving.pending} onSave={() => void save()} onDiscard={cancel} />
    </div>
  );
}
