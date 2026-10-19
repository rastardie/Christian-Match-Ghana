
/**
 * APP LAYOUT SHELL
 * Provides the mobile-first viewport container and the unified navigation bar.
 * Responsibilities: View routing trigger, Responsive constraints, Conditional Nav visibility.
 */

import React, { useRef, useState } from 'react';
import { ViewState } from '../types';
import { Compass, MessageCircle, User, Heart, Bell, RotateCcw, Power, ArrowLeft, ShieldCheck } from 'lucide-react';
import Logo from './Logo';


interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onNotifications?: () => void;
  onRefresh?: () => void;
  onAdmin?: () => void;
  isSystemAdmin?: boolean;
  hideNav?: boolean; 
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onBack, onLogout, onNotifications, onRefresh, onAdmin, isSystemAdmin, hideNav }) => {
  // Navigation is hidden during auth, onboarding, and specific deep-view states (like active calls)
  const shouldShowNav = !hideNav && !['AUTH', 'ONBOARDING', 'EDIT_PROFILE'].includes(currentView);
  const shouldShowMainHeader = shouldShowNav && currentView !== 'PROFILE' && currentView !== 'ADMIN';
  const [ribbonScrolling, setRibbonScrolling] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const userScrollIntentRef = useRef(false);
  const ribbonBoundaryTimerRef = useRef<number | undefined>(undefined);

  const setOperationalChromeState = (scrolled: boolean) => {
    window.clearTimeout(ribbonBoundaryTimerRef.current);
    if (scrolled) {
      setRibbonScrolling(true);
      return;
    }
    // Delay boundary restoration slightly so a hard swipe/bounce cannot toggle
    // the header and ribbons repeatedly while their transitions are running.
    ribbonBoundaryTimerRef.current = window.setTimeout(() => {
      setRibbonScrolling(false);
    }, 180);
  };

  const armUserScroll = () => {
    userScrollIntentRef.current = true;
  };

  const revealOperationalChrome = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    userScrollIntentRef.current = false;
    window.clearTimeout(ribbonBoundaryTimerRef.current);
    setRibbonScrolling(false);
  };

  const handleMainScroll = (event: React.UIEvent<HTMLElement>) => {
    const scrollingTarget = event.target as HTMLElement;

    // Only the true top restores the operational chrome. Reaching the bottom
    // must not bring banners/menu back over the content.
    if (scrollingTarget.scrollTop <= 2) {
      setOperationalChromeState(false);
      return;
    }

    // Ignore initial layout/browser-restoration scroll events. Only a genuine
    // user gesture may move the operational chrome away.
    if (userScrollIntentRef.current && scrollingTarget.scrollTop > 2) {
      setOperationalChromeState(true);
    }
  };

  const frameClassName = `cmg-app-frame cmg-view-surface w-full max-w-md h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden sm:rounded-[2rem] sm:h-[92vh] sm:my-6 sm:border sm:border-white/70 ${ribbonScrolling ? 'is-ribbon-scrolling' : ''}`;

  return (
    <div className="cmg-app-backdrop flex justify-center min-h-screen font-sans">
      <div
        data-view={currentView}
        onScrollCapture={handleMainScroll}
        onWheel={armUserScroll}
        onTouchMove={armUserScroll}
        onPointerDown={armUserScroll}
        className={frameClassName}
      >
        {/* Shared top bar: balanced left action, centered logo, and right action. */}
        {shouldShowMainHeader && (
          <header className="cmg-main-header shrink-0 relative z-30 px-5 cmg-safe-top">
            <div className="cmg-main-header__grid">
              <div className="cmg-main-header__side cmg-main-header__side--left">
                {onBack && currentView !== 'BROWSE' && !hideNav && (
                  <button
                    type="button"
                    title="Back"
                    aria-label="Back"
                    onClick={onBack}
                    className="cmg-main-icon-button"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {onRefresh && (
                  <button
                    type="button"
                    title="Refresh"
                    aria-label="Refresh"
                    onClick={onRefresh}
                    className="cmg-main-icon-button"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
              </div>
              <Logo size={160} className="cmg-main-header__logo drop-shadow-lg rounded-full" />
              <div className="cmg-main-header__side cmg-main-header__side--right">
                {onNotifications && (
                  <button
                    type="button"
                    title="Notifications"
                    aria-label="Notifications"
                    onClick={onNotifications}
                    className="cmg-main-icon-button"
                  >
                    <Bell size={18} />
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    title="Log out"
                    aria-label="Log out"
                    onClick={() => setShowLogoutDialog(true)}
                    className="cmg-main-icon-button"
                  >
                    <Power size={18} />
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Scrollable view area with a base ribbon overlay that content scrolls beneath. */}
        <div className="flex-1 relative overflow-hidden">
          <main onScroll={handleMainScroll} className="h-full overflow-y-auto bg-transparent hide-scrollbar relative">
            {children}
          </main>
        </div>

        {/* Bottom colored ribbon spans to the very bottom of the frame so the
            translucent nav bar floats on top of it. */}
        {shouldShowNav && (
          <div
            aria-hidden
            data-view={currentView}
            className="cmg-nav-bottom-ribbon pointer-events-none absolute inset-x-0 bottom-0 z-10"
          ></div>
        )}

        {/* Persistent bottom tab bar — professional pill-indicator layout.
            Height is driven by .cmg-bottom-nav padding (safe-area aware) so it stays
            compact on normal screens and clears the home indicator on notched phones. */}
        {shouldShowNav && (
          <nav
            onPointerDown={revealOperationalChrome}
            onClick={revealOperationalChrome}
            className="cmg-bottom-nav flex items-center justify-around px-3 z-50 shrink-0"
          >
            <NavButton
              active={currentView === 'BROWSE'}
              onClick={() => onChangeView('BROWSE')}
              icon={<Compass size={20} />}
              label="Discover"
            />
            <NavButton
              active={currentView === 'FRIENDS'}
              onClick={() => onChangeView('FRIENDS')}
              icon={<Heart size={20} />}
              label="Likes"
            />
            <NavButton
              active={currentView === 'CHAT'}
              onClick={() => onChangeView('CHAT')}
              icon={<MessageCircle size={20} />}
              label="Messages"
            />
            <NavButton
              active={currentView === 'PROFILE'}
              onClick={() => onChangeView('PROFILE')}
              icon={<User size={20} />}
              label="Profile"
            />
            {isSystemAdmin && onAdmin && (
              <NavButton
                active={false}
                onClick={onAdmin}
                icon={<ShieldCheck size={20} />}
                label="Admin"
              />
            )}
          </nav>
        )}

        {showLogoutDialog && onLogout && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={() => setShowLogoutDialog(false)}>
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" onClick={(event) => event.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
                <Power size={26} />
              </div>
              <h2 id="logout-dialog-title" className="text-xl font-black text-slate-900">Sign out?</h2>
              <p className="mt-2 text-sm text-slate-600">Are you sure you want to sign out of Christian Match Ghana?</p>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowLogoutDialog(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => { setShowLogoutDialog(false); onLogout(); }} className="flex-1 rounded-xl bg-brand-orange px-4 py-3 text-sm font-black text-white transition hover:brightness-95">Sign out</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Navigation Link Component — pill-highlighted active state.
const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className="group relative flex flex-1 flex-col items-center gap-1 py-0.5"
  >
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
        active
          ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 scale-105'
          : 'text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600'
      }`}
    >
      {icon}
    </span>
    <span
      className={`text-[10px] tracking-tight transition-colors ${
        active ? 'font-black text-brand-orange' : 'font-black text-gray-400 group-hover:text-gray-600'
      }`}
    >
      {label}
    </span>
  </button>
);

export default Layout;
