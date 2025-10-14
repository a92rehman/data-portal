import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Inbox, 
  BarChart3, 
  Users, 
  Plus,
  ClipboardCheck,
  FileText,
  ListTodo,
  ClipboardList
} from "lucide-react";

interface SidebarProps {
  onNewRequest: () => void;
  user?: any;
}

export default function Sidebar({ onNewRequest, user }: SidebarProps) {
  const [location] = useLocation();

  // Role-specific navigation items
  const getNavItems = () => {
    const role = user?.role;
    
    if (role === "team_lead") {
      // Data Lead - Full access
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-my-requests" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-tasks" },
        { href: "/pending-reviews", icon: ClipboardCheck, label: "Pending Reviews", testId: "nav-pending-reviews" },
        { href: "/all-requests", icon: FileText, label: "All Requests", testId: "nav-all-requests" },
        { href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-analytics" },
        { href: "/team", icon: Users, label: "Team Management", testId: "nav-team" },
      ];
    } else if (role === "analyst") {
      // Analyst - Moderate access
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-my-requests" },
        { href: "/request-assignments", icon: ClipboardList, label: "Request Assignments", testId: "nav-request-assignments" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-tasks" },
      ];
    } else {
      // Requester - Limited access
      return [
        { href: "/", icon: LayoutDashboard, label: "My Requests", testId: "nav-dashboard" },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r-2 border-purple-200 dark:border-purple-700 min-h-[calc(100vh-73px)] p-4 shadow-md">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`sidebar-link ${isActive ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
              data-testid={item.testId}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {(user?.role === "requester" || user?.role === "team_lead" || user?.role === "analyst") && (
          <>
            <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
            
            <div className="pt-2">
              <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
                Quick Actions
              </p>
              <Link href="/requests/new">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gradient-button-secondary font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40" 
                  data-testid="button-quick-new-request"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  New Data Request
                </Button>
              </Link>
            </div>
          </>
        )}

      </nav>
    </aside>
  );
}
