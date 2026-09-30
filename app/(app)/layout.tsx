"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { clearToken } from "@/lib/api-client";

const NAV = [
  { href: "/tenants", label: "Tenants", icon: Building2 },
  { href: "/audit", label: "Journal", icon: ClipboardList },
];

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <h1 className="font-bold text-lg" style={{ color: "#C9A84C" }}>
          Orpailleur
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Pilot</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Icon size={16} />
              {label}
              {active && (
                <ChevronRight size={12} className="ml-auto text-amber-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 w-full transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
