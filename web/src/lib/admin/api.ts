import { CSRF_HEADER, getCsrfToken, resetCsrfToken } from "./csrf";
import { AdminApiError, CSRF_INVALID_CODE, GENERIC_ERROR_MESSAGE, errorFromResponse, networkError } from "./errors";

type Method = "GET" | "POST" | "PUT" | "DELETE";

type AdminFetchInit = {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
};

const API_PREFIX = "/api";

async function send(path: string, method: Method, body: BodyInit | undefined, jsonBody: boolean, signal?: AbortSignal) {
  const headers = new Headers({ Accept: "application/json" });
  // For a FormData body the browser sets Content-Type itself, with the multipart boundary.
  if (jsonBody) headers.set("Content-Type", "application/json");
  if (method !== "GET") headers.set(CSRF_HEADER, await getCsrfToken());
  return fetch(`${API_PREFIX}${path}`, { method, headers, body, signal, credentials: "same-origin" });
}

async function request<T>(
  path: string,
  method: Method,
  body: BodyInit | undefined,
  jsonBody: boolean,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await send(path, method, body, jsonBody, signal);
    if (method !== "GET" && response.status === 403) {
      const error = await errorFromResponse(response.clone());
      if (error.code === CSRF_INVALID_CODE) {
        // The token is old (sign-in or sign-out in another tab): get a new one and send once more.
        resetCsrfToken();
        response = await send(path, method, body, jsonBody, signal);
      }
    }
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    // An abort is the caller's own doing, not a network failure.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw networkError();
  }

  if (!response.ok) throw await errorFromResponse(response);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // A 2xx body that is not JSON, or one that cannot be read, is still an API failure for the caller.
    throw new AdminApiError(response.status, GENERIC_ERROR_MESSAGE);
  }
}

/** Calls `/api{path}` with JSON. `path` starts with "/", for example "/admin/products". */
export function adminFetch<T>(path: string, init: AdminFetchInit = {}): Promise<T> {
  const { method = "GET", body, signal } = init;
  const hasBody = body !== undefined;
  return request<T>(path, method, hasBody ? JSON.stringify(body) : undefined, hasBody, signal);
}

/** Sends a multipart form with POST. Do not set Content-Type: the browser adds the boundary. */
export function adminUpload<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, "POST", form, false);
}
