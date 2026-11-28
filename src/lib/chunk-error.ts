/** True for the error a browser raises when a lazily loaded script or style
 *  file could not be fetched, as happens with no connection for a file this
 *  device never saved. Anything else is a bug and must not be hidden. */
export function isChunkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return (
    name === "ChunkLoadError" ||
    (typeof message === "string" &&
      /Loading (CSS )?chunk \S+ failed/i.test(message))
  );
}
