"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Film, Home, Images, KeyRound, LayoutDashboard, MessageSquareText, UserRound } from "lucide-react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { canManage } from "@/domain/membership";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";
import { useAppState } from "@/state/AppStateProvider";

type Dictionary = ReturnType<typeof getDictionary>;

const iconSize = 17;

export function AppShell({
  children,
  locale,
  dictionary
}: {
  children: ReactNode;
  locale: Locale;
  dictionary: Dictionary;
}) {
  const { currentUser, siteSettings } = useAppState();
  const canOpenAdmin = canManage(
    currentUser
      ? {
          disabled: currentUser.disabled,
          isAdmin: currentUser.isAdmin,
          level: currentUser.level
        }
      : null
  );
  const navItems = [
    { href: `/${locale}`, label: dictionary.nav.home, icon: <Home size={iconSize} /> },
    { href: `/${locale}/posts`, label: dictionary.nav.posts, icon: <MessageSquareText size={iconSize} /> },
    { href: `/${locale}/albums`, label: dictionary.nav.albums, icon: <Images size={iconSize} /> },
    { href: `/${locale}/videos`, label: dictionary.nav.videos, icon: <Film size={iconSize} /> },
    {
      href: currentUser ? `/${locale}/account` : `/${locale}/login`,
      label: currentUser ? dictionary.nav.account : dictionary.nav.login,
      icon: currentUser ? <UserRound size={iconSize} /> : <KeyRound size={iconSize} />
    },
    ...(canOpenAdmin
      ? [{ href: `/${locale}/admin`, label: dictionary.nav.admin, icon: <LayoutDashboard size={iconSize} /> }]
      : [])
  ];

  return (
    <div className={`site-shell site-shell-${locale}`}>
      <header className="topbar">
        <Link href={`/${locale}`} className="brand" aria-label={dictionary.nav.home}>
          <span className="brand-mark" aria-hidden="true">{siteSettings.logoMark}</span>
          <span className="brand-copy">
            <span className="brand-text">{siteSettings.logoText}</span>
            <span className="brand-subtext">{siteSettings.siteName}</span>
          </span>
        </Link>
        <nav className="nav-list" aria-label={dictionary.nav.primary}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <LanguageSwitch locale={locale} dictionary={dictionary} />
      </header>
      <main>{children}</main>
    </div>
  );
}
