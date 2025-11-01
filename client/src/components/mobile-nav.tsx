import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
  FileText,
  ListTodo,
  ClipboardList,
  Layers
} from "lucide-react";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
}

export default function MobileNav({ open, onOpenChange, user }: MobileNavProps) {
  const [location, setLocation] = useLocation();

  const getNavItems = () => {
    const role = user?.role;
    
    if (role === "team_lead") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-mobile-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-mobile-my-requests" },
        { href: "/request-assignments", icon: ClipboardList, label: "Request Assignments", testId: "nav-mobile-request-assignments" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-mobile-tasks" },
        { href: "/all-requests", icon: FileText, label: "All Requests", testId: "nav-mobile-all-requests" },
        { href: "/analytics", icon: BarChart3, label: "Analytics", testId: "nav-mobile-analytics" },
        { href: "/dashboards", icon: Layers, label: "Dashboards", testId: "nav-mobile-dashboards" },
        { href: "/team", icon: Users, label: "Team Management", testId: "nav-mobile-team" },
      ];
    } else if (role === "analyst") {
      return [
        { href: "/", icon: LayoutDashboard, label: "Dashboard", testId: "nav-mobile-dashboard" },
        { href: "/requests/mine", icon: Inbox, label: "My Requests", testId: "nav-mobile-my-requests" },
        { href: "/request-assignments", icon: ClipboardList, label: "Request Assignments", testId: "nav-mobile-request-assignments" },
        { href: "/tasks", icon: ListTodo, label: "Team Tasks", testId: "nav-mobile-tasks" },
        { href: "/dashboards", icon: Layers, label: "Dashboards", testId: "nav-mobile-dashboards" },
      ];
    } else {
      return [
        { href: "/", icon: LayoutDashboard, label: "My Requests", testId: "nav-mobile-dashboard" },
        { href: "/dashboards", icon: Layers, label: "Dashboards", testId: "nav-mobile-dashboards" },
      ];
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (href: string) => {
    setLocation(href);
    onOpenChange(false);
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`w-full sidebar-link ${isActive ? "gradient-button-primary text-white" : "text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"}`}
                data-testid={item.testId}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {(user?.role === "requester" || user?.role === "team_lead" || user?.role === "analyst") && (
            <>
              <Separator className="my-4 bg-purple-200 dark:bg-purple-700" />
              
              <div className="pt-2">
                <p className="px-3 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-2">
                  Quick Actions
                </p>
                <button
                  onClick={() => handleNavClick("/requests/new")}
                  className="w-full gradient-button-secondary font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center px-4 py-2 rounded-lg"
                  data-testid="button-mobile-quick-new-request"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  New Data Request
                </button>
              </div>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
