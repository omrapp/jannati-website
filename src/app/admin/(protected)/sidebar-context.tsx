'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Identifies a single open submenu by its position in `NAV_GROUPS` in
 * `admin-sidebar.tsx` — nothing in this step actually has a submenu (every
 * current route is a flat link), but the shape is here so a later nav item
 * with children doesn't need a context rewrite, just a consumer. */
type OpenSubmenu = { group: number; item: number } | null;

type SidebarContextValue = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  openSubmenu: OpenSubmenu;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsMobileOpen: (open: boolean) => void;
  setIsHovered: (hovered: boolean) => void;
  toggleSubmenu: (group: number, item: number) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

// Desktop expand/collapse preference only — `isMobileOpen`/`isHovered` are
// transient interaction state, never worth persisting across reloads.
const STORAGE_KEY = 'jannati-admin-sidebar-expanded';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<OpenSubmenu>(null);

  // Reading localStorage during the initial render would desync from the
  // server-rendered markup (SSR has no localStorage, so it always assumes
  // expanded) — so this stays a post-mount effect, not a lazy useState
  // initializer, and the first paint briefly shows the default before
  // correcting. That's exactly what `react-hooks/set-state-in-effect`
  // normally flags as "compute it during render instead" — but there's no
  // render-time value to compute here, this synchronizes React state with
  // an external system (`localStorage`) that only exists client-side, the
  // textbook case the rule itself carves out.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setIsExpanded(stored === 'true');
    } catch {
      // Storage can throw (private mode, disabled site data) — default
      // (expanded) stands.
    }
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Non-fatal — the toggle still works for this session.
      }
      return next;
    });
  };

  const toggleMobileSidebar = () => setIsMobileOpen((prev) => !prev);

  const toggleSubmenu = (group: number, item: number) => {
    setOpenSubmenu((prev) => (prev && prev.group === group && prev.item === item ? null : { group, item }));
  };

  return (
    <SidebarContext.Provider
      value={{
        isExpanded,
        isMobileOpen,
        isHovered,
        openSubmenu,
        toggleSidebar,
        toggleMobileSidebar,
        setIsMobileOpen,
        setIsHovered,
        toggleSubmenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}
