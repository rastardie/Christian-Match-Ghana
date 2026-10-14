
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/** The supplied CMG circular mark, kept as an image so every surface uses the same artwork. */
const Logo: React.FC<LogoProps> = ({ size = 150, className = "" }) => (
  <img
    src="/cmg-logo-circle.png"
    width={size}
    height={size}
    className={`object-contain ${className}`}
    alt="Christian Match Ghana logo"
    draggable={false}
  />
);

export default Logo;
