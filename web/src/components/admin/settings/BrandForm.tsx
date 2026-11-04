"use client";

import { useRef, useState } from "react";
import { BilingualField } from "@/components/admin/form/BilingualField";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { adminFetch } from "@/lib/admin/api";
import { fieldOfDetail, langOfDetail, NOT_SAVED_NOTICE, type FieldRule } from "@/lib/admin/field-errors";
import { toRequestText } from "@/lib/admin/localized";
import type { BrandSettings, LocalizedText } from "@/lib/admin/types";
import { useFieldErrors } from "@/lib/admin/use-field-errors";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { SettingLoader } from "./SettingLoader";

const EMPTY_TEXT: LocalizedText = { vi: null, en: null };

function stateFrom(settings: BrandSettings): LocalizedText {
  return settings.tagline ?? EMPTY_TEXT;
}

/** The longest text the API keeps in one language (`SettingRules.MAX_TEXT_LENGTH`). */
const MAX_TEXT_LENGTH = 500;

/** The short line under the name of the family. */
export function BrandForm() {
  return <SettingLoader<BrandSettings> name="brand">{(initial) => <BrandFields initial={initial} />}</SettingLoader>;
}

function BrandFields({ initial }: { initial: BrandSettings }) {
  const [tagline, setTagline] = useState<LocalizedText>(() => stateFrom(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const dirty = JSON.stringify(tagline) !== baseline;
  useUnsavedChanges(dirty);
  const fields = useFieldErrors();
  // The API message names the field (see `BrandSettings` of the API); a length error names no language.
  const longLang = (tagline.vi ?? "").length <= MAX_TEXT_LENGTH && (tagline.en ?? "").length > MAX_TEXT_LENGTH ? "en" : "vi";
  const rules: FieldRule[] = [{ prefix: "Khẩu hiệu", field: (detail) => `tagline.${langOfDetail(detail, longLang)}` }];

  // The request of the running save, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(() => {
    const body: BrandSettings = { tagline: toRequestText(tagline) };
    sent.current = JSON.stringify(body);
    return adminFetch<BrandSettings>("/admin/settings/brand", { method: "PUT", body });
  }, {
    onError: (error) => {
      const field = fieldOfDetail(error.detail, rules);
      if (field !== null) fields.show({ [field]: error.detail });
    },
  });

  async function save() {
    fields.reset();
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
    fields.reset();
  }

  function change(next: LocalizedText) {
    setTagline(next);
    fields.clear("tagline.");
  }

  const saveError = saving.error !== null && fieldOfDetail(saving.error.detail, rules) === null ? saving.error : null;

  return (
    <div {...fields.rootProps} className="flex flex-col gap-5">
      <BilingualField
        label="Khẩu hiệu"
        value={tagline}
        onChange={change}
        errors={{ vi: fields.errors["tagline.vi"], en: fields.errors["tagline.en"] }}
      />
      <ProblemMessage error={saveError} />
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
