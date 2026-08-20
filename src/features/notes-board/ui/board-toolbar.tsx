import { useRef } from 'react';
import {
  BoxSelect,
  Eraser,
  ImagePlus,
  Link2,
  MousePointer2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { BOARD_INK_COLORS } from '@/shared/config/constants';
import { cn } from '@/shared/lib/cn';
import { Button, ColorPicker, ExpandToggle, PostItGlyph, Spinner, Stepper } from '@/shared/ui';
import { useT, type TranslationKey } from '@/shared/i18n';

export type BoardTool = 'select' | 'connect' | 'draw';

interface BoardToolbarProps {
  tool: BoardTool;
  onToolChange: (tool: BoardTool) => void;

  inkColor: string;
  onInkColorChange: (color: string) => void;
  inkWidth: number;
  onInkWidthChange: (width: number) => void;

  /** Plain clicks add to the selection while this is on. */
  isPickingMultiple: boolean;
  onPickingMultipleChange: (value: boolean) => void;

  onAddNote: () => void;
  onAddImage: (file: File) => void;
  isUploading: boolean;
  isAddingNote: boolean;

  onClearInk?: () => void;
  onClearAll: () => void;

  /** The whiteboard has no ink layer of its own — it has the canvas below it. */
  showInkTools?: boolean;

  /** Full-screen stage. Omitted where the surface cannot be expanded. */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const TOOLS: {
  value: BoardTool;
  label: TranslationKey;
  icon: typeof MousePointer2;
  hint: TranslationKey;
}[] = [
  { value: 'select', label: 'board.arrange', icon: MousePointer2, hint: 'board.arrangeNotesHint' },
  { value: 'connect', label: 'board.connect', icon: Link2, hint: 'board.connectNotesHint' },
  { value: 'draw', label: 'board.draw', icon: Pencil, hint: 'board.drawHint' },
];

/** Everything the board can do, in one strip above the paper. */
export const BoardToolbar = ({
  tool,
  onToolChange,
  inkColor,
  onInkColorChange,
  inkWidth,
  onInkWidthChange,
  isPickingMultiple,
  onPickingMultipleChange,
  onAddNote,
  onAddImage,
  isUploading,
  isAddingNote,
  onClearInk,
  onClearAll,
  showInkTools = true,
  isExpanded = false,
  onToggleExpand,
}: BoardToolbarProps) => {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const tools = showInkTools ? TOOLS : TOOLS.filter((entry) => entry.value !== 'draw');

  return (
    <div className="ui-textured flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-surface-raised p-2 sm:gap-3 sm:p-3">
      <div className="ui-segment inline-flex items-center gap-1 rounded-xl border border-edge bg-surface-sunken p-1">
        {tools.map(({ value, label, icon: Icon, hint }) => (
          <button
            key={value}
            type="button"
            title={t(hint)}
            aria-pressed={tool === value}
            onClick={() => onToolChange(value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
              tool === value
                ? 'bg-brand text-brand-contrast shadow-sm'
                : 'text-content-muted hover:text-content',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(label)}</span>
          </button>
        ))}
      </div>

      <span className="hidden h-6 w-px bg-edge sm:block" />

      {/* The paper itself is the button. "+ Note" made the primary action of a
          Post-it board read like a database row. */}
      <Button
        size="sm"
        onClick={onAddNote}
        isLoading={isAddingNote}
        title={t('board.addPostIt')}
        aria-label={t('board.addPostIt')}
        className="px-2.5"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.8} />
        <PostItGlyph className="h-[18px] w-[18px]" />
      </Button>

      <Button
        size="sm"
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
        title={t('board.pinImage')}
      >
        {isUploading ? (
          <Spinner />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">{t('board.image')}</span>
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onAddImage(file);
          // Reset so picking the same file twice still fires a change.
          event.target.value = '';
        }}
      />

      {/* Multi-select as a visible mode rather than a modifier key nobody can
          see. Ctrl+click and lasso still work — this is the discoverable path. */}
      {tool === 'select' && (
        <button
          type="button"
          onClick={() => onPickingMultipleChange(!isPickingMultiple)}
          aria-pressed={isPickingMultiple}
          title={t('board.pickSeveralTitle')}
          className={cn(
            'ui-filter inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors',
            isPickingMultiple
              ? 'border-brand bg-brand/15 text-brand'
              : 'border-edge text-content-muted hover:border-brand/40 hover:text-content',
          )}
        >
          <BoxSelect className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('board.pickSeveral')}</span>
        </button>
      )}

      {/* Ink controls only make sense while the pen is out. */}
      {showInkTools && tool === 'draw' && (
        <>
          <span className="hidden h-6 w-px bg-edge sm:block" />
          <ColorPicker value={inkColor} onChange={onInkColorChange} options={BOARD_INK_COLORS} />
          <Stepper
            value={inkWidth}
            onChange={onInkWidthChange}
            min={1}
            max={18}
            label={t('board.eraserNib')}
            suffix="px"
          />
          {onClearInk && (
            <Button size="sm" variant="ghost" onClick={onClearInk}>
              <Eraser className="h-3.5 w-3.5" />
              {t('notes.eraseInk')}
            </Button>
          )}
        </>
      )}

      <span className="ml-auto flex items-center gap-2">
        {onToggleExpand && (
          <ExpandToggle
            isExpanded={isExpanded}
            onToggle={onToggleExpand}
            label={t(isExpanded ? 'board.shrink' : 'board.expand')}
          />
        )}

        <Button size="sm" variant="ghost" onClick={onClearAll} className="text-danger">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('notes.clearAll')}</span>
        </Button>
      </span>
    </div>
  );
};
