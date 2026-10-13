
import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 150, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CMG Logo"
    >
      {/* Outer Circle */}
      <circle cx="100" cy="100" r="95" fill="white" stroke="black" strokeWidth="6" />
      
      {/* Hearts - Top Left */}
      <g transform="translate(35, 60) rotate(-15)">
        <path 
          d="M0,0 C-15,-15 -30,5 0,25 C30,5 15,-15 0,0 Z" 
          fill="#DC2626" 
          transform="scale(1.2)" 
        />
        <path 
          d="M0,0 C-15,-15 -30,5 0,25 C30,5 15,-15 0,0 Z" 
          fill="#DC2626" 
          transform="translate(25, -10) scale(1.0)" 
        />
      </g>

      {/* Main Typography - Centered at 100 */}
      <g fontFamily="serif" fontWeight="bold" textAnchor="middle">
        <text x="100" y="85" fontSize="34" fill="#991B1B" letterSpacing="-1">Christian</text>
        <text x="100" y="118" fontSize="40" fill="#EAB308" letterSpacing="-1">Match</text>
        <text x="100" y="152" fontSize="38" fill="#15803d" letterSpacing="-1">Ghana</text>
      </g>
      
      {/* Tagline */}
      <text 
        x="100" 
        y="178" 
        textAnchor="middle" 
        fontFamily="sans-serif" 
        fontWeight="bold" 
        fontSize="11" 
        fill="black"
      >
        Uniting Hearts in Christ
      </text>
    </svg>
  );
};

export default Logo;
