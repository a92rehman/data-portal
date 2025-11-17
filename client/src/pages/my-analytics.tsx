import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, CheckCircle2, AlertCircle, ListTodo, Target, Activity } from "lucide-react";

type WorkloadData = {
  analystId: string;
  firstName: string;
  lastName: string;
  totalTasks: number;
  toDo: number;
  inProgress: number;
  blocked: number;
  completed: number;
  totalExpectedHours: number;
  totalExpectedDays: number;
  weeklyCapacity: number;
  currentUtilization: number;
  availableDays: number;
  capacityLevel: 'available' | 'light' | 'moderate' | 'heavy' | 'overloaded';
  plannedHoursThisWeek?: number;
};

export default function MyAnalytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated or not an analyst
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

    if (!isLoading && isAuthenticated && user && (user as any)?.role !== "analyst") {
      toast({
        title: "Access Denied",
        description: "My Analytics is only available for Analysts",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast, setLocation]);

  // Fetch workload data
  const { data: workload } = useQuery<WorkloadData>({
    queryKey: ["/api/analytics/my-workload"],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/my-workload?t=${Date.now()}`, { 
        credentials: "include", 
        cache: 'no-store' as RequestCache 
      });
      if (!res.ok) throw new Error("Failed to fetch workload");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isAuthenticated && (user as any)?.role === "analyst",
  });

  // Fetch request stats (already filtered by role)
  const { data: requestStats } = useQuery<{
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
    enabled: isAuthenticated && (user as any)?.role === "analyst",
  });

  // Fetch task stats (filtered by analyst)
  const { data: taskStats } = useQuery<{
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
    avgExpectedTime: number;
  }>({
    queryKey: ["/api/analytics/tasks/stats"],
    enabled: isAuthenticated && (user as any)?.role === "analyst",
  });

  // Fetch overdue tasks count
  const { data: overdueTasksData } = useQuery<{ count: number }>({
    queryKey: ["/api/analytics/tasks/overdue"],
    enabled: isAuthenticated && (user as any)?.role === "analyst",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header user={user as any} />
        <div>
          <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
          <main className="md:ml-64 p-6">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Calculate completion rate for requests
  const requestCompletionRate = requestStats?.totalRequests 
    ? Math.round((requestStats.completed / requestStats.totalRequests) * 100) 
    : 0;

  // Calculate active requests
  const activeRequests = (requestStats?.inProgress || 0) + (requestStats?.atRisk || 0);

  // Calculate task completion rate
  const taskCompletionRate = taskStats?.totalTasks 
    ? Math.round((taskStats.completed / taskStats.totalTasks) * 100) 
    : 0;

  // Capacity level colors
  const getCapacityColor = (level: string) => {
    switch (level) {
      case 'available': return 'text-green-600 bg-green-100 dark:bg-green-950';
      case 'light': return 'text-blue-600 bg-blue-100 dark:bg-blue-950';
      case 'moderate': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950';
      case 'heavy': return 'text-orange-600 bg-orange-100 dark:bg-orange-950';
      case 'overloaded': return 'text-red-600 bg-red-100 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-950';
    }
  };

  // Utilization bar color
  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 20) return 'bg-green-500';
    if (utilization <= 50) return 'bg-blue-500';
    if (utilization <= 75) return 'bg-yellow-500';
    if (utilization <= 95) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      <div>
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        <main className="md:ml-64 p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-6">
            My Analytics
          </h2>

          {/* Workload Bar - Top Section */}
          <Card className="mb-6 gradient-card border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-semibold">My Workload</span>
                {workload && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCapacityColor(workload.capacityLevel)}`}>
                    {workload.capacityLevel.toUpperCase()}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workload ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity Utilization</p>
                      <p className="text-3xl font-bold">{workload.currentUtilization.toFixed(1)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Planned This Week</p>
                      <p className="text-2xl font-bold">{workload.plannedHoursThisWeek?.toFixed(1) || 0}h</p>
                      <p className="text-xs text-muted-foreground">
                        Available: {workload.availableDays.toFixed(1)} days
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getUtilizationColor(workload.currentUtilization)}`}
                      style={{ width: `${Math.min(workload.currentUtilization, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{workload.totalTasks}</p>
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{workload.toDo}</p>
                      <p className="text-xs text-muted-foreground">To Do</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{workload.inProgress}</p>
                      <p className="text-xs text-muted-foreground">In Progress</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{workload.completed}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading workload data...</p>
              )}
            </CardContent>
          </Card>

          {/* Metrics Grid - Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Requests Metrics - Left Column */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Requests Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="gradient-card border-l-4 border-l-purple-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">{requestStats?.totalRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">All time requests</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-green-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                    <Target className="w-5 h-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                      {requestCompletionRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {requestStats?.completed || 0} of {requestStats?.totalRequests || 0} completed
                    </p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-blue-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Requests</CardTitle>
                    <Activity className="w-5 h-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">{activeRequests}</div>
                    <p className="text-xs text-muted-foreground">In progress + at risk</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-orange-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-orange-600 dark:text-orange-400">
                      {requestStats?.overdue || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Requests</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tasks Metrics - Right Column */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Tasks Analytics</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="gradient-card border-l-4 border-l-purple-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                    <ListTodo className="w-5 h-5 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">{taskStats?.totalTasks || 0}</div>
                    <p className="text-xs text-muted-foreground">All tasks</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-blue-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                    <Activity className="w-5 h-5 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                      {taskStats?.inProgress || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Active tasks</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-orange-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-orange-600 dark:text-orange-400">
                      {overdueTasksData?.count || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Past due date</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-green-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                      {taskCompletionRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {taskStats?.completed || 0} of {taskStats?.totalTasks || 0} completed
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

