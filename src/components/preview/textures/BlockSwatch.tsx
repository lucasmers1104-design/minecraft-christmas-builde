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

/**
 * Small block icon: the real texture when a texture pack is active, else the preview colour.
 * Decorative (aria-hidden) – the block name is always written next to it.
 */
export function BlockSwatch({ block, className = 'size-4' }: { block: string; className?: string }) {
  const pack = useActiveTexturePack();
  const icon = pack?.icon(block) ?? null;
  if (icon) {
    return (
      <span
        aria-hidden="true"
        data-testid="block-swatch-texture"
        className={`${className} inline-block shrink-0 rounded-[3px] bg-cover [image-rendering:pixelated]`}
        style={{ backgroundImage: `url(${icon})` }}
      />
    );
  }
  const { color, opacity } = swatchColor(block);
  return (
    <span
      aria-hidden="true"
      className={`${className} inline-block shrink-0 rounded-[3px] border border-line-strong`}
      style={{ background: color, opacity }}
    />
  );
}
