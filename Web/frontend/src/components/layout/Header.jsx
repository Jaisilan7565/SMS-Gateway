import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Palette, ShieldCheck, Zap, Menu } from 'lucide-react';
import { setAccentTheme, openPullModal, toggleMobileMenu } from '../../store/slices/uiSlice';
import { Button } from '../common/ui';
import BrandLogo from '../common/BrandLogo';

const THEMES = [
  { id: 'forest', label: 'Forest', color: '#145534' },
  { id: 'ocean', label: 'Ocean', color: '#173A7A' },
  { id: 'plum', label: 'Plum', color: '#45207A' },
  { id: 'ember', label: 'Ember', color: '#6E2D12' },
  { id: 'console', label: 'Console', color: '#1F2421' }
];

export const Header = () => {
  const dispatch = useDispatch();
  const accentTheme = useSelector((s) => s.ui.accentTheme);
  const [themeDropdown, setThemeDropdown] = useState(false);

  const activeThemeObj = THEMES.find((t) => t.id === accentTheme) || THEMES[0];

  return (
    <header className="flex items-center justify-between h-14 sm:h-16 px-3.5 sm:px-5 rounded-[24px] sm:rounded-[28px] bg-panel border border-line shadow-card">
      {/* Left: Hamburger & Brand on Mobile; Security Badge on Desktop */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={() => dispatch(toggleMobileMenu())}
          className="lg:hidden p-2 rounded-xl bg-card border border-line text-ink hover:bg-brand-50 transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        {/* Mobile Brand Header with Logo */}
        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <BrandLogo size={28} />
          <span className="font-bold text-[14px] text-ink truncate tracking-tight">
            SMS Gateway
          </span>
        </div>

        {/* Desktop Security & Protocol Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-line text-[12px] text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
          <span className="font-medium text-ink">E2EE Military Guard:</span>
          <span>AES-256-GCM AEAD Protocol</span>
        </div>
      </div>

      {/* Right Actions: Clean, compact on Mobile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Accent Theme Switcher (Compact circle on mobile, text pill on desktop) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setThemeDropdown(!themeDropdown)}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-card border border-line text-[12px] font-medium text-ink-2 hover:bg-brand-50 transition-colors cursor-pointer"
            title="Change Accent Color"
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: activeThemeObj.color }}
            />
            <span className="hidden sm:inline capitalize">{accentTheme}</span>
          </button>

          {themeDropdown && (
            <>
              {/* Invisible click-outside dismisser */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setThemeDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-card border border-line-strong shadow-2xl p-1.5 z-50">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      dispatch(setAccentTheme(t.id));
                      setThemeDropdown(false);
                    }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] font-medium text-left transition-colors cursor-pointer ${
                      accentTheme === t.id
                        ? 'bg-brand-100 text-brand-900 font-semibold'
                        : 'text-ink-2 hover:bg-panel'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: t.color }}
                    />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Global Pull SMS Button (Desktop only; on mobile it's on bottom dock!) */}
        <div className="hidden sm:block">
          <Button
            size="sm"
            onClick={() => dispatch(openPullModal())}
            className="shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Pull SMS Now</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
