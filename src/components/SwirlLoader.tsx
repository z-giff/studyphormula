import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const SWIRL_PATH =
  "M 21.4 41.3 Q 18.1 46.3 15.4 51.7 Q 12.7 57.1 10.7 62.7 Q 8.2 70.1 7.1 77.8 Q 6.1 85.5 6.7 93.2 Q 7.2 100.9 9.4 108.3 Q 11.5 115.6 15.0 122.4 Q 18.6 129.2 23.4 135.2 Q 28.2 141.1 34.1 146.1 Q 39.9 151.0 46.6 154.9 Q 53.2 158.7 60.3 161.3 Q 67.4 163.9 74.8 165.3 Q 82.2 166.7 89.5 167.0 Q 96.9 167.2 104.1 166.3 Q 111.3 165.4 118.2 163.4 Q 125.0 161.5 131.3 158.5 Q 137.6 155.6 143.3 151.8 Q 148.9 147.9 153.7 143.3 Q 158.4 138.7 162.2 133.4 Q 166.0 128.1 168.7 122.3 Q 171.4 116.5 172.8 110.4 Q 174.3 104.4 174.4 98.2 Q 174.6 92.0 173.5 86.0 Q 172.4 80.0 170.1 74.4 Q 167.7 68.7 164.3 63.7 Q 160.9 58.7 156.6 54.5 Q 152.3 50.2 147.4 46.9 Q 142.4 43.5 137.0 41.2 Q 131.5 38.8 125.9 37.3 Q 120.2 35.9 114.5 35.4 Q 108.9 34.9 103.3 35.2 Q 97.7 35.6 92.4 36.8 Q 87.1 37.9 82.2 39.9 Q 77.3 41.8 72.8 44.4 Q 68.4 46.9 64.5 50.1 Q 60.7 53.3 57.6 57.0 Q 54.4 60.7 52.1 64.9 Q 49.7 69.0 48.3 73.4 Q 46.8 77.8 46.3 82.3 Q 45.8 86.8 46.3 91.2 Q 46.7 95.7 48.1 99.8 Q 49.5 104.0 51.7 107.8 Q 54.0 111.5 56.9 114.7 Q 59.8 117.9 63.3 120.4 Q 66.7 122.9 70.5 124.6 Q 74.2 126.4 78.1 127.5 Q 82.0 128.6 85.9 129.0 Q 89.8 129.4 93.6 129.2 Q 97.3 129.0 100.8 128.2 Q 104.3 127.5 107.5 126.3 Q 110.7 125.1 113.6 123.5 Q 116.5 121.9 118.9 119.9 Q 121.4 118.0 123.4 115.8 Q 125.4 113.5 126.9 111.1 Q 128.4 108.6 129.3 106.0 Q 130.3 103.4 130.6 100.7 Q 130.9 98.0 130.6 95.4 Q 130.3 92.8 129.4 90.4 Q 128.5 88.1 127.1 86.0 Q 125.7 84.0 123.9 82.4 Q 122.0 80.8 119.9 79.7 Q 117.9 78.6 115.7 78.0 Q 113.5 77.5 111.4 77.4 Q 109.3 77.4 107.3 77.9 Q 105.4 78.3 103.8 79.4";

const easeInOutCubic = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

interface SwirlLoaderProps {
  /** Rendered size in px. Defaults to 64 — sensible for full-page loading states. */
  size?: number;
  /** Animation speed multiplier (1 = original 1.9s draw / 0.5s hold / 1.9s erase cycle). */
  speed?: number;
  label?: string;
  className?: string;
}

/**
 * The Phormula swirl as an animated loader: the stroke draws out from the
 * center, holds as the full logo, then erases back toward the center.
 * Ported from the uploaded Swirl_Loader_transparent.html ("Unfurl" motion).
 */
const SwirlLoader = ({ size = 64, speed = 1, label, className }: SwirlLoaderProps) => {
  const armRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const arm = armRef.current;
    if (!arm) return;
    const L = arm.getTotalLength();
    const t0 = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const secs = (now - t0) / 1000;
      const draw = 1.1 / speed;
      const hold = 0.5;
      const erase = 1.1 / speed;
      const gap = 0.18;
      const s = secs % (draw + hold + erase + gap);

      const head = easeInOutCubic(s / draw) * L;
      const tail = easeInOutCubic((s - draw - hold) / erase) * L;

      // Grow in from a point at the start, taper to nothing at the end, so the
      // round cap never snaps from the outer tail back to the center.
      const grow = easeOutCubic(s / (0.28 / speed));
      const shrink = 1 - easeOutCubic((s - draw - hold - erase * 0.6) / (erase * 0.4));
      const k = Math.min(grow, shrink);

      arm.setAttribute("stroke-width", `${20 * k}`);
      arm.setAttribute("opacity", `${Math.min(1, k * 1.4)}`);
      // Path runs outer → inner, so measure from the inner end.
      const visible = Math.max(0.001, head - tail);
      arm.setAttribute("stroke-dasharray", `${visible} ${L * 2}`);
      arm.setAttribute("stroke-dashoffset", `${-(L - head)}`);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [speed]);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)} role="status" aria-label={label ?? "Loading"}>
      <svg
        viewBox="0 0 200 200"
        style={{ width: size, height: size, overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="swirl-loader-grad" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="hsl(32 92% 61%)" />
            <stop offset="0.5" stopColor="hsl(11 85% 66%)" />
            <stop offset="1" stopColor="hsl(334 81% 65%)" />
          </linearGradient>
        </defs>
        <g transform="translate(9.5 -1)">
          <path
            ref={armRef}
            d={SWIRL_PATH}
            fill="none"
            stroke="url(#swirl-loader-grad)"
            strokeWidth={20}
            strokeLinecap="round"
            strokeDasharray="0 2000"
          />
        </g>
      </svg>
      {label && (
        <div className="text-[13px] tracking-[0.18em] uppercase text-muted-foreground">{label}</div>
      )}
    </div>
  );
};

export default SwirlLoader;
