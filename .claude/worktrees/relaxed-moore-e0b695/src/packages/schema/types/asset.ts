/**
 * A binary or external resource (image, video, font, lottie...) referenced
 * by widgets via `assetId`. The actual bytes may live in localStorage,
 * IndexedDB, or a remote CDN — abstracted via PersistenceAdapter.
 */
export interface Asset {
  id: string;
  name: string;
  /**
   * Built-in: 'image' | 'video' | 'svg' | 'font' | 'lottie'.
   * Open string to allow plugin-defined types.
   */
  type: string;

  /** dataURL, blob URL, or remote URL. */
  url: string;

  width?: number;
  height?: number;
  /** Bytes. */
  size?: number;
  /** ms (audio/video). */
  duration?: number;

  extensions: Record<string, unknown>;
}
