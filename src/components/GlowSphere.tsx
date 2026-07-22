import { useEffect, useState } from "react";

const GlowSphere = () => {
  const [time, setTime] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const animate = () => {
      setTime((prev) => prev + 0.008);
    };
    
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Slow oscillating values for organic movement
  const breathe = Math.sin(time * 0.5) * 0.08;
  const drift = Math.cos(time * 0.3) * 8;
  const colorShift = time * 15;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem]"
        style={{
          transform: `scale(${1 + breathe})`,
          transition: "transform 0.1s ease-out",
        }}
      >
        {/* Outer ambient glow - soft edge diffusion */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(
              ellipse 100% 100% at 40% 35%,
              hsla(24, 45%, 70%, 0.2) 0%,
              hsla(38, 45%, 70%, 0.22) 30%,
              hsla(32, 40%, 50%, 0.14) 60%,
              transparent 80%
            )`,
            filter: "blur(60px)",
            transform: `translate(${drift * 0.3}px, ${drift * 0.2}px)`,
          }}
        />

        {/* Base sphere with directional lighting - highlight top-left */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 120% 120% at 30% 25%,
                hsla(42, 55%, 85%, 0.6) 0%,
                hsla(38, 50%, 70%, 0.45) 20%,
                hsla(18, 40%, 55%, 0.3) 45%,
                hsla(24, 35%, 45%, 0.15) 65%,
                transparent 85%
              )
            `,
            filter: "blur(25px)",
          }}
        />

        {/* Shadow falloff - bottom-right darker region */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 100% at 75% 80%,
                hsla(18, 30%, 18%, 0.35) 0%,
                hsla(32, 30%, 25%, 0.2) 30%,
                transparent 60%
              )
            `,
            filter: "blur(30px)",
          }}
        />

        {/* Internal color flow layer 1 - wrapping gradient with pink */}
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: `
              conic-gradient(
                from ${colorShift}deg at 45% 40%,
                hsla(42, 50%, 80%, 0.5) 0%,
                hsla(38, 45%, 65%, 0.55) 15%,
                hsla(24, 45%, 65%, 0.5) 35%,
                hsla(14, 40%, 55%, 0.45) 50%,
                hsla(18, 40%, 60%, 0.4) 65%,
                hsla(38, 45%, 70%, 0.45) 80%,
                hsla(42, 50%, 80%, 0.5) 100%
              )
            `,
            filter: "blur(20px)",
            opacity: 0.75,
          }}
        />

        {/* Internal color flow layer 2 - counter rotation for depth */}
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background: `
              conic-gradient(
                from ${-colorShift * 0.6 + 120}deg at 55% 50%,
                hsla(40, 55%, 75%, 0.6) 0%,
                hsla(24, 50%, 70%, 0.55) 25%,
                hsla(14, 45%, 60%, 0.5) 50%,
                hsla(18, 45%, 65%, 0.55) 75%,
                hsla(40, 55%, 75%, 0.6) 100%
              )
            `,
            filter: "blur(15px)",
            opacity: 0.65,
          }}
        />

        {/* Highlight rim - top-left specular */}
        <div
          className="absolute rounded-full"
          style={{
            top: "8%",
            left: "12%",
            width: "35%",
            height: "25%",
            background: `
              radial-gradient(
                ellipse 100% 80% at 50% 60%,
                hsla(42, 60%, 95%, 0.75) 0%,
                hsla(38, 50%, 85%, 0.45) 40%,
                transparent 80%
              )
            `,
            filter: "blur(12px)",
            transform: `translate(${drift * 0.2}px, ${-drift * 0.15}px)`,
          }}
        />

        {/* Secondary highlight - smaller, brighter with pink tint */}
        <div
          className="absolute rounded-full"
          style={{
            top: "15%",
            left: "20%",
            width: "18%",
            height: "12%",
            background: `
              radial-gradient(
                ellipse at 50% 50%,
                hsla(24, 60%, 95%, 0.8) 0%,
                hsla(26, 50%, 88%, 0.5) 50%,
                transparent 100%
              )
            `,
            filter: "blur(8px)",
          }}
        />

        {/* Dense luminous core */}
        <div
          className="absolute rounded-full"
          style={{
            top: "25%",
            left: "25%",
            width: "50%",
            height: "50%",
            background: `
              radial-gradient(
                ellipse 90% 90% at 45% 45%,
                hsla(24, 55%, 88%, 0.55) 0%,
                hsla(18, 45%, 75%, 0.4) 30%,
                hsla(36, 40%, 55%, 0.3) 55%,
                transparent 80%
              )
            `,
            filter: "blur(18px)",
            transform: `scale(${1 + Math.sin(time * 0.7) * 0.05})`,
          }}
        />

        {/* Inner core glow - brightest point */}
        <div
          className="absolute rounded-full"
          style={{
            top: "32%",
            left: "32%",
            width: "36%",
            height: "36%",
            background: `
              radial-gradient(
                ellipse at 40% 40%,
                hsla(28, 60%, 95%, 0.6) 0%,
                hsla(24, 50%, 85%, 0.4) 35%,
                hsla(18, 40%, 70%, 0.25) 60%,
                transparent 85%
              )
            `,
            filter: "blur(12px)",
          }}
        />

        {/* Subsurface scattering effect - edge glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 50% 50%,
                transparent 55%,
                hsla(24, 40%, 70%, 0.16) 65%,
                hsla(18, 35%, 55%, 0.1) 75%,
                hsla(32, 35%, 45%, 0.06) 85%,
                transparent 95%
              )
            `,
            filter: "blur(8px)",
          }}
        />

        {/* Refraction caustic - subtle light bending effect */}
        <div
          className="absolute rounded-full"
          style={{
            top: "55%",
            left: "50%",
            width: "30%",
            height: "20%",
            background: `
              radial-gradient(
                ellipse at 50% 30%,
                hsla(24, 50%, 80%, 0.32) 0%,
                hsla(18, 40%, 70%, 0.2) 50%,
                transparent 100%
              )
            `,
            filter: "blur(10px)",
            transform: `translate(${drift * 0.4}px, ${drift * 0.2}px) rotate(${colorShift * 0.3}deg)`,
            opacity: 0.65,
          }}
        />
      </div>
    </div>
  );
};

export default GlowSphere;
