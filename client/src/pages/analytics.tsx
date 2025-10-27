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
import { BarChart3, PieChart, TrendingUp, ListChecks, Clock, CheckCircle2, AlertCircle, ListTodo, Users, Calculator } from "lucide-react";

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
    overdue: number;
    lateCompletions: number;
    atRisk: number;
    rejected: number;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

  // New Request Analytics Queries
  const { data: acceptanceRate } = useQuery<{ acceptanceRate: number }>({
    queryKey: ["/api/analytics/requests/acceptance-rate"],
    enabled: isAuthenticated,
  });

  const { data: blockedRequestsData } = useQuery<{ blockedRequests: number }>({
    queryKey: ["/api/analytics/requests/blocked"],
    enabled: isAuthenticated,
  });

  const { data: timeToAssignment } = useQuery<{ avgTimeToAssignment: number }>({
    queryKey: ["/api/analytics/requests/time-to-assignment"],
    enabled: isAuthenticated,
  });

  const { data: completionByPriority = [] } = useQuery<Array<{ priority: string; completed: number; total: number }>>({
    queryKey: ["/api/analytics/requests/completion-by-priority"],
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

  // New Task Analytics Queries
  const { data: overdueTasksData } = useQuery<{ overdueTasks: number }>({
    queryKey: ["/api/analytics/tasks/overdue"],
    enabled: isAuthenticated,
  });

  const { data: avgTaskDuration } = useQuery<{ avgTaskDuration: number }>({
    queryKey: ["/api/analytics/tasks/avg-duration"],
    enabled: isAuthenticated,
  });

  const { data: completionVelocity } = useQuery<{ completionVelocity: number }>({
    queryKey: ["/api/analytics/tasks/completion-velocity"],
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

  const { data: teamWorkload = [] } = useQuery<Array<{
    analystId: string;
    firstName: string;
    lastName: string;
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
  }>>({
    queryKey: ["/api/analytics/tasks/workload"],
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
      
      <div>
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        <main className="md:ml-64 p-6">
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

          {/* Additional Request Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
            <Card className="gradient-card border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  Acceptance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-acceptance-rate">
                    {acceptanceRate?.acceptanceRate || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Requests accepted</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-2 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                  Blocked Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400" data-testid="stat-blocked-requests">
                    {blockedRequestsData?.blockedRequests || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Currently blocked</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-2 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  Time to Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-time-to-assignment">
                    {timeToAssignment?.avgTimeToAssignment || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Days on average</p>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-2 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  Completion by Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completionByPriority.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No data</p>
                  ) : (
                    completionByPriority.map((stat: any) => (
                      <div key={stat.priority} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{stat.priority}</span>
                        <span className="font-medium">{stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0}%</span>
                      </div>
                    ))
                  )}
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

                <Card className="gradient-card border-2 border-red-200 dark:border-red-800">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Overdue Tasks</CardTitle>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-overdue-tasks">{overdueTasksData?.overdueTasks || 0}</div>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">Past deadline</p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Task Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="gradient-card border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      Average Task Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-avg-task-duration">
                        {avgTaskDuration?.avgTaskDuration || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Days on average</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      Completion Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completion-velocity">
                        {completionVelocity?.completionVelocity || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Tasks per week</p>
                    </div>
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

              {/* Team Workload Management */}
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Team Workload Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Monitor task distribution and analyst capacity</p>
                  
                  {/* Workload Calculation Formula */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Workload Calculation</h4>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Simple Formula:</p>
                        <div className="font-mono text-xs text-blue-600 mb-3">
                          Workload Hours = Σ (Expected Time)
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Expected Time</strong> is calculated using <strong>PERT estimation</strong> during task creation, 
                          which already accounts for <strong>complexity</strong> and <strong>confidence</strong> levels.
                        </p>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">PERT Time Estimation:</p>
                        <div className="font-mono text-xs text-purple-600 mb-2">
                          Expected Time = (Optimistic + 4×Most Likely + Pessimistic) / 6
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                          <div>
                            <strong>Formula:</strong>
                            <div className="ml-2 mt-1 space-y-0.5">
                              <div>• Optimistic = Base Estimate</div>
                              <div>• Most Likely = Base + (Range × 0.5)</div>
                              <div>• Pessimistic = Base + (Range × Confidence)</div>
                            </div>
                          </div>
                          <div>
                            <strong>Complexity</strong> sets the buffer range: simple (20%), medium (50%), complex (80%)
                          </div>
                          <div>
                            <strong>Confidence</strong> multiplies pessimistic buffer: high (1x), medium (2x), low (3.5x)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Capacity:</p>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <div><strong>1 Productive Day</strong> = 4.5 hours</div>
                            <div><strong>1 Productive Week</strong> = 22.5 hours (5 days)</div>
                            <div><strong>Productivity Factor</strong> = 75%</div>
                            <div className="text-xs mt-1 italic">Accounts for meetings, admin, and context switching</div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Capacity Levels:</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span>Available: 0-20%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span>Light: 20-50%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <span>Moderate: 50-75%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span>Heavy: 75-95%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span>Overloaded: 95%+</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {teamWorkload.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No analysts or tasks available</p>
                  ) : (
                    <div className="space-y-4">
                      {teamWorkload.map((analyst) => {
                        const dayUtilization = (analyst.totalExpectedDays / analyst.weeklyCapacity) * 100;
                        
                        return (
                          <div key={analyst.analystId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
                                  {analyst.firstName.charAt(0)}{analyst.lastName.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-foreground">{analyst.firstName} {analyst.lastName}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {analyst.totalExpectedDays} day{analyst.totalExpectedDays > 1 ? 's' : ''} workload ({analyst.totalExpectedHours.toFixed(1)}h)
                                  </p>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                analyst.capacityLevel === 'available' ? 'text-green-600 bg-green-100 dark:bg-green-950' :
                                analyst.capacityLevel === 'light' ? 'text-blue-600 bg-blue-100 dark:bg-blue-950' :
                                analyst.capacityLevel === 'moderate' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950' :
                                analyst.capacityLevel === 'heavy' ? 'text-orange-600 bg-orange-100 dark:bg-orange-950' :
                                'text-red-600 bg-red-100 dark:bg-red-950'
                              }`}>
                                {analyst.capacityLevel.replace('_', ' ').toUpperCase()}
                              </div>
                            </div>

                            {/* Day-based metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                  {dayUtilization.toFixed(0)}%
                                </div>
                                <div className="text-xs text-muted-foreground">Day Utilization</div>
                              </div>
                              <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                                  {analyst.availableDays.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">Available Days</div>
                              </div>
                            </div>

                            {/* Progress bar for weekly capacity */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Weekly Capacity (5 days)</span>
                                <span>{analyst.totalExpectedDays}/5 days</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(dayUtilization, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Task breakdown */}
                            <div className="grid grid-cols-4 gap-2 mt-3">
                              <div className="text-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{analyst.toDo}</div>
                                <div className="text-xs text-muted-foreground">To Do</div>
                              </div>
                              <div className="text-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{analyst.inProgress}</div>
                                <div className="text-xs text-muted-foreground">In Progress</div>
                              </div>
                              <div className="text-center p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                <div className="text-lg font-bold text-red-700 dark:text-red-400">{analyst.blocked}</div>
                                <div className="text-xs text-muted-foreground">Blocked</div>
                              </div>
                              <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                                <div className="text-lg font-bold text-green-700 dark:text-green-400">{analyst.completed}</div>
                                <div className="text-xs text-muted-foreground">Completed</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
