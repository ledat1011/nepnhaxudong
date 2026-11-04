"use client";

import Link from "next/link";
import { create as createQr } from "qrcode";
import { useId, useMemo, useState, type FormEvent } from "react";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { adminFetch } from "@/lib/admin/api";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import type { TotpSetupResponse } from "@/lib/admin/types";
import { useSave } from "@/lib/admin/use-save";

const CODE_PATTERN = /^\d{6}$/;

/** Empty squares around the code, in modules. Scanners need this quiet zone. */
const QUIET_ZONE = 4;

/** The QR code as an SVG drawn from the code's own squares, so no HTML string is built or injected. */
function QrCodeSvg({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const matrix = createQr(text, { errorCorrectionLevel: "M" }).modules;
    let drawn = "";
    for (let row = 0; row < matrix.size; row += 1) {
      for (let col = 0; col < matrix.size; col += 1) {
        if (matrix.get(row, col)) drawn += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
    return { size: matrix.size + QUIET_ZONE * 2, path: drawn };
  }, [text]);
  return (
    <svg
      role="img"
      aria-label="Mã QR để quét bằng ứng dụng xác thực"
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-52 max-w-full self-center rounded-md border"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

type Props = {
  /** Whether two-factor login is on for the signed-in user now. */
  enabled: boolean;
  /** Called after it was switched on or off, so the account list can load again. */
  onChanged(): void;
};

/**
 * Two-factor login of the signed-in user. The secret and the QR code live only in this component's state:
 * they are dropped on Hủy, after the code was accepted and when the card unmounts.
 */
export function TwoFactorCard({ enabled: enabledNow, onChanged }: Props) {
  const codeId = useId();
  // Shows the new state at once; the parent gives the card a new key when the loaded state changes.
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? enabledNow;
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [switchingOff, setSwitchingOff] = useState(false);
  const [code, setCode] = useState("");

  const starting = useSave(() => adminFetch<TotpSetupResponse>("/admin/me/totp/setup", { method: "POST" }), {
    successMessage: null,
  });
  const enabling = useSave(
    async () => {
      await adminFetch<void>("/admin/me/totp/enable", { method: "POST", body: { code: code.trim() } });
      return true;
    },
    { successMessage: "Đã bật xác thực 2 lớp." },
  );
  const disabling = useSave(
    async () => {
      await adminFetch<void>("/admin/me/totp/disable", { method: "POST", body: { code: code.trim() } });
      return true;
    },
    { successMessage: "Đã tắt xác thực 2 lớp." },
  );

  const busy = starting.pending || enabling.pending || disabling.pending;
  const codeValid = CODE_PATTERN.test(code.trim());

  async function start() {
    const result = await starting.save();
    if (result !== undefined) setSetup(result);
  }

  function cancel() {
    setSetup(null);
    setSwitchingOff(false);
    setCode("");
    enabling.reset();
    disabling.reset();
  }

  async function finish(done: boolean | undefined, nowEnabled: boolean) {
    if (!done) return;
    setSetup(null);
    setSwitchingOff(false);
    setCode("");
    setOverride(nowEnabled);
    onChanged();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!codeValid || busy) return;
    if (setup !== null) void enabling.save().then((done) => finish(done, true));
    else void disabling.save().then((done) => finish(done, false));
  }

  const asking = setup !== null || switchingOff;

  return (
    <section className="flex flex-col gap-4 rounded-md border bg-card p-4" aria-labelledby={`${codeId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${codeId}-title`} className="text-lg font-semibold">
          Xác thực 2 lớp
        </h2>
        <span className="text-sm font-semibold">{enabled ? "Đang bật" : "Chưa bật"}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Ngoài mật khẩu, mỗi lần đăng nhập cần thêm mã 6 số từ ứng dụng xác thực trên điện thoại.
      </p>

      {setup !== null ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Quét mã QR bằng ứng dụng xác thực, hoặc gõ mã bí mật dưới đây vào ứng dụng.</p>
          <QrCodeSvg text={setup.otpauthUri} />
          <code className="block select-all break-all rounded-md border bg-muted p-3 font-mono text-base">
            {setup.secret}
          </code>
        </div>
      ) : null}

      {asking ? (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={codeId}>Mã 6 số</Label>
            <Input
              id={codeId}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              disabled={busy}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <ProblemMessage error={enabling.error ?? disabling.error} />
          <Button type="submit" disabled={!codeValid || busy}>
            {busy ? "Đang xử lý…" : setup !== null ? "Xác nhận và bật" : "Xác nhận và tắt"}
          </Button>
          <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
            Hủy
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <ProblemMessage error={starting.error} />
          {enabled ? (
            <Button type="button" variant="outline" onClick={() => setSwitchingOff(true)}>
              Tắt xác thực 2 lớp
            </Button>
          ) : (
            <Button type="button" onClick={() => void start()} disabled={busy}>
              {starting.pending ? "Đang tạo mã…" : "Bật xác thực 2 lớp"}
            </Button>
          )}
        </div>
      )}

      <Button asChild variant="outline">
        <Link href={ADMIN_ROUTES.changePassword}>Đổi mật khẩu</Link>
      </Button>
    </section>
  );
}
