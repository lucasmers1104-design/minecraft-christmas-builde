'use client';

import { Component, type ReactNode } from 'react';

export class SceneErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-holly-300">
          3D-Vorschau konnte nicht gestartet werden (WebGL nicht verfügbar?): {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
