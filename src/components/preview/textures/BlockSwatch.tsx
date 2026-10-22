'use client';

import { renderInfoFor } from '@/core/blocks/registry';
import { useActiveTexturePack } from '@/components/preview/textures/TextureProvider';

function swatchColor(stateOrId: string): { color: string; opacity: number } {
  try {
    const render = renderInfoFor(stateOrId);
    return { color: render.color, opacity: render.opacity ?? 1 };
  } catch {
    return { color: 'transparent', opacity: 1 };
  }
}

/** Small block icon: the real texture when available, else the preview colour. */
export function BlockSwatch({ block, className = 'size-3' }: { block: string; className?: string }) {
  const pack = useActiveTexturePack();
  const icon = pack?.icon(block) ?? null;
  if (icon) {
    return (
      <span
        aria-hidden="true"
        data-testid="block-swatch-texture"
        className={`${className} shrink-0 rounded-[2px] bg-cover [image-rendering:pixelated]`}
        style={{ backgroundImage: `url(${icon})` }}
      />
    );
  }
  const { color, opacity } = swatchColor(block);
  return <span aria-hidden="true" className={`${className} shrink-0 rounded-sm border border-white/20`} style={{ background: color, opacity }} />;
}
