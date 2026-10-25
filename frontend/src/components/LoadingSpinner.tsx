import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: number;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label, size = 16, className = '' }) => (
  <span
    role="status"
    aria-live="polite"
    aria-label={label || 'Loading'}
    className={`inline-flex items-center justify-center gap-2 ${className}`}
  >
    <Loader2 size={size} aria-hidden="true" className="shrink-0 animate-spin" />
    {label && <span>{label}</span>}
  </span>
);

export default LoadingSpinner;
