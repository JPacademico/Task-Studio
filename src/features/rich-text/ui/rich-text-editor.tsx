import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code,
  Eraser,
  Film,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Type,
  Underline,
  Unlink,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { uploadImage } from '@/entities/user/api/user.api';
import { cn } from '@/shared/lib/cn';
import { sanitizeDocumentHtml } from '@/shared/lib/sanitize-html';
import { Select, Spinner, type SelectOption } from '@/shared/ui';

/**
 * The document surface.
 *
 * Built on `contentEditable` and `document.execCommand`. That API is formally
 * deprecated and every browser still ships it, because the thing that would
 * replace it — a custom model with its own selection, undo stack, IME handling
 * and paste normalisation — is a library, not a component, and this feature
 * needs a text editor rather than an editor framework. The deprecation is
 * documented rather than hidden: if it is ever withdrawn, the seam to replace
 * is `exec()` below and nothing else in the app changes.
 *
 * Two things this owns that a naive contentEditable gets wrong:
 *
 *   - The body is written into the DOM once per *document*, never per
 *     keystroke. Re-assigning `innerHTML` from a controlled value on every
 *     change is what makes home-made editors jump the caret to the start on
 *     every character typed.
 *   - Toolbar buttons never take focus (`onMouseDown` is prevented), and the
 *     ones that open an input save and restore the selection range by hand.
 *     Otherwise "select a word, click Link" applies the link to nothing.
 */

interface RichTextEditorProps {
  /**
   * Identity of the page being edited. Changing it reloads the surface;
   * changing `initialHtml` alone deliberately does not.
   */
  documentId: string;
  initialHtml: string;
  readOnly?: boolean;
  /** Fires on every edit, so the owner can track unsaved work. */
  onChange?: (html: string) => void;
  className?: string;
}

/** A toolbar control. Never takes focus, so the editor keeps its selection. */
const ToolButton = ({
  onAction,
  title,
  children,
  isActive,
  disabled,
}: {
  onAction: () => void;
  title: string;
  children: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onAction}
    className={cn(
      'grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors duration-150',
      'disabled:pointer-events-none disabled:opacity-40',
      isActive
        ? 'bg-brand text-brand-contrast'
        : 'text-content-muted hover:bg-surface-sunken hover:text-content',
    )}
  >
    {children}
  </button>
);

const Divider = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-edge" />;

/** Font sizes, in the 1–7 scale `execCommand('fontSize')` speaks. */
const SIZES: SelectOption<string>[] = [
  { value: '2', label: 'Small' },
  { value: '3', label: 'Normal' },
  { value: '5', label: 'Large' },
  { value: '6', label: 'Huge' },
];

const COLORS = ['#111827', '#b91c1c', '#c2410c', '#a16207', '#15803d', '#1d4ed8', '#7e22ce'];

type PromptKind = 'link' | 'video' | null;

export const RichTextEditor = ({
  documentId,
  initialHtml,
  readOnly = false,
  onChange,
  className,
}: RichTextEditorProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  const [prompt, setPrompt] = useState<PromptKind>(null);
  const [promptValue, setPromptValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fontSize, setFontSize] = useState('3');

  /*
   * Load the body once per document.
   *
   * `initialHtml` is deliberately not a dependency: it changes identity on
   * every save response, and re-assigning `innerHTML` mid-edit would throw the
   * caret to the top of the page. The document id is the only thing that means
   * "this is a different page now".
   */
  useEffect(() => {
    if (surfaceRef.current) surfaceRef.current.innerHTML = sanitizeDocumentHtml(initialHtml);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const emitChange = () => onChange?.(surfaceRef.current?.innerHTML ?? '');

  /** Runs a command against the editor's own selection. */
  const exec = (command: string, value?: string) => {
    surfaceRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    savedRange.current =
      selection && selection.rangeCount > 0 && surfaceRef.current?.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
  };

  const restoreSelection = () => {
    surfaceRef.current?.focus();
    const range = savedRange.current;
    if (!range) return;

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const openPrompt = (kind: PromptKind) => {
    rememberSelection();
    setPromptValue('');
    setPrompt(kind);
  };

  const commitPrompt = () => {
    const url = promptValue.trim();
    setPrompt(null);
    if (!url) return;

    // Only ever http(s). The sanitiser would drop anything else on save, so
    // refusing here is the difference between "nothing happened" and "it
    // vanished the next time you opened it".
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Links and media need a full http:// or https:// address.');
      return;
    }

    restoreSelection();

    if (prompt === 'link') {
      // With nothing selected there is no anchor text, so the URL becomes it.
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        document.execCommand('insertHTML', false, `<a href="${url}">${url}</a>`);
      } else {
        document.execCommand('createLink', false, url);
      }
    } else {
      document.execCommand(
        'insertHTML',
        false,
        `<video controls src="${url}" style="max-width: 100%"></video><p><br></p>`,
      );
    }

    emitChange();
  };

  const handleImage = async (file: File) => {
    setIsUploading(true);
    try {
      const { publicUrl, width, height } = await uploadImage(file, 'notes');
      restoreSelection();
      /*
       * Dimensions and lazy-loading travel with the tag.
       *
       * `width`/`height` let the browser reserve the right box before the bytes
       * arrive, so inserting an image no longer shoves the rest of the document
       * down when it loads — and `loading="lazy"` means a long page never
       * fetches the pictures nobody has scrolled to. Both are attributes the
       * sanitiser has to allow through, or a saved document loses them on the
       * next load.
       */
      document.execCommand(
        'insertHTML',
        false,
        `<img src="${publicUrl}" alt="" width="${width}" height="${height}" loading="lazy" /><p><br></p>`,
      );
      emitChange();
    } catch {
      toast.error('Could not upload that image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {!readOnly && (
        <div className="ui-textured flex flex-col gap-1.5 rounded-t-2xl border border-b-0 border-edge bg-surface-raised p-2">
          <div className="flex flex-wrap items-center gap-0.5">
            <ToolButton onAction={() => exec('bold')} title="Bold">
              <Bold className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('italic')} title="Italic">
              <Italic className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('underline')} title="Underline">
              <Underline className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('strikeThrough')} title="Strikethrough">
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolButton>

            <Divider />

            {/* Blocks. `formatBlock` is the one execCommand that needs the tag
                spelled with angle brackets in some engines and without in
                others; the bracket form is the one every current browser
                accepts. */}
            <ToolButton onAction={() => exec('formatBlock', '<h1>')} title="Heading 1">
              <span className="text-[11px] font-bold">H1</span>
            </ToolButton>
            <ToolButton onAction={() => exec('formatBlock', '<h2>')} title="Heading 2">
              <span className="text-[11px] font-bold">H2</span>
            </ToolButton>
            <ToolButton onAction={() => exec('formatBlock', '<h3>')} title="Heading 3">
              <span className="text-[11px] font-bold">H3</span>
            </ToolButton>
            <ToolButton onAction={() => exec('formatBlock', '<p>')} title="Body text">
              <Type className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('formatBlock', '<blockquote>')} title="Quote">
              <Quote className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('formatBlock', '<pre>')} title="Code block">
              <Code className="h-3.5 w-3.5" />
            </ToolButton>

            <Divider />

            <ToolButton onAction={() => exec('insertUnorderedList')} title="Bulleted list">
              <List className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('insertOrderedList')} title="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolButton>

            <Divider />

            <ToolButton onAction={() => exec('justifyLeft')} title="Align left">
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('justifyCenter')} title="Align centre">
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('justifyRight')} title="Align right">
              <AlignRight className="h-3.5 w-3.5" />
            </ToolButton>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/*
              The app's listbox, not a native `<select>` — same reasoning as
              the text board's: an OS-drawn dropdown is the one control on the
              page that ignores the skin entirely.

              `onMouseDownCapture` is what makes it usable here. Clicking any
              button blurs the editor and destroys the selection, so the caret
              range is saved in the capture phase — before focus moves — and
              restored just before the command runs.
            */}
            <span onMouseDownCapture={rememberSelection}>
              <Select
                className="w-28"
                value={fontSize}
                onChange={(next) => {
                  setFontSize(next);
                  restoreSelection();
                  exec('fontSize', next);
                }}
                options={SIZES}
              />
            </span>

            <span className="flex items-center gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={`Text colour ${color}`}
                  aria-label={`Text colour ${color}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => exec('foreColor', color)}
                  className="h-5 w-5 rounded-full ring-1 ring-black/15 transition-transform duration-150 hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>

            <Divider />

            <ToolButton onAction={() => openPrompt('link')} title="Insert a link">
              <Link2 className="h-3.5 w-3.5" />
            </ToolButton>
            <ToolButton onAction={() => exec('unlink')} title="Remove the link">
              <Unlink className="h-3.5 w-3.5" />
            </ToolButton>

            <ToolButton
              onAction={() => {
                rememberSelection();
                fileRef.current?.click();
              }}
              title="Insert an image"
              disabled={isUploading}
            >
              {isUploading ? <Spinner /> : <ImagePlus className="h-3.5 w-3.5" />}
            </ToolButton>

            <ToolButton onAction={() => openPrompt('video')} title="Insert a video by URL">
              <Film className="h-3.5 w-3.5" />
            </ToolButton>

            <Divider />

            <ToolButton onAction={() => exec('removeFormat')} title="Clear formatting">
              <Eraser className="h-3.5 w-3.5" />
            </ToolButton>
          </div>

          {/* The one input the toolbar needs, shared by links and video. A
              browser `prompt()` would lose the selection and look nothing like
              the rest of the app. */}
          {prompt && (
            <div className="flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/[0.06] p-1.5">
              <input
                autoFocus
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitPrompt();
                  }
                  if (event.key === 'Escape') setPrompt(null);
                }}
                placeholder={
                  prompt === 'link' ? 'https://example.com' : 'https://example.com/clip.mp4'
                }
                className="field h-7 flex-1 text-xs"
              />
              <ToolButton onAction={commitPrompt} title="Insert">
                <Check className="h-3.5 w-3.5" />
              </ToolButton>
              <ToolButton onAction={() => setPrompt(null)} title="Cancel">
                <X className="h-3.5 w-3.5" />
              </ToolButton>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImage(file);
              event.target.value = '';
            }}
          />
        </div>
      )}

      <div
        ref={surfaceRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Document body"
        onInput={emitChange}
        onBlur={emitChange}
        // Paste is the main way hostile markup gets in, so it never arrives as
        // markup: the clipboard's HTML flavour is sanitised before it lands,
        // and anything without one falls back to plain text.
        onPaste={(event) => {
          if (readOnly) return;
          const html = event.clipboardData.getData('text/html');
          const text = event.clipboardData.getData('text/plain');
          if (!html && !text) return;

          event.preventDefault();
          document.execCommand(
            'insertHTML',
            false,
            html ? sanitizeDocumentHtml(html) : text.replace(/[<>&]/g, (character) =>
              character === '<' ? '&lt;' : character === '>' ? '&gt;' : '&amp;',
            ),
          );
          emitChange();
        }}
        className={cn(
          'rich-text scrollbar-thin min-h-0 flex-1 overflow-y-auto border border-edge bg-surface-raised p-4',
          'text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
          readOnly ? 'rounded-2xl' : 'rounded-b-2xl',
        )}
      />
    </div>
  );
};
