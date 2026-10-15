
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const logoSrc = `${import.meta.env.BASE_URL}cmg-logo-circle.png`;

/** The supplied CMG circular mark, kept as an image so every surface uses the same artwork. */
const Logo: React.FC<LogoProps> = ({ size = 150, className = "" }) => (
  <img
    src={logoSrc}
    width={size}
    height={size}
    className={`object-contain ${className}`}
    alt="Christian Match Ghana logo"
    draggable={false}
  />
);

export default Logo;
