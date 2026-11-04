type Props = { title: string; userName: string };

export function AdminHeader({ title, userName }: Props) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b bg-card px-4">
      {/* The screen name is the one level-1 heading of every private admin page; sections below use h2. */}
      <h1 className="truncate text-lg font-bold">{title}</h1>
      <p className="max-w-[50%] truncate text-sm text-muted-foreground">{userName}</p>
    </header>
  );
}
