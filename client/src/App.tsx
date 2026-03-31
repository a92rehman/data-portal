import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { requestNotificationPermission } from "@/lib/notificationUtils";
import type { User } from "@shared/schema";
import Landing from "@/pages/landing";
import AuthSimple from "@/pages/auth-simple";
import SetupPassword from "@/pages/setup-password";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import MyAnalytics from "@/pages/my-analytics";
import ProfileSetup from "@/pages/profile-setup";
import RequesterSignup from "@/pages/requester-signup";
import MyAssignments from "@/pages/my-assignments";
import MyRequests from "@/pages/my-requests";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import RequestWorkspace from "@/pages/request-workspace";
import NewRequest from "@/pages/new-request";
import Tasks from "@/pages/tasks";
import MetricDefinitions from "@/pages/metric-definitions";
import Dashboards from "@/pages/dashboards";
import NotFound from "@/pages/not-found";
import AskData from "@/pages/ask-data";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Landing />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthSimple} />
        <Route path="/setup-password" component={SetupPassword} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/metric-definitions" component={MetricDefinitions} />
        {/* Dashboard routes - accessible without authentication */}
        <Route path="/dashboards/:dashboardId">{() => <Dashboards />}</Route>
        <Route path="/dashboards">{() => <Redirect to="/dashboards/program-delivery" />}</Route>
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">{() => <Dashboard />}</Route>
      <Route path="/auth">{() => <Redirect to="/" />}</Route>
      <Route path="/requests/new">{() => <NewRequest />}</Route>
      <Route path="/requests/mine">{() => <MyRequests />}</Route>
      <Route path="/requests/:id">{() => <RequestWorkspace />}</Route>
      <Route path="/requester-signup">{() => <RequesterSignup />}</Route>
      <Route path="/my-assignments">{() => <MyAssignments />}</Route>
      <Route path="/tasks">{() => <Tasks />}</Route>
      <Route path="/team">{() => <Team />}</Route>
      <Route path="/analytics">{() => <Analytics />}</Route>
      <Route path="/my-analytics">{() => <MyAnalytics />}</Route>
      <Route path="/dashboards/:dashboardId">{() => <Dashboards />}</Route>
      <Route path="/dashboards">{() => <Redirect to="/dashboards/program-delivery" />}</Route>
      <Route path="/profile-setup">{() => <ProfileSetup />}</Route>
      <Route path="/settings">{() => <Settings />}</Route>
      <Route path="/metric-definitions" component={MetricDefinitions} />
      <Route path="/ask-data">{() => <AskData />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
  );
}

function AppContent() {
  const { user } = useAuth() as { user: User | null };

  return (
    <WebSocketProvider userId={user?.id}>
      <Toaster />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        className="mt-16"
      />
      <Router />
    </WebSocketProvider>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Request notification permission on app load
  useEffect(() => {
    const initNotifications = async () => {
      // Wait a bit for the app to fully load before requesting permission
      setTimeout(async () => {
        await requestNotificationPermission();
      }, 2000);
    };
    
    initNotifications();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
