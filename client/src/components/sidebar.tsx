import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  Inbox, 
  BarChart3, 
  Users, 
  Plus,
  FileText,
  ListTodo,
  ClipboardList,
  BookOpen,
  Layers,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface SidebarProps {
  onNewRequest: () => void;
  user?: any;
}

export default function Sidebar({ onNewRequest, user }: SidebarProps) {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Load from localStorage or default to ['dashboards']
    const saved = localStorage.getItem('sidebar-expanded');
    return saved ? JSON.parse(saved) : ['dashboards'];
  });

  // Save expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Role-specific navigation items
  const getNavItems = () => {
    const role = user?.role;
    
    if (role === "team_lead") {
      // Data Lead - Full access
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-my-requests" },
        { href: "/request-assignments", icon: ClipboardList, label: "Request Assignments", testId: "nav-request-assignments" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-tasks" },
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

  // Dashboards section with children
  const dashboardsSection = {
    id: 'dashboards',
    name: 'Dashboards',
    icon: Layers,
    expanded: expandedSections.includes('dashboards'),
    children: [
      { 
        href: '/dashboards/program-delivery',
        label: 'Program Delivery',
        icon: BarChart3,
        testId: 'nav-program-delivery'
      }
    ]
  };

  return (
    <aside className="w-64 bg-background border-r-2 border-purple-200 dark:border-purple-700 fixed left-0 top-[73px] bottom-0 p-4 shadow-md overflow-y-auto z-30 hidden md:block">
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

        {/* Dashboards collapsible section */}
        {(user?.role === "team_lead" || user?.role === "analyst" || user?.role === "requester") && (
          <>
            <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
            <div>
              <button
                onClick={() => toggleSection(dashboardsSection.id)}
                className={`sidebar-link w-full flex items-center justify-between ${location.startsWith('/dashboards') ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
                data-testid="nav-dashboards-section"
              >
                <div className="flex items-center gap-3">
                  <dashboardsSection.icon className="w-5 h-5" />
                  <span>{dashboardsSection.name}</span>
                </div>
                {dashboardsSection.expanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {dashboardsSection.expanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {dashboardsSection.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = location === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar-link block text-sm ${isChildActive ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
                        data-testid={child.testId}
                      >
                        <ChildIcon className="w-4 h-4 inline mr-2" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

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
                  className="w-full justify-start gradient-button-secondary font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 text-foreground" 
                  data-testid="button-quick-new-request"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  New Data Request
                </Button>
              </Link>
            </div>
          </>
        )}

        {/* Resources Section */}
        <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
        
        <div className="pt-2">
          <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
            Resources
          </p>
          <Link 
            href="/metric-definitions"
            className={`sidebar-link ${location === "/metric-definitions" ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
            data-testid="nav-metric-definitions"
          >
            <BookOpen className="w-5 h-5" />
            <span>Metric Definitions</span>
          </Link>
        </div>

      </nav>
    </aside>
  );
}
