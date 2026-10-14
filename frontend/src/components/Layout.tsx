
/**
 * APP LAYOUT SHELL
 * Provides the mobile-first viewport container and the unified navigation bar.
 * Responsibilities: View routing trigger, Responsive constraints, Conditional Nav visibility.
 */

import React, { useEffect, useState } from 'react';
import { ViewState } from '../types';
import { Compass, MessageCircle, User, Heart, LogOut } from 'lucide-react';
import Logo from './Logo';


interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onBack?: () => void;
  onLogout?: () => void;
  hideNav?: boolean; 
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, onBack, onLogout, hideNav }) => {
  // Navigation is hidden during auth, onboarding, and specific deep-view states (like active calls)
  const shouldShowNav = !hideNav && !['AUTH', 'ONBOARDING', 'EDIT_PROFILE'].includes(currentView);


  return (
    <div className="cmg-app-backdrop flex justify-center min-h-screen font-sans">
      <div data-view={currentView} className="cmg-app-frame cmg-view-surface w-full max-w-md h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden sm:rounded-[2rem] sm:h-[92vh] sm:my-6 sm:border sm:border-white/70">
        
        {/* Shared fixed header: centered brand logo (does not scroll). Profile
            renders its own header with settings, so it is excluded here. */}
        {shouldShowNav && currentView !== 'PROFILE' && (
          <div className="shrink-0 relative z-30 px-5 pt-5 pb-2">
            <div className="relative flex items-center justify-center">
              <Logo size={60} className="drop-shadow-lg rounded-full" />
              {onLogout && (
                <button
                  type="button"
                  title="Log out"
                  aria-label="Log out"
                  onClick={onLogout}
                  className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-blue shadow-lg border border-gray-100 active:scale-90 transition-transform hover:bg-white"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable view area with a base ribbon overlay that content scrolls beneath. */}
        <div className="flex-1 relative overflow-hidden">
          <main className="h-full overflow-y-auto bg-transparent hide-scrollbar relative">
            {children}
          </main>
          {shouldShowNav && currentView !== 'PROFILE' && (
            <div
              aria-hidden
              data-view={currentView}
              className="cmg-nav-bottom-ribbon pointer-events-none absolute inset-x-0 bottom-0 z-20"
            ></div>
          )}
        </div>

        {/* Persistent Bottom Tab Bar — flat four-tab layout from the reference UI. */}
        {shouldShowNav && (
          <nav className="cmg-bottom-nav bg-white border-t border-gray-100 px-5 py-3 flex justify-around items-center z-50 pb-8 shrink-0">
            <NavButton
              active={currentView === 'BROWSE'}
              onClick={() => onChangeView('BROWSE')}
              icon={<Compass size={24} />}
              label="Discover"
            />
            <NavButton
              active={currentView === 'FRIENDS'}
              onClick={() => onChangeView('FRIENDS')}
              icon={<Heart size={24} />}
              label="Likes"
            />
            <NavButton
              active={currentView === 'CHAT'}
              onClick={() => onChangeView('CHAT')}
              icon={<MessageCircle size={24} />}
              label="Messages"
            />
            <NavButton
              active={currentView === 'PROFILE'}
              onClick={() => onChangeView('PROFILE')}
              icon={<User size={24} />}
              label="Profile"
            />
          </nav>
        )}
      </div>
    </div>
  );
};

// Reusable Navigation Link Component
const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-200 ${active ? 'text-brand-orange' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <span className={`flex h-7 items-center justify-center ${active ? 'scale-110' : ''} transition-transform`}>{icon}</span>
    <span className={`text-[10px] tracking-tight ${active ? 'font-black' : 'font-bold'}`}>{label}</span>
  </button>
);

export default Layout;
