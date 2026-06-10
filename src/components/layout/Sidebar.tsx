"use client";
import { cn } from "@/lib/utils";
import { Shield, Activity, History, Settings, FileText, Bell, ChevronRight, Zap } from "lucide-react";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const NAV_ITEMS = [
  { id: "scanner",   icon: Zap,      label: "Scanner",   badge: null },
  { id: "dashboard", icon: Activity, label: "Dashboard", badge: null },
  { id: "history",   icon: History,  label: "Scan History", badge: "3" },
  { id: "reports",   icon: FileText, label: "Reports",   badge: null },
  { id: "alerts",    icon: Bell,     label: "Alerts",    badge: "2" },
  { id: "settings",  icon: Settings, label: "Settings",  badge: null },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-bold text-base tracking-tight">SecureApp</p>
            <p className="text-slate-500 text-xs">Security Scanner</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label, badge }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group cursor-pointer",
                active
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-xs font-semibold",
                  active ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-700 text-slate-300"
                )}>
                  {badge}
                </span>
              )}
              {active && <ChevronRight className="w-3 h-3 text-cyan-400" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-slate-700 rounded-xl p-4">
          <p className="text-white text-xs font-semibold mb-1">Pro Plan</p>
          <p className="text-slate-400 text-xs mb-3">Unlimited scans, API access, CI/CD integration</p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full">
            <div className="h-full w-2/3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
          </div>
          <p className="text-slate-500 text-xs mt-1.5">6 of 10 scans used this month</p>
        </div>
      </div>
    </aside>
  );
}
