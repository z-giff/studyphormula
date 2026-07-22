import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface LogoOrbProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  linkTo?: string;
  className?: string;
}

const LogoOrb = ({ size = "md", showWordmark = true, linkTo = "/", className = "" }: LogoOrbProps) => {
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
    
    // Very slow animation for subtle effect in navbar
    const animate = () => {
      setTime((prev) => prev + 0.003);
    };
    
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const colorShift = time * 15;

  // Size mapping
  const sizeMap = {
    sm: "w-7 h-7 sm:w-8 sm:h-8",
    md: "w-9 h-9 sm:w-10 sm:h-10",
    lg: "w-10 h-10 sm:w-12 sm:h-12",
  };

  const orbSize = sizeMap[size];

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${orbSize} flex-shrink-0`}>
        {/* Outer ambient glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(
              ellipse 100% 100% at 40% 35%,
              hsla(24, 45%, 70%, 0.25) 0%,
              hsla(38, 45%, 70%, 0.28) 30%,
              hsla(32, 40%, 50%, 0.18) 60%,
              transparent 80%
            )`,
            filter: "blur(6px)",
          }}
        />

        {/* Base sphere with directional lighting */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 120% 120% at 30% 25%,
                hsla(42, 55%, 85%, 0.7) 0%,
                hsla(38, 50%, 70%, 0.55) 20%,
                hsla(18, 40%, 55%, 0.4) 45%,
                hsla(24, 35%, 45%, 0.2) 65%,
                transparent 85%
              )
            `,
            filter: "blur(3px)",
          }}
        />

        {/* Shadow falloff - bottom-right */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                ellipse 100% 100% at 75% 80%,
                hsla(18, 30%, 18%, 0.4) 0%,
                hsla(32, 30%, 25%, 0.25) 30%,
                transparent 60%
              )
            `,
            filter: "blur(4px)",
          }}
        />

        {/* Internal color flow with slow rotation */}
        <div
          className="absolute inset-[3px] rounded-full"
          style={{
            background: `
              conic-gradient(
                from ${colorShift}deg at 45% 40%,
                hsla(42, 50%, 80%, 0.6) 0%,
                hsla(38, 45%, 65%, 0.65) 15%,
                hsla(24, 45%, 65%, 0.6) 35%,
                hsla(14, 40%, 55%, 0.55) 50%,
                hsla(18, 40%, 60%, 0.5) 65%,
                hsla(38, 45%, 70%, 0.55) 80%,
                hsla(42, 50%, 80%, 0.6) 100%
              )
            `,
            filter: "blur(2px)",
            opacity: 0.85,
          }}
        />

        {/* Highlight - top-left specular */}
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
                hsla(42, 60%, 95%, 0.85) 0%,
                hsla(38, 50%, 85%, 0.5) 40%,
                transparent 80%
              )
            `,
            filter: "blur(2px)",
          }}
        />

        {/* Pink highlight */}
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
                hsla(24, 60%, 95%, 0.9) 0%,
                hsla(26, 50%, 88%, 0.55) 50%,
                transparent 100%
              )
            `,
            filter: "blur(1px)",
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
                hsla(24, 55%, 88%, 0.65) 0%,
                hsla(18, 45%, 75%, 0.5) 30%,
                hsla(36, 40%, 55%, 0.35) 55%,
                transparent 80%
              )
            `,
            filter: "blur(2px)",
          }}
        />

        {/* Inner core glow */}
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
                hsla(28, 60%, 95%, 0.7) 0%,
                hsla(24, 50%, 85%, 0.45) 35%,
                hsla(18, 40%, 70%, 0.3) 60%,
                transparent 85%
              )
            `,
            filter: "blur(1.5px)",
          }}
        />

        {/* Subsurface scattering - edge glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(
                circle at 50% 50%,
                transparent 55%,
                hsla(24, 40%, 70%, 0.2) 65%,
                hsla(18, 35%, 55%, 0.12) 75%,
                hsla(32, 35%, 45%, 0.08) 85%,
                transparent 95%
              )
            `,
            filter: "blur(1px)",
          }}
        />
      </div>

      {showWordmark && (
        <span className="font-heading font-bold text-lg sm:text-xl text-foreground">
          Phormula
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};

export default LogoOrb;
