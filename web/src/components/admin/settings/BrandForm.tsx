"use client";

import { useRef, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { adminFetch } from "@/lib/admin/api";
import { toRequestText } from "@/lib/admin/localized";
import type { BrandSettings, LocalizedText } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { SettingLoader } from "./SettingLoader";

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

function stateFrom(settings: BrandSettings): LocalizedText {
  return settings.tagline ?? EMPTY_TEXT;
}

/** The short line under the name of the family. */
export function BrandForm() {
  return <SettingLoader<BrandSettings> name="brand">{(initial) => <BrandFields initial={initial} />}</SettingLoader>;
}

function BrandFields({ initial }: { initial: BrandSettings }) {
  const [tagline, setTagline] = useState<LocalizedText>(() => stateFrom(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const dirty = JSON.stringify(tagline) !== baseline;
  useUnsavedChanges(dirty);

  // The request of the running save, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(() => {
    const body: BrandSettings = { tagline: toRequestText(tagline) };
    sent.current = JSON.stringify(body);
    return adminFetch<BrandSettings>("/admin/settings/brand", { method: "PUT", body });
  });

  async function save() {
    const saved = await saving.save();
    if (saved === undefined) return;
    const fresh = stateFrom(saved);
    setBaseline(JSON.stringify(fresh));
    // Show what the API stored, unless the user typed more while it was saving: that text stays, and stays unsaved.
    setTagline((current) => (JSON.stringify({ tagline: toRequestText(current) }) === sent.current ? fresh : current));
  }

  function cancel() {
    setTagline(JSON.parse(baseline) as LocalizedText);
    saving.reset();
  }

  return (
    <div className="flex flex-col gap-5">
      <BilingualField label="Khẩu hiệu" value={tagline} onChange={setTagline} />
      <ProblemMessage error={saving.error} />
      <SaveBar dirty={dirty} pending={saving.pending} onSave={() => void save()} onDiscard={cancel} />
    </div>
  );
}
