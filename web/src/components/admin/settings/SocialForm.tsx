"use client";

import { useRef, useState } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { SaveBar } from "@/components/admin/form/SaveBar";
import { adminFetch } from "@/lib/admin/api";
import type { SocialSettings } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";
import { useUnsavedChanges } from "@/lib/admin/use-unsaved-changes";
import { SettingField } from "./SettingField";
import { SettingLoader } from "./SettingLoader";

type FormState = { facebook: string; youtube: string; tiktok: string };

function stateFrom(settings: SocialSettings): FormState {
  return { facebook: settings.facebook ?? "", youtube: settings.youtube ?? "", tiktok: settings.tiktok ?? "" };
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The request body. An empty box is `null`, never "". The API checks the addresses. */
function toRequest(state: FormState): SocialSettings {
  return {
    facebook: textOrNull(state.facebook),
    youtube: textOrNull(state.youtube),
    tiktok: textOrNull(state.tiktok),
  };
}

/** The pages of the family on Facebook, YouTube and TikTok. */
export function SocialForm() {
  return (
    <SettingLoader<SocialSettings> name="social">{(initial) => <SocialFields initial={initial} />}</SettingLoader>
  );
}

function SocialFields({ initial }: { initial: SocialSettings }) {
  const [state, setState] = useState<FormState>(() => stateFrom(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFrom(initial)));
  const dirty = JSON.stringify(state) !== baseline;
  useUnsavedChanges(dirty);

  // The request of the running save, to tell later whether the user typed something else meanwhile.
  const sent = useRef<string | null>(null);

  const saving = useSave(() => {
    const body = toRequest(state);
    sent.current = JSON.stringify(body);
    return adminFetch<SocialSettings>("/admin/settings/social", { method: "PUT", body });
  });

  async function save() {
    const saved = await saving.save();
    if (saved === undefined) return;
    const fresh = stateFrom(saved);
    setBaseline(JSON.stringify(fresh));
    // Show what the API stored, unless the user typed more while it was saving: that text stays, and stays unsaved.
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
      <SettingField
        label="Facebook"
        inputMode="url"
        placeholder="https://www.facebook.com/..."
        value={state.facebook}
        onChange={(facebook) => patch({ facebook })}
      />
      <SettingField
        label="YouTube"
        inputMode="url"
        placeholder="https://www.youtube.com/..."
        value={state.youtube}
        onChange={(youtube) => patch({ youtube })}
      />
      <SettingField
        label="TikTok"
        inputMode="url"
        placeholder="https://www.tiktok.com/..."
        value={state.tiktok}
        onChange={(tiktok) => patch({ tiktok })}
      />
      <ProblemMessage error={saving.error} />
      <SaveBar dirty={dirty} pending={saving.pending} onSave={() => void save()} onDiscard={cancel} />
    </div>
  );
}
