import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Inbox, 
  BarChart3, 
  Users, 
  Plus, 
  Settings, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  onNewRequest: () => void;
}

export default function Sidebar({ onNewRequest }: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
    { href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-analytics" },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-73px)] p-4">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <a 
                className={`sidebar-link ${isActive ? "active" : "text-muted-foreground"}`}
                data-testid={item.testId}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}

        <Separator className="my-4" />
        
        <div className="pt-2">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-primary hover:bg-secondary" 
            onClick={onNewRequest}
            data-testid="button-quick-new-request"
          >
            <Plus className="w-5 h-5 mr-3" />
            New Request
          </Button>
        </div>

        <Separator className="my-4" />
        
        <div className="pt-2 space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground" 
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground" 
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </Button>
        </div>
      </nav>
    </aside>
  );
}
