'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

const SIZES = { sm: 'w-[min(440px,calc(100vw-2rem))]', md: 'w-[min(600px,calc(100vw-2rem))]', lg: 'w-[min(760px,calc(100vw-2rem))]' } as const;

/**
 * Modal dialog on the native <dialog> element (focus trap, Escape, top layer). The parent
 * owns `open`; Escape, the close button and a click on the backdrop call `onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  testId,
  headingId,
  closeLabel = 'Schließen',
  closeTestId,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  testId?: string;
  headingId?: string;
  closeLabel?: string;
  closeTestId?: string;
  /** Called after the dialog was shown (e.g. to load data). */
  onOpened?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const fallbackId = useId();
  const titleId = headingId ?? `${fallbackId}-title`;
  const openedRef = useRef(onOpened);
  useEffect(() => {
    openedRef.current = onOpened;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      openedRef.current?.();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-testid={testId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onMouseDown={(e) => {
        // Only a press that starts on the backdrop (the dialog element itself) closes.
        if (e.target === e.currentTarget) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] rounded-xl border border-line-strong bg-surface p-0 text-fg shadow-(--shadow-dialog) ${SIZES[size]}`}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description ? <div className="mt-1 text-[13px] leading-snug text-fg-muted">{description}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            data-testid={closeTestId}
            className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-hover hover:text-fg"
          >
            <Icon name="x" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
