import { Link, useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Inbox,
  BarChart3,
  Users,
  Plus,
  ListTodo,
  BookOpen,
  Brain,
  LayoutGrid,
  FileText,
  Activity,
  Sparkles,
} from "lucide-react";

interface SidebarProps {
  onNewRequest: () => void;
  user?: any;
}

export default function Sidebar({ onNewRequest, user }: SidebarProps) {
  const [location] = useLocation();

  const role = user?.role;

  // Role-specific core navigation items (no InsightFlow here)
  const getNavItems = () => {
    if (role === "team_lead") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-my-requests" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-tasks" },
        { href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-analytics" },
        { href: "/team", icon: Users, label: "Team Management", testId: "nav-team" },
      ];
    } else if (role === "data_analyst") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-my-requests" },
        { href: "/tasks", icon: ListTodo, label: "My Tasks", testId: "nav-tasks" },
        { href: "/my-analytics", icon: BarChart3, label: "My Analytics", testId: "nav-my-analytics" },
      ];
    } else {
      // Requester
      return [
        { href: "/", icon: LayoutDashboard, label: "My Requests", testId: "nav-dashboard" },
      ];
    }
  };

  // Core analytics/dashboards section (available to all roles)
  const analyticsLinks = [
    { href: "/dashboards/program-delivery", label: "Program Delivery", icon: BarChart3, testId: "nav-program-delivery" },
    { href: "/my-dashboards", label: "My Dashboards", icon: LayoutGrid, testId: "nav-my-dashboards" },
    { href: "/my-reports", label: "My Reports", icon: FileText, testId: "nav-my-reports" },
  ];

  // InsightFlow AI features — grouped separately for all roles
  const insightFlowItems = [
    { href: "/ask-data", icon: Brain, label: "Ask Data", testId: "nav-ask-data" },
    ...(role === "team_lead"
      ? [{ href: "/observability", icon: Activity, label: "Observability", testId: "nav-observability" }]
      : []),
  ];

  const navItems = getNavItems();

  const navLink = (href: string, Icon: any, label: string, testId: string) => {
    const isActive = location === href;
    return (
      <Link
        key={href}
        href={href}
        className={`sidebar-link ${isActive ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
        data-testid={testId}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside className="w-64 bg-background border-r-2 border-purple-200 dark:border-purple-700 fixed left-0 top-[73px] bottom-0 p-4 shadow-md overflow-y-auto z-30 hidden md:block">
      <nav className="space-y-1">

        {/* Core navigation */}
        {navItems.map((item) => navLink(item.href, item.icon, item.label, item.testId))}

        {/* Quick Actions */}
        <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
        <div className="pt-2">
          <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Link
            href="/requests/new"
            className="sidebar-link text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
            data-testid="button-quick-new-request"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">New Data Request</span>
          </Link>
        </div>

        {/* Resources */}
        <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
        <div className="pt-2">
          <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
            Resources
          </p>
          {navLink("/metric-definitions", BookOpen, "Metric Definitions", "nav-metric-definitions")}
        </div>

        {/* Analytics & Dashboards */}
        {user && (
          <>
            <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
            <div className="pt-2">
              <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
                Analytics
              </p>
              {analyticsLinks.map((link) => navLink(link.href, link.icon, link.label, link.testId))}
            </div>
          </>
        )}

        {/* InsightFlow AI — separate group */}
        {user && insightFlowItems.length > 0 && (
          <>
            <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
            <div className="pt-2">
              <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                InsightFlow AI
              </p>
              {insightFlowItems.map((item) => navLink(item.href, item.icon, item.label, item.testId))}
            </div>
          </>
        )}

      </nav>
    </aside>
  );
}
