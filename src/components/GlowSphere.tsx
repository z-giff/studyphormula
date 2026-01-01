import { useEffect, useState } from "react";

const GlowSphere = () => {
  const [rotation, setRotation] = useState(0);
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
    
    let animationFrame: number;
    let startTime: number | null = null;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      // 12 second loop
      setRotation((elapsed / 12000) * 360 % 360);
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [prefersReducedMotion]);

  const slowRotation = rotation;
  const counterRotation = -rotation * 0.6;
  const microRotation = rotation * 0.3;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Ambient glow - soft outer halo */}
      <div
        className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-[26rem] md:h-[26rem] lg:w-[32rem] lg:h-[32rem] rounded-full"
        style={{
          background: `radial-gradient(
            circle at 50% 50%,
            hsla(210, 80%, 70%, 0.15) 0%,
            hsla(230, 70%, 60%, 0.08) 40%,
            hsla(250, 60%, 50%, 0.03) 60%,
            transparent 75%
          )`,
          filter: "blur(30px)",
        }}
      />

      {/* Main orb container */}
      <div
        className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Base sphere with 3D shading - dark side (lower-right) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 130% 130% at 70% 75%,
                hsla(250, 40%, 20%, 0.4) 0%,
                hsla(240, 35%, 25%, 0.25) 25%,
                hsla(230, 30%, 30%, 0.1) 50%,
                transparent 70%
              )
            `,
          }}
        />

        {/* Lit side (upper-left) - directional light */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 100% at 30% 25%,
                hsla(190, 85%, 75%, 0.45) 0%,
                hsla(200, 80%, 65%, 0.3) 20%,
                hsla(215, 75%, 55%, 0.15) 40%,
                transparent 65%
              )
            `,
          }}
        />

        {/* Internal flowing gradient layer 1 - primary rotation */}
        <div
          className="absolute inset-2 rounded-full overflow-hidden"
          style={{
            background: `
              conic-gradient(
                from ${slowRotation}deg at 45% 40%,
                hsla(175, 75%, 50%, 0.35) 0%,
                hsla(195, 80%, 55%, 0.4) 12%,
                hsla(215, 85%, 55%, 0.38) 25%,
                hsla(240, 75%, 50%, 0.32) 40%,
                hsla(270, 65%, 50%, 0.28) 55%,
                hsla(220, 80%, 55%, 0.35) 70%,
                hsla(190, 75%, 50%, 0.38) 85%,
                hsla(175, 75%, 50%, 0.35) 100%
              )
            `,
            filter: "blur(12px)",
          }}
        />

        {/* Internal flowing gradient layer 2 - counter rotation for depth */}
        <div
          className="absolute inset-6 rounded-full overflow-hidden"
          style={{
            background: `
              conic-gradient(
                from ${counterRotation + 60}deg at 55% 50%,
                hsla(200, 90%, 60%, 0.4) 0%,
                hsla(230, 80%, 55%, 0.35) 20%,
                hsla(260, 70%, 50%, 0.3) 40%,
                hsla(180, 85%, 50%, 0.35) 60%,
                hsla(195, 90%, 55%, 0.4) 80%,
                hsla(200, 90%, 60%, 0.4) 100%
              )
            `,
            filter: "blur(8px)",
            opacity: 0.7,
          }}
        />

        {/* Internal flowing gradient layer 3 - slow micro movement */}
        <div
          className="absolute inset-10 rounded-full overflow-hidden"
          style={{
            background: `
              conic-gradient(
                from ${microRotation + 180}deg at 48% 48%,
                hsla(210, 95%, 70%, 0.45) 0%,
                hsla(240, 85%, 65%, 0.4) 30%,
                hsla(190, 90%, 60%, 0.42) 60%,
                hsla(210, 95%, 70%, 0.45) 100%
              )
            `,
            filter: "blur(6px)",
            opacity: 0.6,
          }}
        />

        {/* Core brightness - denser center */}
        <div
          className="absolute rounded-full"
          style={{
            top: "25%",
            left: "25%",
            width: "50%",
            height: "50%",
            background: `
              radial-gradient(
                ellipse 90% 85% at 45% 45%,
                hsla(200, 90%, 80%, 0.4) 0%,
                hsla(215, 85%, 70%, 0.25) 35%,
                hsla(230, 75%, 60%, 0.1) 60%,
                transparent 85%
              )
            `,
            filter: "blur(10px)",
          }}
        />

        {/* Specular highlight - primary (upper-left sheen) */}
        <div
          className="absolute rounded-full"
          style={{
            top: "6%",
            left: "10%",
            width: "40%",
            height: "28%",
            background: `
              radial-gradient(
                ellipse 100% 70% at 50% 70%,
                hsla(195, 100%, 90%, 0.7) 0%,
                hsla(200, 95%, 85%, 0.4) 30%,
                hsla(210, 90%, 80%, 0.15) 60%,
                transparent 100%
              )
            `,
            filter: "blur(6px)",
            transform: "rotate(-15deg)",
          }}
        />

        {/* Specular highlight - secondary (smaller, brighter spot) */}
        <div
          className="absolute rounded-full"
          style={{
            top: "12%",
            left: "18%",
            width: "18%",
            height: "10%",
            background: `
              radial-gradient(
                ellipse at 50% 50%,
                hsla(185, 100%, 95%, 0.85) 0%,
                hsla(195, 100%, 90%, 0.5) 40%,
                transparent 100%
              )
            `,
            filter: "blur(3px)",
            transform: "rotate(-20deg)",
          }}
        />

        {/* Edge definition - subtle rim lighting */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 50% 50%,
                transparent 60%,
                hsla(210, 75%, 65%, 0.08) 75%,
                hsla(230, 65%, 55%, 0.05) 85%,
                transparent 95%
              )
            `,
          }}
        />

        {/* Bottom rim reflection - subtle bounce light */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: "8%",
            left: "25%",
            width: "50%",
            height: "15%",
            background: `
              radial-gradient(
                ellipse 100% 100% at 50% 0%,
                hsla(200, 70%, 70%, 0.15) 0%,
                hsla(210, 65%, 60%, 0.08) 50%,
                transparent 100%
              )
            `,
            filter: "blur(8px)",
          }}
        />

        {/* 3D depth shadow - internal shadow for volume */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `
              inset -20px -20px 40px hsla(250, 50%, 15%, 0.25),
              inset -10px -10px 20px hsla(240, 45%, 20%, 0.15),
              inset 15px 15px 30px hsla(200, 80%, 80%, 0.1)
            `,
          }}
        />
      </div>
    </div>
  );
};

export default GlowSphere;
