import { useEffect, useRef } from 'react';

import type { RosterMember } from '@/entities/project/model/types';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui';

interface MentionPickerProps {
  members: RosterMember[];
  /** Which row Enter would take. Owned by the composer, which handles the keys. */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPick: (member: RosterMember) => void;
}

/**
 * The list of people an `@` could be referring to. The chat window is anchored to the bottom-right
 * of the screen on a desktop and is a bottom sheet on a phone, so there is no "below".
 */
export const MentionPicker = ({
  members,
  activeIndex,
  onActiveIndexChange,
  onPick,
}: MentionPickerProps) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active row in view when the arrows walk past the edge of the box. `block: 'nearest'`
  // rather than `center`: the list is six rows tall at most.
  useEffect(() => {
    const row = listRef.current?.children[activeIndex];
    row?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (members.length === 0) return null;

  return (
    <div
      /* `bottom-full` puts it directly on top of the composer, and the negative inset on the border
         keeps the two reading as one control rather than as a popover that happens to be nearby. */
      className="absolute inset-x-2 bottom-full z-10 mb-1.5 overflow-hidden rounded-xl border border-edge bg-surface-raised shadow-panel"
      // The composer keeps focus and keeps handling keys; this is a surface to look at and click,
      // and announcing it as a listbox it cannot own would be a lie to a screen reader.
      role="presentation"
    >
      <div ref={listRef} className="scrollbar-thin max-h-44 overflow-y-auto py-1">
        {members.map((member, index) => (
          <button
            key={member.id}
            type="button"
            /* `onMouseDown` with the default prevented, not `onClick`. A click on this would blur
               the text field first, and a blurred field is a lost caret. */
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(member);
            }}
            onMouseEnter={() => onActiveIndexChange(index)}
            className={cn(
              'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
              index === activeIndex ? 'bg-brand/15' : 'hover:bg-surface-sunken',
            )}
          >
            <Avatar name={member.displayName} src={member.avatarUrl} size="xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-content">
                {member.displayName}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
