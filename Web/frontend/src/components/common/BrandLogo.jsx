import React from 'react';

export const BrandLogo = ({ size = 36, className = '' }) => {
  return (
    <div
      className={`relative grid place-items-center rounded-2xl bg-brand-900 border border-brand-700/40 shadow-sm shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--brand-900, #0D3A23)'
      }}
    >
      <img
        src="/favicon.svg"
        alt="SMS Gateway Logo"
        className="w-full h-full object-contain p-0.5"
      />
    </div>
  );
};

export default BrandLogo;
