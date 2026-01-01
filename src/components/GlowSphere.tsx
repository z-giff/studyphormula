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
              hsla(0, 0%, 70%, 0.18) 0%,
              hsla(0, 0%, 50%, 0.1) 40%,
              transparent 70%
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
                hsla(0, 0%, 85%, 0.55) 0%,
                hsla(0, 0%, 70%, 0.4) 20%,
                hsla(0, 0%, 55%, 0.25) 45%,
                hsla(0, 0%, 40%, 0.12) 65%,
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
                hsla(0, 0%, 15%, 0.3) 0%,
                hsla(0, 0%, 25%, 0.18) 30%,
                transparent 60%
              )
            `,
            filter: "blur(30px)",
          }}
        />

        {/* Internal color flow layer 1 - wrapping gradient */}
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: `
              conic-gradient(
                from ${colorShift}deg at 45% 40%,
                hsla(0, 0%, 80%, 0.45) 0%,
                hsla(0, 0%, 65%, 0.5) 15%,
                hsla(0, 0%, 50%, 0.45) 30%,
                hsla(0, 0%, 40%, 0.4) 50%,
                hsla(0, 0%, 55%, 0.35) 65%,
                hsla(0, 0%, 70%, 0.4) 80%,
                hsla(0, 0%, 80%, 0.45) 100%
              )
            `,
            filter: "blur(20px)",
            opacity: 0.7,
          }}
        />

        {/* Internal color flow layer 2 - counter rotation for depth */}
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background: `
              conic-gradient(
                from ${-colorShift * 0.6 + 120}deg at 55% 50%,
                hsla(0, 0%, 75%, 0.55) 0%,
                hsla(0, 0%, 55%, 0.5) 25%,
                hsla(0, 0%, 45%, 0.45) 50%,
                hsla(0, 0%, 60%, 0.5) 75%,
                hsla(0, 0%, 75%, 0.55) 100%
              )
            `,
            filter: "blur(15px)",
            opacity: 0.6,
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
                hsla(0, 0%, 95%, 0.7) 0%,
                hsla(0, 0%, 85%, 0.4) 40%,
                transparent 80%
              )
            `,
            filter: "blur(12px)",
            transform: `translate(${drift * 0.2}px, ${-drift * 0.15}px)`,
          }}
        />

        {/* Secondary highlight - smaller, brighter */}
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
                hsla(0, 0%, 100%, 0.8) 0%,
                hsla(0, 0%, 90%, 0.5) 50%,
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
                hsla(0, 0%, 90%, 0.55) 0%,
                hsla(0, 0%, 75%, 0.4) 30%,
                hsla(0, 0%, 55%, 0.25) 55%,
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
                hsla(0, 0%, 98%, 0.6) 0%,
                hsla(0, 0%, 85%, 0.4) 35%,
                hsla(0, 0%, 70%, 0.2) 60%,
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
                hsla(0, 0%, 70%, 0.15) 65%,
                hsla(0, 0%, 55%, 0.1) 75%,
                hsla(0, 0%, 45%, 0.05) 85%,
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
                hsla(0, 0%, 80%, 0.3) 0%,
                hsla(0, 0%, 70%, 0.18) 50%,
                transparent 100%
              )
            `,
            filter: "blur(10px)",
            transform: `translate(${drift * 0.4}px, ${drift * 0.2}px) rotate(${colorShift * 0.3}deg)`,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
};

export default GlowSphere;
