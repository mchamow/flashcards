/** Shortcuts stay out of the way while the user types or has a dialog open. */
export const ignoreShortcut = (event: KeyboardEvent) =>
  event.ctrlKey ||
  event.metaKey ||
  event.altKey ||
  (event.target instanceof HTMLElement &&
    (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) ||
  document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
