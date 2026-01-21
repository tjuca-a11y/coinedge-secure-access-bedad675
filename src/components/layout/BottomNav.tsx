import React from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Wallet, ArrowUpDown, Activity, Settings } from "lucide-react";

const navItems = [
  { title: "Wallet", url: "/wallet", icon: Wallet },
  { title: "Send", url: "/send", icon: ArrowUpDown },
  { title: "Activity", url: "/activity", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom safe-area-left safe-area-right">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors no-tap-highlight active:scale-95 ${
              isActive(item.url)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
