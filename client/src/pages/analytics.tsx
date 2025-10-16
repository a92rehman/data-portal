import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PieChart, TrendingUp, ListChecks, Clock, CheckCircle2, AlertCircle, ListTodo } from "lucide-react";

export default function Analytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("requests");

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

    // Wait for user object to load before checking role
    if (!isLoading && isAuthenticated && !user) {
      return;
    }

    // Restrict access to Data Lead only
    if (!isLoading && isAuthenticated && user && (user as any)?.role !== "team_lead") {
      toast({
        title: "Access Denied",
        description: "Analytics is only available for Data Lead",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

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

  // Task Analytics Queries
  const { data: taskStats } = useQuery<{
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
    avgExpectedTime: number;
  }>({
    queryKey: ["/api/analytics/tasks/stats"],
    enabled: isAuthenticated,
  });

  const { data: taskStatusStats = [] } = useQuery<Array<{ status: string; count: number }>>({
    queryKey: ["/api/analytics/tasks/by-status"],
    enabled: isAuthenticated,
  });

  const { data: taskAssigneeStats = [] } = useQuery<Array<{ assignee: string; firstName: string; lastName: string; count: number }>>({
    queryKey: ["/api/analytics/tasks/by-assignee"],
    enabled: isAuthenticated,
  });

  const { data: taskLinkedStats = [] } = useQuery<Array<{ linked: string; count: number }>>({
    queryKey: ["/api/analytics/tasks/request-linked"],
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
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div className="flex">
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        <main className="flex-1 p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-6">Analytics & Insights</h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Requests Analytics
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Tasks Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="requests" className="mt-6">

          {/* Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(300, 70%, 65%) 100%)'}}>
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
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

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
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

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 71%, 50%) 100%)'}}>
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
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
            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Priority Distribution</CardTitle>
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

            <Card className="gradient-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Average Completion Time</CardTitle>
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
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              {/* Task Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="gradient-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(300, 70%, 65%) 100%)'}}>
                      <ListChecks className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskStats?.totalTasks || 0}</div>
                  </CardContent>
                </Card>

                <Card className="gradient-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskStats?.inProgress || 0}</div>
                  </CardContent>
                </Card>

                <Card className="gradient-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-500">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taskStats?.completed || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {taskStats?.totalTasks ? Math.round((taskStats.completed / taskStats.totalTasks) * 100) : 0}% completion rate
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(300, 70%, 65%) 100%)'}}>
                        <ListTodo className="w-4 h-4 text-white" />
                      </div>
                      Tasks by Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(taskStatusStats || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                      ) : (
                        (taskStatusStats || []).map((stat: any) => (
                          <div key={stat.status} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground capitalize">
                              {stat.status.replace('_', ' ')}
                            </span>
                            <span className="font-medium">{stat.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      Tasks by Assignee
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(taskAssigneeStats || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No assigned tasks</p>
                      ) : (
                        (taskAssigneeStats || []).map((stat: any) => (
                          <div key={stat.assignee} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {stat.firstName} {stat.lastName}
                            </span>
                            <span className="font-medium">{stat.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 71%, 50%) 100%)'}}>
                        <PieChart className="w-4 h-4 text-white" />
                      </div>
                      Task Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(taskLinkedStats || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                      ) : (
                        (taskLinkedStats || []).map((stat: any) => (
                          <div key={stat.linked} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{stat.linked}</span>
                            <span className="font-medium">{stat.count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
