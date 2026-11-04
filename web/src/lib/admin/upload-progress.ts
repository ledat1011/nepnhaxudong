import { CSRF_HEADER, getCsrfToken, resetCsrfToken } from "./csrf";
import { AdminApiError, CSRF_INVALID_CODE, GENERIC_ERROR_MESSAGE, errorFromResponse, networkError } from "./errors";

type Options = {
  /** Called with a number from 0 to 1 while the file goes up. */
  onProgress?(fraction: number): void;
  signal?: AbortSignal;
};

type Answer = { status: number; text: string };

function abortError(): DOMException {
  return new DOMException("The upload was stopped.", "AbortError");
}

function sendOnce(url: string, form: FormData, token: string, options: Options): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const { signal, onProgress } = options;
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader(CSRF_HEADER, token);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    const stop = () => xhr.abort();
    signal?.addEventListener("abort", stop, { once: true });
    const done = () => signal?.removeEventListener("abort", stop);
    xhr.onload = () => {
      done();
      resolve({ status: xhr.status, text: xhr.responseText });
    };
    xhr.onerror = () => {
      done();
      reject(networkError());
    };
    xhr.onabort = () => {
      done();
      reject(abortError());
    };
    xhr.send(form);
  });
}

function asResponse(answer: Answer): Response {
  return new Response(answer.text, { status: answer.status });
}

/**
 * Like `adminUpload` (POST of a multipart form to `/api{path}`), but with XMLHttpRequest, because `fetch` cannot
 * tell how much of the body has been sent. The same rules as `adminFetch`: the CSRF header, one more try with a
 * new token after "csrf-invalid", and the API's problem detail (or the 413 size message) as the error.
 */
export async function uploadWithProgress<T>(path: string, form: FormData, options: Options = {}): Promise<T> {
  const url = `/api${path}`;
  let answer = await sendOnce(url, form, await getCsrfToken(), options);
  if (answer.status === 403) {
    const error = await errorFromResponse(asResponse(answer));
    if (error.code === CSRF_INVALID_CODE) {
      // The token is old (sign-in or sign-out in another tab): get a new one and send once more.
      resetCsrfToken();
      answer = await sendOnce(url, form, await getCsrfToken(), options);
    }
  }
  if (answer.status === 0) throw networkError();
  if (answer.status < 200 || answer.status >= 300) throw await errorFromResponse(asResponse(answer));
  try {
    return JSON.parse(answer.text) as T;
  } catch {
    throw new AdminApiError(answer.status, GENERIC_ERROR_MESSAGE);
  }
}
