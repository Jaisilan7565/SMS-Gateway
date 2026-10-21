import React from 'react';
import { motion } from 'framer-motion';
import { rise, spring } from '../../utils/motion';

/** White widget card — r=20px, 20px padding, no visible border (depth comes from layering) */
export const Card = ({ children, className = '', as = 'div', ...props }) => {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      variants={rise}
      className={`rounded-[20px] bg-card p-5 shadow-[0_1px_2px_rgba(17,20,18,0.03)] border border-line ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

/** Card heading — 17px, medium weight, ink */
export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-[17px] font-medium text-ink tracking-tight ${className}`}>{children}</h3>
);

const BUTTON = {
  primary: 'btn-primary shadow-[0_6px_16px_-8px_var(--brand-900)]',
  outline: 'bg-card text-ink border border-line-strong hover:bg-brand-50 hover:border-brand-600',
  ghost: 'text-ink-2 hover:bg-brand-50 hover:text-brand-900',
  danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
  light: 'bg-white text-brand-950 hover:bg-brand-50'
};

const BUTTON_SIZE = {
  sm: 'h-8 px-3.5 text-[13px] gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-[46px] px-6 text-[15px] gap-2.5'
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  disabled = false,
  ...props
}) => (
  <motion.button
    type={type}
    disabled={disabled}
    whileTap={{ scale: disabled ? 1 : 0.97 }}
    transition={spring.snappy}
    className={`inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON[variant]} ${BUTTON_SIZE[size]} ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);

/** Circular outlined icon button */
export const CircleIconButton = ({ children, dark = false, className = '', ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={spring.snappy}
    className={`grid place-items-center w-8 h-8 rounded-full transition-colors ${
      dark
        ? 'bg-white/10 text-white hover:bg-white/20'
        : 'border border-line-strong text-ink hover:bg-brand-50 hover:text-brand-700'
    } ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);

/** Small status chip */
export const DeltaChip = ({ value, dark = false }) => (
  <span
    className={`inline-flex items-center gap-0.5 rounded-[5px] border px-1.5 py-0.5 text-[11px] leading-[14px] tnum ${
      dark ? 'border-white/30 text-white/90 bg-white/5' : 'border-line-strong text-muted bg-panel'
    }`}
  >
    {value}
  </span>
);

/** Outlined status badge pills */
const STATUS_BADGE = {
  good: 'border-brand-600/40 text-brand-700 bg-brand-50 font-medium',
  warn: 'border-[#D9922B]/40 text-[#B26B00] bg-[#FEF7EC] font-medium',
  bad: 'border-[#E0566A]/40 text-[#C0283C] bg-[#FDF0F1] font-medium',
  info: 'border-[#6B83E6]/40 text-[#3B5BDB] bg-[#F1F4FD] font-medium',
  sim1: 'border-blue-500/30 text-blue-700 bg-blue-50 font-medium',
  sim2: 'border-purple-500/30 text-purple-700 bg-purple-50 font-medium',
  off: 'border-line-strong text-muted bg-panel',
  offline: 'border-line-strong text-muted bg-panel/80',
  logged_out: 'border-amber-500/40 text-amber-800 bg-amber-50 font-medium'
};

export const StatusBadge = ({ tone = 'good', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[12px] font-medium leading-5 ${STATUS_BADGE[tone] || STATUS_BADGE.off} ${className}`}
  >
    {children}
  </span>
);

/** Shimmer Table Row Skeleton */
export const TableSkeleton = ({ cols = 5, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rIdx) => (
      <tr key={rIdx} className="animate-pulse border-b border-line">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <td key={cIdx} className="py-4 px-4">
            <div
              className="h-3.5 rounded-full bg-black/6 dark:bg-white/10"
              style={{
                width: `${40 + ((rIdx * 17 + cIdx * 29) % 50)}%`
              }}
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Shimmer Card Box Skeleton */
export const CardSkeleton = ({ count = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="p-4 rounded-2xl bg-panel border border-line animate-pulse space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-black/7 dark:bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-black/5 dark:bg-white/10" />
        </div>
        <div className="h-3.5 w-4/5 rounded bg-black/5 dark:bg-white/8" />
        <div className="h-3 w-1/2 rounded bg-black/4 dark:bg-white/6" />
      </div>
    ))}
  </div>
);

/** Modern Loading Spinner */
export const LoadingSpinner = ({ size = 'md', label = 'Loading...', className = '' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}>
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-full border-2 border-brand-200 border-t-brand-700 animate-spin`}
      />
      {label && <span className="text-[13px] text-muted font-medium">{label}</span>}
    </div>
  );
};
