import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

// Store listing links. Each stays empty until that store version is published;
// its button remains disabled while the value is empty.
const IOS_APP_STORE_URL: string = import.meta.env.VITE_IOS_APP_STORE_URL || '';
const PLAY_STORE_URL: string = import.meta.env.VITE_PLAY_STORE_URL || '';

// Store badges served from public/store-badges/. The Google Play badge is
// Google's official English artwork; the App Store badge is the supplied
// "Download on the App Store" artwork with its background removed.
const GOOGLE_PLAY_BADGE = `${import.meta.env.BASE_URL || '/'}store-badges/google-play-badge-en.png`;
const APP_STORE_BADGE = `${import.meta.env.BASE_URL || '/'}store-badges/app-store-badge-en.png`;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

// Chrome fires beforeinstallprompt once, possibly before the landing page mounts,
// so capture it at module load and notify any mounted buttons.
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let appInstalledThisSession = false;
const installListeners = new Set<() => void>();
const notifyInstallListeners = () => installListeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    notifyInstallListeners();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    appInstalledThisSession = true;
    notifyInstallListeners();
  });
}

const isInstalledApp = () =>
  appInstalledThisSession ||
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const detectDevice = () => {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as Mac, so check for touch support too.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  return { isIOS, isAndroid };
};

// Renders either the store's official badge image or an icon with a label.
const InstallButton = ({
  label,
  icon,
  badge,
  href,
  disabledTitle,
}: {
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  href?: string;
  disabledTitle: string;
}) => {
  const content = badge ? (
    <img src={badge} alt={label} className="cmg-install-badge" draggable={false} />
  ) : (
    <>
      {icon}
      <span>{label}</span>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="cmg-install-btn"
      aria-label={label}
    >
      {content}
    </a>
  ) : (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title={disabledTitle}
      aria-label={`${label} (${disabledTitle})`}
      className="cmg-install-btn"
    >
      {content}
    </button>
  );
};

const InstallAppOptions: React.FC = () => {
  const [installed, setInstalled] = useState(() => isInstalledApp());
  const [helpOpen, setHelpOpen] = useState(false);
  const device = detectDevice();

  useEffect(() => {
    const update = () => setInstalled(isInstalledApp());
    installListeners.add(update);
    return () => {
      installListeners.delete(update);
    };
  }, []);

  // The native Capacitor apps are distributed through the stores, so the
  // landing page offers no install buttons inside them. The row stays visible
  // on the web even when the web app is installed; only Install Web App is disabled.
  if (Capacitor.isNativePlatform()) return null;

  const iosEnabled = device.isIOS && IOS_APP_STORE_URL !== '';
  const playEnabled = device.isAndroid && PLAY_STORE_URL !== '';

  const installWebApp = async () => {
    const prompt = deferredInstallPrompt;
    if (!prompt) {
      // Browsers without a native prompt (iOS Safari, or Chrome before it is
      // eligible) get step-by-step instructions instead.
      setHelpOpen(true);
      return;
    }
    // An install prompt can only be shown once.
    deferredInstallPrompt = null;
    await prompt.prompt();
    await prompt.userChoice;
  };

  return (
    <>
      <div className="cmg-install-row" role="group" aria-label="Install options">
        <InstallButton
          label="App Store"
          badge={APP_STORE_BADGE}
          href={iosEnabled ? IOS_APP_STORE_URL : undefined}
          disabledTitle={device.isIOS ? 'Coming soon' : 'Available on iPhone'}
        />
        <InstallButton
          label="Google Play"
          badge={GOOGLE_PLAY_BADGE}
          href={playEnabled ? PLAY_STORE_URL : undefined}
          disabledTitle={device.isAndroid ? 'Coming soon' : 'Available on Android'}
        />
        <button
          type="button"
          onClick={installWebApp}
          disabled={installed}
          aria-disabled={installed}
          title={installed ? 'Already installed on this device' : 'Install Web App'}
          aria-label={installed ? 'Install Web App (already installed)' : 'Install Web App'}
          className="cmg-install-btn"
        >
          <Download size={22} aria-hidden />
          <span>Install Web App</span>
        </button>
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
          role="presentation"
          onClick={() => setHelpOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-help-title"
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-left text-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="install-help-title" className="text-lg font-black text-slate-900">
                Install Christian Match Ghana
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close"
                className="p-1 text-slate-400"
              >
                <X size={22} />
              </button>
            </div>
            {device.isIOS ? (
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm font-semibold">
                <li>
                  In Safari, tap the Share button <Share size={16} className="inline align-text-bottom" aria-hidden />.
                </li>
                <li>Scroll down and tap "Add to Home Screen".</li>
                <li>Tap "Add" to confirm.</li>
              </ol>
            ) : (
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm font-semibold">
                <li>Open your browser menu.</li>
                <li>Tap "Install app" or "Add to Home screen".</li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppOptions;
