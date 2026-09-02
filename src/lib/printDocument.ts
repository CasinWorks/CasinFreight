/**
 * Print only one document (freight bill, delivery note).
 * window.print() otherwise dumps the whole app; a position:fixed overlay
 * is then repeated on every page of whatever sat behind the modal.
 */
export function printIsolatedElement(element: HTMLElement) {
  const snapshots: Array<{ el: HTMLElement; cssText: string }> = [];
  const seen = new Set<HTMLElement>();

  const remember = (el: HTMLElement) => {
    if (seen.has(el)) return;
    seen.add(el);
    snapshots.push({ el, cssText: el.getAttribute('style') ?? '' });
  };

  let current: HTMLElement | null = element;
  while (current.parentElement) {
    const parent = current.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== current && sibling instanceof HTMLElement) {
        remember(sibling);
        sibling.style.setProperty('display', 'none', 'important');
      }
    }
    remember(current);
    current.style.setProperty('overflow', 'visible', 'important');
    current.style.setProperty('max-height', 'none', 'important');
    current.style.setProperty('height', 'auto', 'important');
    current.style.setProperty('min-height', '0', 'important');
    current.style.setProperty('max-width', 'none', 'important');
    current.style.setProperty('position', 'static', 'important');
    current.style.setProperty('transform', 'none', 'important');
    current.style.setProperty('inset', 'auto', 'important');
    if (current !== element) {
      current.style.setProperty('background', 'transparent', 'important');
      current.style.setProperty('box-shadow', 'none', 'important');
      current.style.setProperty('border', 'none', 'important');
      current.style.setProperty('padding', '0', 'important');
      current.style.setProperty('margin', '0', 'important');
      current.style.setProperty('border-radius', '0', 'important');
    }
    if (current === document.body) break;
    current = parent;
  }

  remember(document.documentElement);
  document.documentElement.style.setProperty('background', '#ffffff', 'important');
  document.body.style.setProperty('background', '#ffffff', 'important');

  let cleaned = false;
  const media = window.matchMedia('print');
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    media.removeEventListener('change', onMedia);
    window.removeEventListener('afterprint', cleanup);
    for (const { el, cssText } of snapshots) {
      if (cssText) el.setAttribute('style', cssText);
      else el.removeAttribute('style');
    }
  };
  const onMedia = (event: MediaQueryListEvent) => {
    if (!event.matches) cleanup();
  };

  media.addEventListener('change', onMedia);
  window.addEventListener('afterprint', cleanup);
  window.print();
}
