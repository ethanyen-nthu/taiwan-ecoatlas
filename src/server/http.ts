import "server-only";
const networkCodes = new Set([
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
]);
export class UpstreamRequestError extends Error {
  constructor(
    readonly category: "http-status" | "invalid-json" | "network" | "timeout",
    readonly status: number | null = null,
    readonly networkCode: string | null = null,
  ) {
    super("External data request failed");
  }
}
export async function fetchJson(
  url: string,
  init: RequestInit = {},
  attempts = 3,
): Promise<unknown> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new UpstreamRequestError("http-status", response.status);
      }
      try {
        return await response.json();
      } catch {
        throw new UpstreamRequestError("invalid-json", response.status);
      }
    } catch (error) {
      const cause = error instanceof Error ? error.cause : null;
      const code =
        cause && typeof cause === "object" && "code" in cause
          ? cause.code
          : null;
      const failure =
        error instanceof UpstreamRequestError
          ? error
          : new UpstreamRequestError(
              error instanceof Error && error.name === "TimeoutError"
                ? "timeout"
                : "network",
              null,
              typeof code === "string" && networkCodes.has(code) ? code : null,
            );
      if (
        (failure.category === "http-status" &&
          failure.status! < 500 &&
          failure.status !== 429) ||
        attempt === attempts - 1
      )
        throw failure;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw new Error("External data request failed");
}
