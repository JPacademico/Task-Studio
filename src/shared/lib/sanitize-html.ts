/**
 * What a project document is allowed to contain. The text board is a `contentEditable` surface: its
 * content is HTML, it is loaded back by assigning `innerHTML`.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN',
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'SUB', 'SUP',
  'H1', 'H2', 'H3', 'H4',
  'UL', 'OL', 'LI',
  'BLOCKQUOTE', 'PRE', 'CODE', 'HR',
  'A', 'IMG', 'VIDEO',
  // `document.execCommand` still emits these for colour and size.
  'FONT',
]);

/** Dropped with everything inside them, rather than unwrapped. */
const DISCARDED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'OBJECT', 'EMBED', 'IFRAME',
  'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'NOSCRIPT', 'TEMPLATE', 'BASE',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  // `loading` and `decoding` are enumerated attributes with a fixed, inert set of values — they
  // cannot carry a URL or a handler.
  IMG: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  VIDEO: new Set(['src', 'controls', 'width', 'height', 'poster', 'preload']),
  FONT: new Set(['color', 'face', 'size']),
};

/** Allowed on every element, on top of the per-tag list above. */
const GLOBAL_ATTRIBUTES = new Set(['style']);

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
  'list-style-type',
]);

/**
 * A style value we are willing to copy through. Deliberately strict: `url(`, `expression(` and
 * anything with a bracket or a semicolon in it is how a style attribute becomes a fetch or worse.
 */
const SAFE_STYLE_VALUE = /^[#\w\s.,%()'"-]{1,120}$/;
const UNSAFE_STYLE_VALUE = /url\s*\(|expression\s*\(|javascript:|@import/i;

/** `http(s)`, `mailto`, and — for images only — `data:image/*`. */
const isSafeUrl = (value: string, allowData: boolean): boolean => {
  const url = value.trim();
  // Protocol-relative and relative URLs are fine; they cannot introduce a scheme.
  if (/^[/#?]/.test(url)) return true;

  if (allowData && /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,/i.test(url)) {
    // SVG can carry script, so it is the one image type not worth the paste.
    return !/^data:image\/svg/i.test(url);
  }

  return /^(https?:|mailto:)/i.test(url);
};

const sanitizeStyle = (declaration: string): string =>
  declaration
    .split(';')
    .map((part) => {
      const index = part.indexOf(':');
      if (index < 1) return null;

      const property = part.slice(0, index).trim().toLowerCase();
      const value = part.slice(index + 1).trim();

      if (!ALLOWED_STYLE_PROPERTIES.has(property)) return null;
      if (!SAFE_STYLE_VALUE.test(value) || UNSAFE_STYLE_VALUE.test(value)) return null;

      return `${property}: ${value}`;
    })
    .filter((part): part is string => part !== null)
    .join('; ');

const clean = (element: Element): void => {
  // Depth-first over a snapshot: the walk rewrites the tree as it goes, and a
  // live child list would skip nodes as siblings are unwrapped.
  for (const child of [...element.children]) clean(child);

  const tag = element.tagName.toUpperCase();

  if (DISCARDED_TAGS.has(tag)) {
    element.remove();
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown but harmless (a stray <section> from a paste): keep the words,
    // drop the box.
    element.replaceWith(...element.childNodes);
    return;
  }

  const allowed = ALLOWED_ATTRIBUTES[tag];

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();

    if (name.startsWith('on') || !(allowed?.has(name) || GLOBAL_ATTRIBUTES.has(name))) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name === 'style') {
      const safe = sanitizeStyle(attribute.value);
      if (safe) element.setAttribute('style', safe);
      else element.removeAttribute('style');
      continue;
    }

    if (name === 'href' || name === 'src' || name === 'poster') {
      if (!isSafeUrl(attribute.value, tag === 'IMG')) element.removeAttribute(attribute.name);
    }
  }

  // Every link leaves the app, and none of them get a handle on the opener.
  if (tag === 'A' && element.hasAttribute('href')) {
    element.setAttribute('target', '_blank');
    element.setAttribute('rel', 'noopener noreferrer');
  }
};

export const sanitizeDocumentHtml = (html: string): string => {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  // Clean the *children*, never the body itself. `clean` unwraps any element outside the
  // allow-list, and `<body>` is emphatically outside it — so handing it the root removed the root.
  for (const child of [...parsed.body.children]) clean(child);

  return parsed.body.innerHTML;
};

/** The words alone — for a download filename, a preview, an empty check. */
export const documentPlainText = (html: string): string => {
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim();
};
