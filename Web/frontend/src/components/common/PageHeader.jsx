import React from 'react';
import { motion } from 'framer-motion';
import { rise } from '../../utils/motion';

export const PageHeader = ({ title, subtitle, actions, className = '' }) => (
  <motion.div
    variants={rise}
    className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 max-w-full ${className}`}
  >
    <div className="min-w-0 flex-1">
      <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[26px] font-bold text-ink tracking-tight break-words">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[12px] sm:text-[13px] text-muted mt-0.5 leading-snug break-words">
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2 flex-wrap max-w-full mt-1 sm:mt-0">
        {actions}
      </div>
    )}
  </motion.div>
);

export default PageHeader;
