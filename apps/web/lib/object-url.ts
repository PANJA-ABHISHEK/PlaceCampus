// One object URL per Blob. Blobs are cached by React Query, so this stays
// bounded, and it avoids StrictMode revoking a URL that is still in use.
const objectUrls = new WeakMap<Blob, string>();

export function getObjectUrl(blob: Blob | undefined) {
  if (!blob) return null;
  let url = objectUrls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    objectUrls.set(blob, url);
  }
  return url;
}
