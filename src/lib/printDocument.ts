/**
 * Print only the freight bill / delivery note.
 * Hiding the live page with display:none works in Chrome but Safari often
 * shows a blank sheet or never opens Print. An off-screen iframe keeps the
 * click as a user gesture on both browsers.
 */
export function printIsolatedElement(element: HTMLElement) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:absolute;left:-10000px;top:0;width:210mm;height:297mm;border:0;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const idoc = iframe.contentDocument;
  if (!win || !idoc) {
    iframe.remove();
    window.print();
    return;
  }

  idoc.open();
  idoc.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Print</title></head><body></body></html>'
  );
  idoc.close();

  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    idoc.head.appendChild(node.cloneNode(true));
  });

  const pageStyle = idoc.createElement('style');
  pageStyle.textContent = `
    @page { size: A4 portrait; margin: 8mm; }
    html, body { margin: 0; background: #fff; color: #000; }
    .print-document {
      max-height: none !important;
      overflow: visible !important;
      height: auto !important;
      position: static !important;
    }
  `;
  idoc.head.appendChild(pageStyle);

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.height = 'auto';
  clone.style.position = 'static';
  idoc.body.style.margin = '0';
  idoc.body.style.background = '#fff';
  idoc.body.appendChild(clone);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    win.removeEventListener('afterprint', cleanup);
    iframe.remove();
  };
  win.addEventListener('afterprint', cleanup);
  win.focus();
  win.print();
}
