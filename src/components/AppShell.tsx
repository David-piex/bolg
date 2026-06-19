import Link from "next/link";
import type { ReactNode } from "react";
import { Film, Home, Images, KeyRound, LayoutDashboard, MessageSquareText } from "lucide-react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";

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
  const navItems = [
    { href: `/${locale}`, label: dictionary.nav.home, icon: <Home size={iconSize} /> },
    { href: `/${locale}/posts`, label: dictionary.nav.posts, icon: <MessageSquareText size={iconSize} /> },
    { href: `/${locale}/albums`, label: dictionary.nav.albums, icon: <Images size={iconSize} /> },
    { href: `/${locale}/videos`, label: dictionary.nav.videos, icon: <Film size={iconSize} /> },
    { href: `/${locale}/login`, label: dictionary.nav.login, icon: <KeyRound size={iconSize} /> },
    { href: `/${locale}/admin`, label: dictionary.nav.admin, icon: <LayoutDashboard size={iconSize} /> }
  ];

  return (
    <div className={`site-shell site-shell-${locale}`}>
      <header className="topbar">
        <Link href={`/${locale}`} className="brand" aria-label={dictionary.nav.home}>
          <span className="brand-mark">绫</span>
          <span className="brand-text">绫奈</span>
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
