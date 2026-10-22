/**
 * Post positions on a frame line of `e` cells (corners included, 0 and e − 1): panels of 1–4
 * blocks, an odd number of panels so a centred door gets its own panel, as evenly as possible
 * (reproduces the stud table 5 / 7 / 9 / 11 / 13 / 15 of the research report).
 */
export function studPositions(e: number): number[] {
  if (e <= 3) return [0, e - 1];
  let panels = Math.max(1, Math.round((e - 1) / 4.5));
  if (panels % 2 === 0) panels++;
  for (;;) {
    const sum = e - (panels + 1);
    const base = Math.floor(sum / panels);
    if (base + 1 <= 4 || panels > e) {
      const widths = Array.from({ length: panels }, () => base);
      let rest = sum - base * panels;
      // Extra width goes to the outer panels first, symmetrically; an odd rest to the centre.
      for (let i = 0; rest > 1 && i < Math.floor(panels / 2); i++, rest -= 2) {
        widths[i]!++;
        widths[panels - 1 - i]!++;
      }
      if (rest === 1) widths[Math.floor(panels / 2)]!++;
      const posts = [0];
      for (const w of widths) posts.push(posts.at(-1)! + w + 1);
      return posts;
    }
    panels += 2;
  }
}

