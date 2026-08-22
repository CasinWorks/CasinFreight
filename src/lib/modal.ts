import type { MouseEvent } from 'react';

/** Close a modal only when the dimmed overlay is clicked, not the dialog itself. */
export function closeIfBackdrop(onClose?: () => void, disabled = false) {
  return (event: MouseEvent<HTMLElement>) => {
    if (disabled || !onClose) return;
    if (event.target === event.currentTarget) onClose();
  };
}
