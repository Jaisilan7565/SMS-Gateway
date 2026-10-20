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
  good: 'border-brand-600/40 text-brand-700 bg-brand-50',
  warn: 'border-[#D9922B]/40 text-[#B26B00] bg-[#FEF7EC]',
  bad: 'border-[#E0566A]/40 text-[#C0283C] bg-[#FDF0F1]',
  info: 'border-[#6B83E6]/40 text-[#3B5BDB] bg-[#F1F4FD]',
  sim1: 'border-blue-500/30 text-blue-700 bg-blue-50 font-medium',
  sim2: 'border-purple-500/30 text-purple-700 bg-purple-50 font-medium',
  off: 'border-line-strong text-muted bg-panel'
};

export const StatusBadge = ({ tone = 'good', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[12px] font-medium leading-5 ${STATUS_BADGE[tone] || STATUS_BADGE.off} ${className}`}
  >
    {children}
  </span>
);
