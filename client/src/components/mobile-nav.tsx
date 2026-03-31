import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
}

export default function MobileNav({ open, onOpenChange, user }: MobileNavProps) {
  const [location, setLocation] = useLocation();

  const role = user?.role;

  const getNavItems = () => {
    if (role === "team_lead") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-mobile-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-mobile-my-requests" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-mobile-tasks" },
        { href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-mobile-analytics" },
        { href: "/team", icon: Users, label: "Team Management", testId: "nav-mobile-team" },
      ];
    } else if (role === "data_analyst") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-mobile-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-mobile-my-requests" },
        { href: "/tasks", icon: ListTodo, label: "My Tasks", testId: "nav-mobile-tasks" },
        { href: "/my-analytics", icon: BarChart3, label: "My Analytics", testId: "nav-mobile-my-analytics" },
      ];
    } else {
      return [
        { href: "/", icon: LayoutDashboard, label: "My Requests", testId: "nav-mobile-dashboard" },
      ];
    }
  };

  const analyticsLinks = [
    { href: "/dashboards/program-delivery", label: "Program Delivery", icon: BarChart3, testId: "nav-mobile-program-delivery" },
    { href: "/my-dashboards", label: "My Dashboards", icon: LayoutGrid, testId: "nav-mobile-my-dashboards" },
    { href: "/my-reports", label: "My Reports", icon: FileText, testId: "nav-mobile-my-reports" },
  ];

  const insightFlowItems = [
    { href: "/ask-data", icon: Brain, label: "Ask Data", testId: "nav-mobile-ask-data" },
    ...(role === "team_lead"
      ? [{ href: "/observability", icon: Activity, label: "Observability", testId: "nav-mobile-observability" }]
      : []),
  ];

  const navItems = getNavItems();

  const handleNavClick = (href: string) => {
    setLocation(href);
    onOpenChange(false);
  };

  const navBtn = (href: string, Icon: any, label: string, testId: string) => {
    const isActive = location === href;
    return (
      <button
        key={href}
        onClick={() => handleNavClick(href)}
        className={`w-full sidebar-link cursor-pointer ${isActive ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
        data-testid={testId}
      >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="p-4 border-b-2 border-purple-200 dark:border-purple-700">
          <SheetTitle className="text-left bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            Navigation
          </SheetTitle>
        </SheetHeader>

        <nav className="p-4 space-y-1">

          {/* Core navigation */}
          {navItems.map((item) => navBtn(item.href, item.icon, item.label, item.testId))}

          {/* Quick Actions */}
          <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
          <div className="pt-2">
            <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
              Quick Actions
            </p>
            <button
              onClick={() => handleNavClick("/requests/new")}
              className="w-full sidebar-link cursor-pointer text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              data-testid="button-mobile-quick-new-request"
            >
              <Plus className="w-5 h-5" />
              <span className="font-semibold">New Data Request</span>
            </button>
          </div>

          {/* Resources */}
          <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
          <div className="pt-2">
            <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
              Resources
            </p>
            {navBtn("/metric-definitions", BookOpen, "Metric Definitions", "nav-mobile-metric-definitions")}
          </div>

          {/* Analytics & Dashboards */}
          {user && (
            <>
              <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
              <div className="pt-2">
                <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
                  Analytics
                </p>
                {analyticsLinks.map((link) => navBtn(link.href, link.icon, link.label, link.testId))}
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
                {insightFlowItems.map((item) => navBtn(item.href, item.icon, item.label, item.testId))}
              </div>
            </>
          )}

        </nav>
      </SheetContent>
    </Sheet>
  );
}
