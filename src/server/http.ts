import "server-only";
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
        if (response.status < 500 && response.status !== 429)
          throw new NonRetryableError();
        throw new Error("Upstream unavailable");
      }
      return await response.json();
    } catch (error) {
      if (error instanceof NonRetryableError || attempt === attempts - 1)
        throw new Error("External data request failed");
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw new Error("External data request failed");
}
class NonRetryableError extends Error {}
