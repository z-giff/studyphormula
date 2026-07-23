import { Link } from "react-router-dom";
import SwirlMark from "@/components/SwirlMark";

interface LogoOrbProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  linkTo?: string;
  className?: string;
}

/**
 * Brand lockup: the ember swirl + "Phormula" wordmark.
 * Keeps the historical LogoOrb API so existing call sites are untouched.
 */
const LogoOrb = ({ size = "md", showWordmark = true, linkTo = "/", className = "" }: LogoOrbProps) => {
  const sizeMap = {
    sm: "w-6 h-6 sm:w-7 sm:h-7",
    md: "w-7 h-7 sm:w-8 sm:h-8",
    lg: "w-9 h-9 sm:w-10 sm:h-10",
  };
  const textMap = {
    sm: "text-base sm:text-lg",
    md: "text-lg sm:text-xl",
    lg: "text-xl sm:text-2xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SwirlMark className={`${sizeMap[size]} flex-shrink-0`} />
      {showWordmark && (
        <span className={`font-display font-medium tracking-tight text-foreground ${textMap[size]}`}>
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
