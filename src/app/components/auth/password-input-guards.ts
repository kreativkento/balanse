import type { ClipboardEvent, KeyboardEvent, MouseEvent } from 'react';

function blockTransfer(event: ClipboardEvent<HTMLInputElement>) {
  event.preventDefault();
}

function blockContextMenu(event: MouseEvent<HTMLInputElement>) {
  event.preventDefault();
}

function blockTransferShortcuts(event: KeyboardEvent<HTMLInputElement>) {
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  const transferShortcut = modifier && ['c', 'x', 'v'].includes(key);
  const insertShortcut = event.shiftKey && key === 'insert';

  if (transferShortcut || insertShortcut) event.preventDefault();
}

export const passwordInputGuardProps = {
  onCopy: blockTransfer,
  onCut: blockTransfer,
  onPaste: blockTransfer,
  onContextMenu: blockContextMenu,
  onKeyDown: blockTransferShortcuts,
};
