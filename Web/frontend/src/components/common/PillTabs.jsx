import React from 'react';
import { motion } from 'framer-motion';
import { spring } from '../../utils/motion';

export const PillTabs = ({ tabs, activeTab, onChange, className = '' }) => (
  <div className={`inline-flex items-center rounded-full bg-panel p-1 border border-line ${className}`}>
    {tabs.map((tab) => {
      const isActive = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors cursor-pointer ${
            isActive ? 'text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {isActive && (
            <motion.div
              layoutId="activePillTab"
              transition={spring.snappy}
              className="absolute inset-0 rounded-full btn-primary"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] tnum ${
                  isActive ? 'bg-white/20 text-white' : 'bg-card text-muted border border-line'
                }`}
              >
                {tab.count}
              </span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);

export default PillTabs;
