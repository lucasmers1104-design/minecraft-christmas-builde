'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Callout } from '@/components/ui/Callout';
import { Icon } from '@/components/ui/Icon';

/** Catches errors of the 3D view (usually missing WebGL) and explains what still works. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex overflow-y-auto p-6">
          <Callout
            tone="danger"
            role="alert"
            title="Die 3D-Ansicht konnte nicht gestartet werden"
            className="m-auto w-full max-w-md"
            actions={
              <Button size="sm" icon={<Icon name="refresh" />} onClick={() => this.setState({ error: null })}>
                Erneut versuchen
              </Button>
            }
          >
            <p>
              Meist stellt der Browser kein WebGL bereit. Schalte in den Browser-Einstellungen die Hardwarebeschleunigung ein oder
              versuche einen anderen Browser. Materialliste, Bearbeitung über Koordinaten und Export funktionieren trotzdem.
            </p>
            <p className="mt-2 font-mono text-xs break-words text-fg-subtle">Fehler: {this.state.error.message}</p>
          </Callout>
        </div>
      );
    }
    return this.props.children;
  }
}
