"use client";

import { useState } from "react";
import { BrandForm } from "@/components/admin/settings/BrandForm";
import { ContactForm } from "@/components/admin/settings/ContactForm";
import { SocialForm } from "@/components/admin/settings/SocialForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";

const PANELS = [
  { value: "contact", label: "Liên hệ", form: <ContactForm /> },
  { value: "social", label: "Mạng xã hội", form: <SocialForm /> },
  { value: "brand", label: "Thương hiệu", form: <BrandForm /> },
] as const;

/**
 * Contact details, social pages and brand line. Every panel stays mounted (it is only hidden), so a change
 * typed in one panel is not lost when the user looks at another one. Each form saves on its own.
 */
export default function SettingsPage() {
  const [tab, setTab] = useState<string>("contact");
  return (
    <div className="p-4 pb-44">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          {PANELS.map((panel) => (
            <TabsTrigger key={panel.value} value={panel.value}>
              {panel.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {PANELS.map((panel) => (
          <TabsContent
            key={panel.value}
            value={panel.value}
            forceMount
            hidden={tab !== panel.value}
            className="pt-3"
          >
            {panel.form}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
