import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

export default function Analytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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

  const { data: departmentStats = [] } = useQuery<Array<{ department: string; count: number }>>({
    queryKey: ["/api/analytics/departments"],
    enabled: isAuthenticated,
  });

  const { data: typeStats = [] } = useQuery<Array<{ type: string; count: number }>>({
    queryKey: ["/api/analytics/types"],
    enabled: isAuthenticated,
  });

  const { data: priorityStats = [] } = useQuery<Array<{ priority: string; count: number }>>({
    queryKey: ["/api/analytics/priorities"],
    enabled: isAuthenticated,
  });

  const { data: stats } = useQuery<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  const formatRequestType = (type: string) => {
    switch (type) {
      case "powerbi":
        return "Power BI Dashboard";
      case "adhoc":
        return "Ad-hoc Request";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-info";
      default:
        return "text-muted-foreground";
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive";
      case "medium":
        return "bg-warning";
      case "low":
        return "bg-info";
      default:
        return "bg-muted";
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const totalPriorityRequests = (priorityStats || []).reduce((sum: number, stat: any) => sum + stat.count, 0);

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
    <div className="min-h-screen bg-background">
      <Header user={user} />
      
      <div className="flex">
        <Sidebar onNewRequest={() => {}} />
        
        <main className="flex-1 p-6">
          <h2 className="text-2xl font-bold text-foreground mb-6">Analytics & Insights</h2>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Requests by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(departmentStats || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    (departmentStats || []).map((stat: any) => (
                      <div key={stat.department} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{stat.department}</span>
                        <span className="font-medium" data-testid={`stat-department-${stat.department}`}>{stat.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Requests by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(typeStats || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    (typeStats || []).map((stat: any) => (
                      <div key={stat.type} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{formatRequestType(stat.type)}</span>
                        <span className="font-medium" data-testid={`stat-type-${stat.type}`}>{stat.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="font-medium text-success" data-testid="stat-completed">{stats?.completed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="font-medium text-warning" data-testid="stat-in-progress">{stats?.inProgress || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-medium" data-testid="stat-total">{stats?.totalRequests || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(priorityStats || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    (priorityStats || []).map((stat: any) => (
                      <div key={stat.priority}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm capitalize ${getPriorityColor(stat.priority)}`}>
                            {stat.priority} Priority
                          </span>
                          <span className="text-sm font-medium" data-testid={`stat-priority-${stat.priority}`}>
                            {calculatePercentage(stat.count, totalPriorityRequests)}%
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPriorityBg(stat.priority)}`}
                            style={{ width: `${calculatePercentage(stat.count, totalPriorityRequests)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Average Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-foreground mb-2" data-testid="stat-avg-completion">
                    {stats?.avgCompletionDays || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Days on average</p>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Based on {stats?.completed || 0} completed requests
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
