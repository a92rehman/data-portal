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
  user?: any;
}

export default function Sidebar({ onNewRequest, user }: SidebarProps) {
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
    ...(user?.role === "data_analyst" ? [{ href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-analytics" }] : []),
  ];

  return (
    <aside className="w-64 bg-white border-r-2 border-purple-200 min-h-[calc(100vh-73px)] p-4 shadow-md">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <a 
                className={`sidebar-link ${isActive ? "gradient-button-primary text-white" : "text-gray-600 hover:bg-purple-50"}`}
                data-testid={item.testId}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </a>
            </Link>
          );
        })}

        <Separator className="my-4 bg-purple-200" />
        
        <div className="pt-2">
          <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Button 
            variant="ghost" 
            className="w-full justify-start gradient-button-secondary font-medium" 
            onClick={onNewRequest}
            data-testid="button-quick-new-request"
          >
            <Plus className="w-5 h-5 mr-3" />
            New Request
          </Button>
        </div>

        <Separator className="my-4 bg-purple-200" />
        
        <div className="pt-2 space-y-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:bg-purple-50 border-2 border-transparent hover:border-purple-200 transition-all" 
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5 mr-3" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:bg-red-50 border-2 border-transparent hover:border-red-200 transition-all" 
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
