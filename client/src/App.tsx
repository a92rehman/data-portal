import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/requester-signup" component={RequesterSignup} />
      <Route path="/pending-reviews" component={PendingReviews} />
      <Route path="/all-requests" component={AllRequests} />
      <Route path="/my-assignments" component={MyAssignments} />
      <Route path="/team" component={Team} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
