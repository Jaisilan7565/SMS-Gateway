import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  icon: TriggerIcon,
  size = 'md',
  className = '',
  menuClassName = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const sizeClasses = {
    sm: 'h-8 px-2.5 text-[12px] rounded-xl gap-1.5',
    md: 'h-11 px-3.5 text-[13.5px] rounded-xl gap-2'
  }[size] || 'h-10 px-3 text-[13px] rounded-xl gap-2';

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between w-full font-medium bg-card border border-line text-ink hover:border-line-strong transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${
          isOpen ? 'border-brand-700 ring-2 ring-brand-700/10' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {TriggerIcon && (
            <TriggerIcon className="w-4 h-4 text-muted shrink-0" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand-700' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 right-0 mt-1.5 z-50 overflow-hidden rounded-2xl bg-card border border-line-strong shadow-lift py-1 max-h-60 overflow-y-auto scrollbar-thin ${menuClassName}`}
            style={{ backgroundColor: 'var(--card, #FDFDFC)' }}
          >
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-center text-[12px] text-muted">
                No options available
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const OptionIcon = opt.icon;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-[12.5px] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50 text-brand-900 font-semibold'
                        : 'text-ink-2 hover:bg-panel hover:text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {OptionIcon && (
                        <OptionIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-brand-700' : 'text-muted'}`} />
                      )}
                      <div className="min-w-0">
                        <div className="truncate">{opt.label}</div>
                        {opt.subtitle && (
                          <div className="text-[11px] text-muted truncate font-normal">
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-brand-700 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
