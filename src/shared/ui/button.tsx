import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/lib/cn';
import { LavaSurface } from './lava-surface';
import { SkinLoader } from './skin-loader';

type Variant = 'primary' | 'lava' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-contrast hover:brightness-110 active:brightness-95 shadow-sm shadow-brand/30',
  /*
   * The same button, with a moving fill instead of a flat one.
   *
   * ## Why it is a variant and not a component any more
   *
   * It was a component — `ShaderButton`, which mounted a three.js scene behind
   * a `lazy` import and could only ever exist twice on a page, because a
   * browser hands out a finite number of WebGL contexts. That made it a thing
   * you could put on two controls in the entire product and nowhere else,
   * which is why the landing page's four primary buttons could not have it.
   *
   * `.ui-lava` is three gradients and two keyframes (see `index.css`). It
   * costs no JavaScript, no network request and no GPU context, so there is
   * nothing left to ration and no reason for the cost to be visible at the
   * call site. A variant is what it always should have been.
   *
   * ## Why it is not the default
   *
   * A button that draws attention to itself is only useful if almost nothing
   * else does. This is for the one action a screen exists to support — "New
   * project", "New task", "Get started" — and every other primary button in
   * the product is a *confirmation* of something already decided. A shimmering
   * Save button is noise attached to a decision that has already been made.
   *
   * No `bg-*` or `shadow-*` utility, deliberately. `.ui-lava` sets both in
   * `@layer components` and a utility would outrank it — a background would
   * paint a flat colour over the lamp, and a shadow would drop the inset
   * hairline that is the only thing giving the tube a visible edge against a
   * page of a similar darkness.
   *
   * The class on its own is a *still* lamp: the tube, the edge and the hover
   * fill. The wax is seven elements, so `Button` now renders `LavaSurface`
   * itself whenever this variant is selected — see below. A class cannot put
   * children inside an anchor, which is why `LavaLink` still composes the two
   * by hand for the landing page's links.
   */
  lava: 'ui-lava',
  /*
   * `ui-btn--secondary` is a skin hook, not a look — nothing in this file
   * reads it. The studio palette keeps `--edge` within a couple of steps of
   * `--surface-sunken`, so the `bg-edge/60` hover below composites to almost
   * exactly the resting colour and the button appears to have no hover at all.
   * The marker lets that one skin restate it; see the `[data-skin='studio']`
   * rule in `index.css`.
   */
  secondary: 'ui-btn--secondary bg-surface-sunken text-content hover:bg-edge/60',
  ghost: 'text-content-muted hover:bg-surface-sunken hover:text-content',
  outline: 'border border-edge text-content hover:border-brand hover:text-brand',
  danger: 'bg-danger text-white hover:brightness-110',
};

/**
 * The three text sizes, and why none of them sets a fixed height any more.
 *
 * ## What a fixed height actually did
 *
 * `h-10` is not "forty pixels tall"; it is "forty pixels tall *whatever is
 * inside it*". A label that needed two lines got forty pixels anyway, and
 * since there was no vertical padding either, the two lines filled the box
 * edge to edge — the text touched the border top and bottom and, on the skins
 * that uppercase and track out their labels, spilled past it.
 *
 * It is not a hypothetical. "Voltar para a página inicial" is the Portuguese
 * for a four-word English label; put it beside a second button in a 420px card
 * and it wraps. The same happens to any label in any language on a narrow
 * phone, and it happened on every skin at once because the height was set here
 * rather than by the theme.
 *
 * ## What replaces it
 *
 * A *minimum* height and real vertical padding. The minimum keeps every
 * existing button exactly the size it was — one line of 14px text plus 16px of
 * padding is 36px, which is under the 40px floor, so `min-h` wins and nothing
 * on any of the two hundred call sites moves by a pixel. The padding only
 * becomes visible when a label wraps, which is precisely when it is needed:
 * the button grows to fit its own text and keeps the same breathing room above
 * and below that it has at the sides.
 *
 * `icon` keeps both dimensions fixed. It holds a 16px glyph and nothing that
 * can wrap, and it has to stay square.
 */
const SIZES: Record<Size, string> = {
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-6 py-2.5 text-base',
  icon: 'h-9 w-9',
};

/**
 * The gap lives on the label row, not on the button.
 *
 * The label is one element now (see below), so a `gap` on the button itself
 * would have nothing to space. It is the icon and the word *inside* the label
 * that need separating.
 */
const GAPS: Record<Size, string> = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2.5',
  icon: 'gap-1.5',
};

/**
 * Everything that makes a button look like one, without being one.
 *
 * ## Why this is exported
 *
 * Because some buttons have to be links. A landing page's primary call to
 * action navigates, and rendering that as a `<button onClick={navigate}>` costs
 * a real anchor: no middle-click, no open-in-new-tab, no address on hover,
 * nothing for a crawler to follow. Those are exactly the affordances a page
 * aimed at people who have not signed up yet should not be throwing away.
 *
 * The alternative was an `asChild` prop, which needs a `Slot` implementation
 * and turns one component into two code paths — for a handful of call sites
 * that only ever want the *appearance*. Handing out the class list is the
 * smaller thing, and it keeps `Button` a button.
 *
 * A `<Link>` wearing these gets the skin hooks and the variants; what it does
 * not get is `isLoading`, and it should not — a navigation has nothing to wait
 * for.
 */
export const buttonClasses = ({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}): string =>
  cn(
    // `ui-btn` is the skin hook: weight, tracking, casing, material and press
    // travel all come from the active theme rather than from here.
    // Deliberately no `font-medium` — a utility would outrank the skin's
    // `--btn-weight` and every theme would end up with the same 500.
    'ui-btn relative inline-flex select-none items-center justify-center rounded-xl',
    // 150ms is the sweet spot: perceptible but never in the way.
    'transition-[transform,background-color,color,box-shadow] duration-150 ease-studio',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {/*
        The wax, for the one variant that has a tube to put it in.

        Rendered here rather than left to the call site, which is what it used
        to be. The old arrangement meant `variant="lava"` produced a *still*
        lamp and nothing said so: the button looked subtly wrong, in a way that
        reads as a broken gradient rather than as a missing child, and the only
        way to find out was to know that `LavaSurface` existed. Two of the three
        call sites that wanted motion got it; the variant was the trap.

        `LavaSurface` gates its own animation on visibility, tab focus, reduced
        motion and device capability — see `useCanvasBudget` — so an off-screen
        lamp costs what a flat button costs. There is nothing to ration at the
        call site and therefore no reason to make it a decision there.
      */}
      {variant === 'lava' && <LavaSurface />}

      {/*
        Waiting replaces the label; it does not push it aside.

        The spinner used to be *prepended* to the children, so a button grew by
        the width of a loader the moment it was pressed — the row it sat in
        reflowed, and on a footer of two buttons the other one jumped sideways.
        A control that changes size under the pointer reads as a glitch, and it
        is one: the button says the same thing before and after, so its box
        should not move.

        So the label keeps its space and only stops being painted
        (`invisible` is `visibility: hidden` — laid out, not drawn), and the
        loader is centred over it in the space the label reserved. The width is
        whatever the longest of the two happens to be, which is nearly always
        the label, and it does not change.

        Pending state is the skin's too — a generic spinner inside a brass
        plate or an arcade tile was the one un-themed pixel left on screen.
      */}
      {isLoading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <SkinLoader size="sm" tone="inherit" />
        </span>
      )}

      {/* `relative` so the label stacks above the lamp rather than under it —
          the surface is absolutely positioned inside the same button. */}
      <span
        className={cn(
          'relative inline-flex items-center justify-center',
          GAPS[size],
          isLoading && 'invisible',
        )}
      >
        {children}
      </span>
    </button>
  ),
);

Button.displayName = 'Button';
