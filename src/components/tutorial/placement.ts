import type { TutorialPlacement } from './tutorialSteps';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function findVisibleElement(selector: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return (
    nodes.find((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 2 &&
        rect.height > 2 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0'
      );
    }) ?? null
  );
}

export function toRect(el: HTMLElement, padding = 8): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(8, r.top - padding),
    left: Math.max(8, r.left - padding),
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    bottom: r.bottom + padding,
    right: r.right + padding,
  };
}

export function placeTooltip(
  hole: Rect,
  tooltip: { width: number; height: number },
  preferred: TutorialPlacement
): { top: number; left: number; placement: TutorialPlacement } {
  const gap = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 768;
  const order: TutorialPlacement[] = isMobile
    ? ['bottom', 'top', preferred, 'right', 'left']
    : [preferred, 'bottom', 'top', 'right', 'left'];

  const unique = order.filter((item, index) => order.indexOf(item) === index);

  const candidates: Record<TutorialPlacement, { top: number; left: number }> = {
    bottom: { top: hole.top + hole.height + gap, left: hole.left + hole.width / 2 - tooltip.width / 2 },
    top: { top: hole.top - tooltip.height - gap, left: hole.left + hole.width / 2 - tooltip.width / 2 },
    right: { top: hole.top + hole.height / 2 - tooltip.height / 2, left: hole.left + hole.width + gap },
    left: { top: hole.top + hole.height / 2 - tooltip.height / 2, left: hole.left - tooltip.width - gap },
  };

  const fits = (pos: { top: number; left: number }) =>
    pos.top >= 12 &&
    pos.left >= 12 &&
    pos.top + tooltip.height <= vh - 12 &&
    pos.left + tooltip.width <= vw - 12;

  for (const placement of unique) {
    const pos = candidates[placement];
    if (fits(pos)) return { ...pos, placement };
  }

  const fallback = candidates.bottom;
  return {
    placement: 'bottom',
    top: Math.min(Math.max(12, fallback.top), vh - tooltip.height - 12),
    left: Math.min(Math.max(12, fallback.left), vw - tooltip.width - 12),
  };
}
