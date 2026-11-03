import { createApiClient } from "./api-client";
import { createMockClient } from "./mock-client";
import type { ContentClient } from "./types";

export class ContentUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ContentUnavailableError";
  }
}

type Env = Record<string, string | undefined>;

// Reads the env at call time: one build runs with different CONTENT_SOURCE values.
export function getContentClient(env: Env = process.env): ContentClient {
  const source = env.CONTENT_SOURCE;
  if (source === "mock") return createMockClient();
  if (source === "api") {
    const baseUrl = env.API_BASE_URL;
    if (!baseUrl) {
      throw new Error("API_BASE_URL is required when CONTENT_SOURCE is 'api'");
    }
    return createApiClient(baseUrl);
  }
  throw new Error("CONTENT_SOURCE must be 'mock' or 'api'");
}
