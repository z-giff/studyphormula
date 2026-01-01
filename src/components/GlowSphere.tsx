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
    
    const animate = () => {
      setRotation((prev) => (prev + 0.15) % 360);
    };
    
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96"
        style={{
          filter: "blur(40px)",
          opacity: 0.6,
        }}
      >
        {/* Primary rotating gradient layer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(
              from ${rotation}deg,
              hsl(175, 70%, 55%) 0%,
              hsl(210, 80%, 60%) 25%,
              hsl(250, 70%, 55%) 50%,
              hsl(280, 60%, 55%) 75%,
              hsl(175, 70%, 55%) 100%
            )`,
            transform: `scale(${1 + Math.sin(rotation * 0.02) * 0.05})`,
          }}
        />
        
        {/* Secondary counter-rotating layer for depth */}
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: `conic-gradient(
              from ${-rotation * 0.7}deg,
              hsl(210, 85%, 65%) 0%,
              hsl(250, 75%, 60%) 33%,
              hsl(175, 75%, 50%) 66%,
              hsl(210, 85%, 65%) 100%
            )`,
            opacity: 0.8,
          }}
        />
        
        {/* Inner soft glow core */}
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background: `radial-gradient(
              circle,
              hsla(220, 80%, 70%, 0.6) 0%,
              hsla(250, 70%, 60%, 0.3) 50%,
              transparent 80%
            )`,
            transform: `scale(${1 + Math.cos(rotation * 0.015) * 0.1})`,
          }}
        />
      </div>
    </div>
  );
};

export default GlowSphere;
