"use client";

import dynamic from "next/dynamic";
import type { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/routing";

type Dictionary = ReturnType<typeof getDictionary>;

const DynamicAdminPanel = dynamic(
  () => import("@/components/AdminPanel").then((module) => module.AdminPanel),
  {
    loading: () => (
      <section className="locked-state">
        <div>
          <h2>正在加载内容管理</h2>
        </div>
      </section>
    ),
    ssr: false
  }
);

export function AdminPanelLazy({ dictionary, locale }: { dictionary: Dictionary; locale: Locale }) {
  return <DynamicAdminPanel dictionary={dictionary} locale={locale} />;
}
