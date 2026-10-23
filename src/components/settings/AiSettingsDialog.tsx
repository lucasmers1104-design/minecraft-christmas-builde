'use client';

import { Dialog } from '@/components/ui/Dialog';

/**
 * Settings dialog of the AI planning (provider, OpenRouter key, model, reasoning, Ollama).
 * PLACEHOLDER of the foundation commit – the real dialog replaces this body; the props stay.
 */
export function AiSettingsDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after settings were saved, so the app can re-check the AI status. */
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="KI-Anbindung" testId="ai-settings" closeTestId="ai-settings-close">
      <p className="text-sm text-fg-muted" data-saved-callback={typeof onSaved}>
        Wird gerade gebaut.
      </p>
    </Dialog>
  );
}
