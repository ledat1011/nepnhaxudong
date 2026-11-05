export const PAYLOAD_TOO_LARGE_MESSAGE = "Ảnh quá lớn. Tối đa 15 MB.";
export const NETWORK_ERROR_MESSAGE = "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.";
export const GENERIC_ERROR_MESSAGE = "Đã có lỗi xảy ra. Hãy thử lại sau.";

/** Problem codes of the API (see `ProblemCodes` in the API). */
export const SESSION_EXPIRED_CODE = "session-expired";
export const CSRF_INVALID_CODE = "csrf-invalid";

/** An API call that failed. `detail` is the text the UI shows; `status` 0 means no response. */
export class AdminApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly code: string | null;
  readonly title: string | null;

  constructor(status: number, detail: string, code: string | null = null, title: string | null = null) {
    super(detail);
    this.name = "AdminApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
    this.title = title;
  }
}

/**
 * True only for a 401 the API marked `session-expired`. A 401 for a wrong password or
 * authentication code has another code (or none), so it must not open the re-login dialog.
 */
export function isSessionExpired(error: unknown): boolean {
  return error instanceof AdminApiError && error.status === 401 && error.code === SESSION_EXPIRED_CODE;
}

export function networkError(): AdminApiError {
  return new AdminApiError(0, NETWORK_ERROR_MESSAGE);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Builds the error of a failed response. Reads the body, so call it once per response. */
export async function errorFromResponse(response: Response): Promise<AdminApiError> {
  const { status } = response;
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    // An unreadable body is handled like a body that is not JSON.
  }

  // The proxy answers 413 with plain text, not with problem+json.
  if (status === 413) return new AdminApiError(status, PAYLOAD_TOO_LARGE_MESSAGE);

  try {
    const body: unknown = JSON.parse(raw);
    if (body !== null && typeof body === "object") {
      const problem = body as Record<string, unknown>;
      return new AdminApiError(
        status,
        text(problem.detail) ?? GENERIC_ERROR_MESSAGE,
        text(problem.code),
        text(problem.title),
      );
    }
  } catch {
    // Not JSON.
  }
  return new AdminApiError(status, GENERIC_ERROR_MESSAGE);
}
