"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MissingEnBadge } from "@/components/admin/form/MissingEnBadge";
import { ProblemMessage } from "@/components/admin/form/ProblemMessage";
import { Button } from "@/components/admin/ui/button";
import { adminFetch } from "@/lib/admin/api";
import { AdminApiError, GENERIC_ERROR_MESSAGE } from "@/lib/admin/errors";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { useAdminSession } from "@/lib/admin/session";
import type { ProductAdminDto } from "@/lib/admin/types";
import { withReLogin } from "@/lib/admin/with-relogin";

/** The list of products. Tap one to edit it. */
export default function ProductsPage() {
  const { requireReLogin } = useAdminSession();
  const [products, setProducts] = useState<ProductAdminDto[] | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    withReLogin(() => adminFetch<ProductAdminDto[]>("/admin/products"), requireReLogin).then(
      (value) => {
        if (!cancelled) setProducts(value);
      },
      (failure: unknown) => {
        if (!cancelled)
          setError(failure instanceof AdminApiError ? failure : new AdminApiError(0, GENERIC_ERROR_MESSAGE));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, requireReLogin]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button asChild>
        <Link href={`${ADMIN_ROUTES.products}/moi`}>Thêm sản phẩm</Link>
      </Button>
      <ProblemMessage error={error} />
      {error !== null ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setAttempt((n) => n + 1);
          }}
        >
          Thử lại
        </Button>
      ) : null}
      {products === null && error === null ? (
        <p role="status" className="text-center text-muted-foreground">
          Đang tải…
        </p>
      ) : null}
      {products !== null && products.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Chưa có sản phẩm nào.</p>
      ) : null}
      {products !== null ? (
        <ul className="flex flex-col gap-2">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`${ADMIN_ROUTES.products}/${product.id}`}
                className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-card p-3"
              >
                <span className="min-w-0 flex-1 break-words font-semibold">{product.name.vi ?? product.name.en}</span>
                {product.missingEn ? <MissingEnBadge /> : null}
                <span className="text-sm text-muted-foreground">{product.packagings.length} quy cách</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
