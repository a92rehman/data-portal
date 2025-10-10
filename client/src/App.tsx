import { useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import AuthSimple from "@/pages/auth-simple";
import SetupPassword from "@/pages/setup-password";
import Dashboard from "@/pages/dashboard";
import Analytics from "@/pages/analytics";
import ProfileSetup from "@/pages/profile-setup";
import RequesterSignup from "@/pages/requester-signup";
import PendingReviews from "@/pages/pending-reviews";
import AllRequests from "@/pages/all-requests";
import MyAssignments from "@/pages/my-assignments";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import RequestWorkspace from "@/pages/request-workspace";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <Landing />;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthSimple} />
        <Route path="/setup-password" component={SetupPassword} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">{() => <Dashboard />}</Route>
      <Route path="/auth">{() => <Redirect to="/" />}</Route>
      <Route path="/requests/new">{() => <RequestWorkspace />}</Route>
      <Route path="/requests/:id">{() => <RequestWorkspace />}</Route>
      <Route path="/requester-signup">{() => <RequesterSignup />}</Route>
      <Route path="/pending-reviews">{() => <PendingReviews />}</Route>
      <Route path="/all-requests">{() => <AllRequests />}</Route>
      <Route path="/my-assignments">{() => <MyAssignments />}</Route>
      <Route path="/team">{() => <Team />}</Route>
      <Route path="/analytics">{() => <Analytics />}</Route>
      <Route path="/profile-setup">{() => <ProfileSetup />}</Route>
      <Route path="/settings">{() => <Settings />}</Route>
      <Route>{() => <NotFound />}</Route>
    </Switch>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
