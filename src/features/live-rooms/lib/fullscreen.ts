/**
 * The Fullscreen API, with the two older doors Safari still needs. Desktop Safari before 16.4 has
 * only the `webkit` names, and Safari on an iPhone has no element fullscreen at all.
 */

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitVideo = HTMLVideoElement & {
  webkitSupportsFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
};

const doc = () => document as WebkitDocument;

/** Whatever is fullscreen right now, under either name. */
export const fullscreenElement = (): Element | null =>
  document.fullscreenElement ?? doc().webkitFullscreenElement ?? null;

/** The event to listen for, under the name this engine fires. */
export const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;

/**
 * Whether any route is open on this device. Asked of the document first and of the video element's
 * prototype as a last resort, so a tile never offers a button that would do nothing.
 */
export const canFullscreen = (): boolean =>
  Boolean(document.fullscreenEnabled || doc().webkitFullscreenEnabled) ||
  (typeof HTMLVideoElement !== 'undefined' &&
    'webkitEnterFullscreen' in HTMLVideoElement.prototype);

/**
 * Fills the screen with `element`, or failing that with `video`. Rejections are swallowed. The
 * browser refuses without a user gesture.
 */
export const enterFullscreen = async (element: HTMLElement, video: HTMLVideoElement | null) => {
  try {
    if (element.requestFullscreen) {
      /*
       * `navigationUI: 'hide'` asks mobile Chrome to drop its toolbar as well,
       * which is most of the point on a phone held sideways.
       */
      await element.requestFullscreen({ navigationUI: 'hide' });
      return;
    }
    const prefixed = (element as WebkitElement).webkitRequestFullscreen;
    if (prefixed) {
      await prefixed.call(element);
      return;
    }
    (video as WebkitVideo | null)?.webkitEnterFullscreen?.();
  } catch {
    /* refused: see above */
  }
};

export const exitFullscreen = async () => {
  if (!fullscreenElement()) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await doc().webkitExitFullscreen?.();
  } catch {
    /* already out, or leaving on its own */
  }
};
