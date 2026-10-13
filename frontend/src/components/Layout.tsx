
/**
 * APP LAYOUT SHELL
 * Provides the mobile-first viewport container and the unified navigation bar.
 * Responsibilities: View routing trigger, Responsive constraints, Conditional Nav visibility.
 */

import React, { useEffect, useState } from 'react';
import { ViewState } from '../types';
import { Flame, MessageCircle, User, HeartHandshake, Bot, Users, ArrowLeft, LogOut } from 'lucide-react';


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
  const shouldShowNav = !hideNav && !['AUTH', 'ONBOARDING'].includes(currentView);


  return (
    <div className="flex justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden sm:rounded-3xl sm:h-[92vh] sm:my-6 sm:border sm:border-gray-200">
        
        {/* Global escape controls, matching the mobile app pattern: a back
            arrow on the left and an icon-only logout action on the right. */}
        {shouldShowNav && (onBack || onLogout) && (
          <div className="absolute top-3 left-3 right-3 z-[200] flex items-center justify-between pointer-events-none">
            {onBack ? (
              <button
                type="button"
                title={currentView === 'BROWSE' ? 'Already at home' : 'Back'}
                aria-label={currentView === 'BROWSE' ? 'Already at home' : 'Back'}
                onClick={onBack}
                disabled={currentView === 'BROWSE'}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-brand-blue shadow-lg border border-gray-100 disabled:opacity-40"
              >
                <ArrowLeft size={21} />
              </button>
            ) : <span />}
            {onLogout && (
              <button
                type="button"
                title="Log out"
                aria-label="Log out"
                onClick={onLogout}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg"
              >
                <LogOut size={19} />
              </button>
            )}
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto bg-white hide-scrollbar relative">
          {children}
        </main>

        {/* Persistent Bottom Tab Bar */}
        {shouldShowNav && (
          <nav className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-end z-50 pb-8 shrink-0">
            <NavButton 
              active={currentView === 'FRIENDS'} 
              onClick={() => onChangeView('FRIENDS')} 
              icon={<Users size={24} />} 
              label="Connect" 
            />
            <NavButton 
              active={currentView === 'COMMUNITY'} 
              onClick={() => onChangeView('COMMUNITY')} 
              icon={<HeartHandshake size={24} />} 
              label="Wall" 
            />
            
            {/* Center Discovery Action Button */}
            <button 
              title="Browse"
              onClick={() => onChangeView('BROWSE')}
              className={`-translate-y-4 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
                currentView === 'BROWSE' 
                  ? 'bg-brand-orange text-white shadow-brand-orange/40 scale-110' 
                  : 'bg-brand-blue text-white'
              }`}
            >
              <Flame size={32} />
            </button>

            <NavButton 
              active={currentView === 'CHAT'} 
              onClick={() => onChangeView('CHAT')} 
              icon={<MessageCircle size={24} />} 
              label="Inbox" 
            />
            <NavButton 
              active={currentView === 'PROFILE'} 
              onClick={() => onChangeView('PROFILE')} 
              icon={<User size={24} />} 
              label="Me" 
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
    className={`flex flex-col items-center gap-1 transition-all duration-200 ${active ? 'text-brand-orange scale-110' : 'text-gray-400 hover:text-gray-600'}`}
  >
    {icon}
    <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
  </button>
);

export default Layout;
