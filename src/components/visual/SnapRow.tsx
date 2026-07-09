import type { ReactNode } from 'react';

type SnapRowProps = {
  children: ReactNode;
  /** Tailwind grid classes used at sm+ (carousel only applies below sm). */
  gridClassName?: string;
  /** Per-item min width on mobile (snap track). */
  itemClassName?: string;
  className?: string;
};

/**
 * SnapRow — responsive row container.
 *
 * On phones (<sm) it renders a horizontal scroll-snap carousel with a subtle
 * edge fade (via the `.snap-row` mask in globals.css), turning tall card stacks
 * into one-thumb swipeable shelves. At sm+ it becomes the normal responsive
 * grid, so desktop is unchanged. Pure CSS — no scroll listeners, no layout
 * shift. Wrap each child in a SnapRow.Item.
 */
export default function SnapRow({
  children,
  gridClassName = 'sm:grid sm:grid-cols-2 lg:grid-cols-3',
  className = '',
}: SnapRowProps) {
  return (
    <div
      className={`snap-row -mx-4 px-4 sm:mx-0 sm:snap-none sm:overflow-visible sm:px-0 sm:[mask-image:none] ${gridClassName} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type ItemProps = {
  children: ReactNode;
  /** Mobile track item width; reset to auto at sm+. */
  widthClassName?: string;
  className?: string;
};

function Item({
  children,
  widthClassName = 'w-[78vw] max-w-[300px]',
  className = '',
}: ItemProps) {
  return (
    <div
      className={`snap-item ${widthClassName} sm:w-auto sm:max-w-none ${className}`.trim()}
    >
      {children}
    </div>
  );
}

SnapRow.Item = Item;
