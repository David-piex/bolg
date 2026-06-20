"use client";

import dynamic from "next/dynamic";
import type { getDictionary } from "@/i18n/dictionaries";

type Dictionary = ReturnType<typeof getDictionary>;

const DynamicAdminPanel = dynamic(
  () => import("@/components/AdminPanel").then((module) => module.AdminPanel),
  {
    loading: () => (
      <section className="locked-state">
        <div>
          <h2>正在加载后台</h2>
        </div>
      </section>
    ),
    ssr: false
  }
);

export function AdminPanelLazy({ dictionary }: { dictionary: Dictionary }) {
  return <DynamicAdminPanel dictionary={dictionary} />;
}
