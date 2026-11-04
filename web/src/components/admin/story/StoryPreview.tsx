"use client";

import { useState } from "react";
import { StoryBody } from "@/components/story/StoryBody";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/admin/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin/ui/tabs";
import type { StoryAdminDto } from "@/lib/admin/types";

type Props = {
  /** The story as the API returned it after the last save: its `bodyHtml` is already cleaned. */
  story: StoryAdminDto;
  open: boolean;
  onOpenChange(open: boolean): void;
};

type Lang = "vi" | "en";

function Page({ story, lang }: { story: StoryAdminDto; lang: Lang }) {
  const title = story.title[lang];
  if (title === null) {
    return <p className="py-6 text-center text-muted-foreground">Chưa có bản tiếng Anh.</p>;
  }
  const excerpt = story.excerpt[lang];
  const body = story.bodyHtml[lang];
  return (
    <article className="flex min-w-0 flex-col gap-3">
      <h2 className="text-2xl font-bold [overflow-wrap:anywhere]">{title}</h2>
      {excerpt !== null ? <p className="text-muted-foreground [overflow-wrap:anywhere]">{excerpt}</p> : null}
      {body !== null && body !== "" ? (
        // The same component as the public page, with the same cleaned html.
        <StoryBody html={body} />
      ) : (
        <p className="text-muted-foreground">Chưa có nội dung.</p>
      )}
    </article>
  );
}

/** Shows the saved story the way the public page will show it, in a box over the form. */
export function StoryPreview({ story, open, onOpenChange }: Props) {
  const [lang, setLang] = useState<Lang>("vi");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Xem trước</DialogTitle>
          <DialogDescription>Bản đã lưu, như khách sẽ thấy trên website.</DialogDescription>
        </DialogHeader>
        <Tabs value={lang} onValueChange={(next) => setLang(next as Lang)}>
          <TabsList className="w-full">
            <TabsTrigger value="vi">Tiếng Việt</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>
          <TabsContent value="vi" className="pt-3">
            <Page story={story} lang="vi" />
          </TabsContent>
          <TabsContent value="en" className="pt-3">
            <Page story={story} lang="en" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
