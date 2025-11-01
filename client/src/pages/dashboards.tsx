import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import PowerBIDashboard from '@/components/PowerBIDashboard';
import AIAssistantPanel from '@/components/AIAssistantPanel';
import { getDashboardConfig } from '@/config/dashboards';

export default function Dashboards() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const dashboardId = params.dashboardId || "program-delivery";

  // Get dashboard config
  const dashboard = getDashboardConfig(dashboardId);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div className="flex">
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        {/* Main content with side-by-side layout */}
        <main className="flex-1 md:ml-64">
          {/* Page header */}
          <div className="p-6 border-b bg-white dark:bg-gray-900">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 
                           via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {dashboard.title}
            </h2>
            <p className="text-muted-foreground">
              {dashboard.description}
            </p>
          </div>

          {/* Side-by-side layout */}
          <div className="flex flex-col lg:flex-row h-[calc(100vh-200px)]">
            {/* Dashboard section - 70% */}
            <div className="flex-1 lg:w-[70%] p-4 overflow-auto bg-gray-50 dark:bg-gray-950">
              <PowerBIDashboard
                embedUrl={dashboard.embedUrl}
                reportId={dashboard.reportId}
                title={dashboard.title}
                showAiInsights={false}
                height="100%"
              />
            </div>

            {/* AI Assistant Panel - 30% */}
            <div className="lg:w-[30%] min-w-[400px] max-w-[500px] flex-shrink-0">
              <AIAssistantPanel
                dashboardId={dashboard.id}
                dashboardTitle={dashboard.title}
                reportId={dashboard.reportId}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

