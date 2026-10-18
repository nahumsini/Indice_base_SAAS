/** Presentation only: the owning form decides which controls are invalid. */
export function focusFirstInvalidControl(container: ParentNode | null) {
  if (!container) return false;
  const candidates = container.querySelectorAll<HTMLElement>('input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"],button[aria-invalid="true"],[role="combobox"][aria-invalid="true"]');
  for (const control of candidates) {
    if (control.matches(':disabled') || control.getClientRects().length === 0) continue;
    control.focus({ preventScroll: true });
    control.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    return true;
  }
  return false;
}

/** Reveal a newly shown error without stealing focus or changing field values. */
export function revealModalFeedback(element: HTMLElement | null) {
  if (!element || element.getClientRects().length === 0) return;
  const dialog = element.closest('[role="dialog"], [role="alertdialog"]');
  if (!dialog) return;
  const body = element.closest('[data-slot="indice-modal-body"]') ?? dialog;
  const rect = element.getBoundingClientRect();
  const bounds = dialog.getBoundingClientRect();
  const bodyBounds = body.getBoundingClientRect();
  if (rect.top < Math.max(bounds.top, bodyBounds.top) || rect.bottom > Math.min(bounds.bottom, bodyBounds.bottom)) {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
}
