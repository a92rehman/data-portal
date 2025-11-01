import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import PowerBIDashboard from '@/components/PowerBIDashboard';

export default function Dashboards() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  // Power BI Embed URL
  const embedUrl = "https://app.powerbi.com/reportEmbed?reportId=c1b79fbf-b77a-4d42-a8b5-913c0b9280d9&autoAuth=true&ctid=REDACTED_TENANT_ID";

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div>
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        <main className="md:ml-64 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Power BI Dashboards
            </h2>
            <p className="text-muted-foreground">
              Interactive analytics and insights powered by AI
            </p>
          </div>

          <PowerBIDashboard
            embedUrl={embedUrl}
            title="Program Delivery Dashboard"
            description="Comprehensive overview of program delivery metrics and performance indicators"
            showAiInsights={true}
          />
        </main>
      </div>
    </div>
  );
}

