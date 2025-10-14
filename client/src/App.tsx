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
import type { User } from "@shared/schema";
import Landing from "@/pages/landing";
import AuthSimple from "@/pages/auth-simple";
import SetupPassword from "@/pages/setup-password";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import ProfileSetup from "@/pages/profile-setup";
import RequesterSignup from "@/pages/requester-signup";
import AllRequests from "@/pages/all-requests";
import MyAssignments from "@/pages/my-assignments";
import RequestAssignments from "@/pages/request-assignments";
import MyRequests from "@/pages/my-requests";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import RequestWorkspace from "@/pages/request-workspace";
import NewRequest from "@/pages/new-request";
import Tasks from "@/pages/tasks";
import NotFound from "@/pages/not-found";

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
      <Route path="/all-requests">{() => <AllRequests />}</Route>
      <Route path="/my-assignments">{() => <MyAssignments />}</Route>
      <Route path="/request-assignments">{() => <RequestAssignments />}</Route>
      <Route path="/tasks">{() => <Tasks />}</Route>
      <Route path="/team">{() => <Team />}</Route>
      <Route path="/analytics">{() => <Analytics />}</Route>
      <Route path="/profile-setup">{() => <ProfileSetup />}</Route>
      <Route path="/settings">{() => <Settings />}</Route>
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
