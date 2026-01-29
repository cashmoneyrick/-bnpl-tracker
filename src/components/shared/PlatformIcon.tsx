import type { PlatformId } from '../../types';

interface PlatformIconProps {
  platformId: PlatformId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function PlatformIcon({ platformId, size = 'md', className = '', style }: PlatformIconProps) {
  const sizeClass = sizeClasses[size];

  // Platform-specific icons (simplified brand-inspired designs)
  switch (platformId) {
    case 'afterpay':
      // Afterpay: Triangle/play button shape
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
        </svg>
      );

    case 'klarna':
      // Klarna: Rounded K shape
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M4 4h4v16H4V4zm8 0c0 3.5-1.5 6.5-4 8.5L16 20h5l-9-9c2-1.5 3.5-4 3.5-7h-3.5z" />
        </svg>
      );

    case 'sezzle':
      // Sezzle: S-curve shape
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M17 7a5 5 0 00-5-5H7v4h5a1 1 0 010 2H7a5 5 0 000 10h5a5 5 0 005-5h-4a1 1 0 01-1 1H7a1 1 0 010-2h5a5 5 0 005-5z" />
        </svg>
      );

    case 'zip':
      // Zip: Lightning bolt
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M13 2L4 14h7v8l9-12h-7V2z" />
        </svg>
      );

    case 'four':
      // Four: Number 4 stylized
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M15 2v11h3v3h-3v6h-4v-6H4v-3l7-11h4zm-4 4.5L7.5 13H11V6.5z" />
        </svg>
      );

    case 'affirm':
      // Affirm: Checkmark in circle
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );

    default:
      // Default: Dollar sign in circle
      return (
        <svg className={`${sizeClass} ${className}`} viewBox="0 0 24 24" fill="currentColor" style={style}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-1h-2v-2h4v-1h-3a1 1 0 01-1-1V9a1 1 0 011-1h1V7h2v1h2v2h-4v1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1v1z" />
        </svg>
      );
  }
}
