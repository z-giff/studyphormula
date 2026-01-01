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
              hsla(210, 85%, 70%, 0.15) 0%,
              hsla(250, 70%, 60%, 0.08) 40%,
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
                hsla(175, 75%, 65%, 0.5) 0%,
                hsla(200, 80%, 55%, 0.35) 20%,
                hsla(230, 75%, 50%, 0.2) 45%,
                hsla(270, 60%, 45%, 0.1) 65%,
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
                hsla(260, 50%, 25%, 0.25) 0%,
                hsla(240, 40%, 30%, 0.15) 30%,
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
                hsla(175, 80%, 55%, 0.4) 0%,
                hsla(195, 85%, 60%, 0.45) 15%,
                hsla(220, 80%, 55%, 0.4) 30%,
                hsla(250, 70%, 50%, 0.35) 50%,
                hsla(280, 65%, 55%, 0.3) 65%,
                hsla(200, 80%, 60%, 0.35) 80%,
                hsla(175, 80%, 55%, 0.4) 100%
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
                hsla(210, 90%, 65%, 0.5) 0%,
                hsla(240, 75%, 60%, 0.45) 25%,
                hsla(175, 80%, 50%, 0.4) 50%,
                hsla(195, 85%, 55%, 0.45) 75%,
                hsla(210, 90%, 65%, 0.5) 100%
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
                hsla(190, 90%, 80%, 0.6) 0%,
                hsla(200, 85%, 70%, 0.3) 40%,
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
                hsla(180, 95%, 85%, 0.7) 0%,
                hsla(195, 90%, 75%, 0.4) 50%,
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
                hsla(200, 85%, 75%, 0.5) 0%,
                hsla(220, 80%, 65%, 0.35) 30%,
                hsla(240, 70%, 55%, 0.2) 55%,
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
                hsla(195, 90%, 80%, 0.55) 0%,
                hsla(210, 85%, 70%, 0.35) 35%,
                hsla(230, 75%, 60%, 0.15) 60%,
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
                hsla(210, 80%, 65%, 0.12) 65%,
                hsla(240, 70%, 55%, 0.08) 75%,
                hsla(270, 60%, 50%, 0.04) 85%,
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
                hsla(175, 85%, 70%, 0.25) 0%,
                hsla(190, 80%, 65%, 0.15) 50%,
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
