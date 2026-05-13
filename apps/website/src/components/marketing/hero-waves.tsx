/**
 * Decorative background layer for the hero. Three organic blob shapes
 * in brand violet, drifting on slow `translate` + `scale` keyframes
 * (defined in globals.css). No JS, GPU-only animation, gated by
 * `prefers-reduced-motion`.
 *
 * Why inline SVG rather than `<img src=".svg">`: we want the colours
 * to inherit from the CSS custom property (so a future palette swap
 * doesn't need new assets) and we need separate elements per blob so
 * each can carry its own animation. A single CSS-painted radial-
 * gradient wouldn't give us the irregular silhouettes that make this
 * read as "fluid" rather than "background tint."
 *
 * The paths were authored by hand to feel like water: gentle 6-point
 * Béziers, no symmetry, sized to a 600×600 viewBox so the `blur(40px)`
 * filter has room to do its work without clipping.
 */
export function HeroWaves() {
  return (
    <div className="hero-waves" aria-hidden="true">
      <svg
        className="hero-waves__blob hero-waves__blob--a absolute -left-[10%] -top-[20%] h-[640px] w-[640px]"
        viewBox="0 0 600 600"
        fill="none"
      >
        <path
          d="M461 109c41 60 61 138 32 197s-103 92-176 100-152-2-204-44S38 250 54 184 142 70 213 50s207-1 248 59z"
          fill="var(--accent)"
        />
      </svg>
      <svg
        className="hero-waves__blob hero-waves__blob--b absolute right-[-5%] top-[10%] h-[560px] w-[560px]"
        viewBox="0 0 600 600"
        fill="none"
      >
        <path
          d="M488 152c28 64 22 152-17 213s-117 95-194 88-156-58-194-130S58 168 109 113 271 35 339 50s121 38 149 102z"
          fill="var(--accent-soft)"
        />
      </svg>
      <svg
        className="hero-waves__blob hero-waves__blob--c absolute -bottom-[15%] left-[18%] h-[520px] w-[520px]"
        viewBox="0 0 600 600"
        fill="none"
      >
        <path
          d="M442 134c39 56 67 134 50 193s-79 99-149 117-152 6-205-37S35 290 41 226s67-130 142-155 220-3 259 63z"
          fill="var(--highlight)"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
