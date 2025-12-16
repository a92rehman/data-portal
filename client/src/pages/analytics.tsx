import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart3, PieChart, TrendingUp, ListChecks, Clock, CheckCircle2, AlertCircle, ListTodo, Users, Calculator, Info, ArrowUpRight, ArrowDownRight, Activity, Target, Zap, Shield, ExternalLink } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import type { DataRequestWithDetails, TaskWithDetails } from "@shared/schema";

export default function Analytics() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

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

  // Check for requestId or taskId URL param and fetch specific request/task
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const requestId = urlParams.get('requestId');
    const taskId = urlParams.get('taskId');
    
    if (requestId) {
      // Fetch the specific request directly
      fetch(`/api/requests/${requestId}`, {
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch request: ${res.status}`);
          }
          return res.json();
        })
        .then(request => {
          if (request && request.id) {
            setSelectedRequest(request);
          }
          // Clear the URL param
          setLocation(location);
        })
        .catch(err => {
          console.error('Failed to fetch request:', err);
          toast({ 
            title: "Error", 
            description: "Could not load the requested item", 
            variant: "destructive" 
          });
          // Clear the URL param
          setLocation(location);
        });
    } else if (taskId) {
      // Fetch the specific task directly
      fetch(`/api/tasks/${taskId}`, {
        credentials: 'include',
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch task: ${res.status}`);
          }
          return res.json();
        })
        .then(task => {
          if (task && task.id) {
            setSelectedTask(task);
          }
          // Clear the URL param
          setLocation(location);
        })
        .catch(err => {
          console.error('Failed to fetch task:', err);
          toast({ 
            title: "Error", 
            description: "Could not load the requested task", 
            variant: "destructive" 
          });
          // Clear the URL param
          setLocation(location);
        });
    }
  }, [searchString, location, setLocation, toast]);

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
  const { data: acceptanceRateData } = useQuery<{ acceptanceRate: number }>({
    queryKey: ["/api/analytics/acceptance-rate"],
    enabled: isAuthenticated,
  });

  const { data: blockedRequestsData } = useQuery<{ count: number }>({
    queryKey: ["/api/analytics/blocked-requests"],
    enabled: isAuthenticated,
  });

  const { data: timeToAssignmentData } = useQuery<{ days: number }>({
    queryKey: ["/api/analytics/time-to-assignment"],
    enabled: isAuthenticated,
  });

  const { data: completionByPriority = [] } = useQuery<Array<{ priority: string; completed: number; total: number }>>({
    queryKey: ["/api/analytics/completion-by-priority"],
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

  const { data: avgTaskDuration } = useQuery<{ days: number }>({
    queryKey: ["/api/analytics/tasks/avg-duration"],
    enabled: isAuthenticated,
  });

  const { data: completionVelocity } = useQuery<{ tasksPerWeek: number; recentCompletions: number }>({
    queryKey: ["/api/analytics/tasks/velocity"],
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

  type TeamWorkloadRow = {
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
    currentUtilization: number; // percent for this week
    availableDays: number;
    capacityLevel: 'available' | 'light' | 'moderate' | 'heavy' | 'overloaded';
    plannedHoursThisWeek?: number; // hours planned this week
    dueDate?: string; // Added for tooltip
  };

  const { data: teamWorkload = [] } = useQuery<Array<TeamWorkloadRow>>({
    queryKey: ["/api/analytics/tasks/workload"],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/tasks/workload?t=${Date.now()}` , { credentials: "include", cache: 'no-store' as RequestCache });
      if (!res.ok) throw new Error("Failed to fetch workload");
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isAuthenticated,
  });

  // Helpers for client-side fallback weekly planning (in case backend still returns legacy totals)
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const startOfWeek = (d: Date) => { const x = startOfDay(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1) - day; x.setDate(x.getDate() + diff); return x; };
  const endOfWeek = (d: Date) => { const s = startOfWeek(d); const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23,59,59,999); return e; };
  const isBusinessDay = (d: Date) => { const day = d.getDay(); return day !== 0 && day !== 6; };
  const businessDaysBetween = (a: Date, b: Date) => { const s = startOfDay(a); const e = startOfDay(b); if (e < s) return 0; let c = 0; const cur = new Date(s); while (cur <= e) { if (isBusinessDay(cur)) c++; cur.setDate(cur.getDate() + 1); } return c; };

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const EFFECTIVE_HOURS_PER_DAY = 6 * 0.75; // 4.5
  const EFFECTIVE_WEEKLY_CAPACITY = 5 * EFFECTIVE_HOURS_PER_DAY; // 22.5

  type MinimalTask = { expectedTime?: number; dueDate?: string; createdAt?: string; status?: string; assignedToId?: string };

  // Render row with server values; if server lacks weekly plan, compute fallback client-side
  function AnalystRow({ analyst }: { analyst: TeamWorkloadRow }) {
    const needsFallback = analyst.plannedHoursThisWeek == null || (!Number.isFinite(analyst.currentUtilization));
    const { data: tasks = [] } = useQuery<Array<MinimalTask>>({
      queryKey: ["/api/tasks", { assignedToId: analyst.analystId }],
      queryFn: async () => {
        const params = new URLSearchParams({ assignedToId: analyst.analystId });
        const res = await fetch(`/api/tasks?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch tasks');
        return res.json();
      },
      enabled: needsFallback,
      staleTime: 30_000,
    });

    let plannedHoursThisWeek = analyst.plannedHoursThisWeek ?? 0;
    let weeklyUtilization = analyst.currentUtilization ?? 0;

    if (needsFallback) {
      // Compute planned hours for this week by spreading each active task evenly across business days
      plannedHoursThisWeek = 0;
      for (const t of tasks) {
        const hours = Number(t.expectedTime || 0);
        if (!hours) continue;
        const start = startOfDay(today); // begin from today for active tasks
        const end = t.dueDate ? new Date(t.dueDate) : new Date(today.getTime() + 7*24*60*60*1000);
        let totalBiz = businessDaysBetween(start, end); if (totalBiz <= 0) totalBiz = 1;
        const perDay = hours / totalBiz;
        const winStart = weekStart > start ? weekStart : start;
        const winEnd = weekEnd < end ? weekEnd : end;
        if (winEnd >= winStart) {
          const bizInWeek = businessDaysBetween(winStart, winEnd);
          plannedHoursThisWeek += perDay * bizInWeek;
        }
      }
      weeklyUtilization = (plannedHoursThisWeek / EFFECTIVE_WEEKLY_CAPACITY) * 100;
    }

    return (
      <div key={analyst.analystId} className="border border-border rounded-lg p-4 bg-card text-card-foreground">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold">
              {analyst.firstName.charAt(0)}{analyst.lastName.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{analyst.firstName} {analyst.lastName}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Planned this week: {plannedHoursThisWeek.toFixed(1)}h ({(plannedHoursThisWeek / EFFECTIVE_HOURS_PER_DAY).toFixed(2)}d)
                </span>
                <span
                  className="ml-1 cursor-help"
                  title={`Total workload: ${analyst.totalExpectedHours?.toFixed(1) ?? '--'}h (${analyst.totalExpectedDays?.toFixed(1) ?? '--'}d)` +
                  `${analyst.dueDate ? `. Due: ${analyst.dueDate}` : ''}`}
                >
                  <Info className="inline w-3 h-3 text-blue-400" />
                </span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${analyst.capacityLevel === 'available' ? 'text-green-600 bg-green-100 dark:bg-green-950' : analyst.capacityLevel === 'light' ? 'text-blue-600 bg-blue-100 dark:bg-blue-950' : analyst.capacityLevel === 'moderate' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950' : analyst.capacityLevel === 'heavy' ? 'text-orange-600 bg-orange-100 dark:bg-orange-950' : 'text-red-600 bg-red-100 dark:bg-red-950'}`}>
            {analyst.capacityLevel.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{weeklyUtilization.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Weekly Utilization</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
            <div className="text-lg font-bold text-green-700 dark:text-green-400">{((Math.max(0, EFFECTIVE_WEEKLY_CAPACITY - plannedHoursThisWeek)) / EFFECTIVE_HOURS_PER_DAY).toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Available This Week (days)</div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Weekly Capacity (planned)</span>
            <span>{plannedHoursThisWeek.toFixed(1)}h / 22.5h</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(weeklyUtilization, 100)}%` }} />
          </div>
        </div>
      </div>
    );
  }

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

  // Chart colors - must be defined before use
  const CHART_COLORS = {
    purple: "hsl(280, 70%, 60%)",
    blue: "hsl(199, 89%, 48%)",
    green: "hsl(142, 71%, 45%)",
    orange: "hsl(38, 92%, 50%)",
    red: "hsl(0, 84%, 60%)",
    pink: "hsl(330, 81%, 60%)",
  };

  const PIE_COLORS = [
    CHART_COLORS.purple,
    CHART_COLORS.blue,
    CHART_COLORS.green,
    CHART_COLORS.orange,
    CHART_COLORS.red,
    CHART_COLORS.pink,
  ];

  // Calculate completion rate
  const completionRate = stats?.totalRequests ? Math.round((stats.completed / stats.totalRequests) * 100) : 0;
  
  // Calculate active requests (in progress + at risk)
  const activeRequests = (stats?.inProgress || 0) + (stats?.atRisk || 0);

  // Chart data preparation
  const statusChartData = [
    { name: "Completed", value: stats?.completed || 0, fill: CHART_COLORS.green, color: CHART_COLORS.green },
    { name: "In Progress", value: stats?.inProgress || 0, fill: CHART_COLORS.blue, color: CHART_COLORS.blue },
    { name: "At Risk", value: stats?.atRisk || 0, fill: CHART_COLORS.orange, color: CHART_COLORS.orange },
    { name: "Overdue", value: stats?.overdue || 0, fill: CHART_COLORS.red, color: CHART_COLORS.red },
  ].filter(item => item.value > 0);

  const departmentChartData = (departmentStats || []).map((stat: any) => ({
    name: stat.department.charAt(0).toUpperCase() + stat.department.slice(1),
    value: stat.count,
  }));

  const typeChartData = (typeStats || []).map((stat: any) => ({
    name: formatRequestType(stat.type),
    value: stat.count,
  }));

  const priorityChartData = (priorityStats || []).map((stat: any) => ({
    name: stat.priority.charAt(0).toUpperCase() + stat.priority.slice(1),
    value: stat.count,
    percentage: calculatePercentage(stat.count, totalPriorityRequests),
  }));

  const completionByPriorityChartData = completionByPriority.map((stat: any) => ({
    name: stat.priority.charAt(0).toUpperCase() + stat.priority.slice(1),
    completed: stat.completed,
    total: stat.total,
    rate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0,
  }));

  // Task Analytics Chart Data
  const taskCompletionRate = taskStats?.totalTasks ? Math.round((taskStats.completed / taskStats.totalTasks) * 100) : 0;
  
  const taskStatusChartData = [
    { name: "To Do", value: taskStats?.toDo || 0, fill: CHART_COLORS.purple, color: CHART_COLORS.purple },
    { name: "In Progress", value: taskStats?.inProgress || 0, fill: CHART_COLORS.blue, color: CHART_COLORS.blue },
    { name: "Blocked", value: taskStats?.blocked || 0, fill: CHART_COLORS.orange, color: CHART_COLORS.orange },
    { name: "Completed", value: taskStats?.completed || 0, fill: CHART_COLORS.green, color: CHART_COLORS.green },
  ].filter(item => item.value > 0);

  const taskAssigneeChartData = (taskAssigneeStats || []).map((stat: any) => ({
    name: `${stat.firstName} ${stat.lastName}`,
    value: stat.count,
  })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10

  const taskStatusListData = (taskStatusStats || []).map((stat: any) => ({
    name: stat.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    value: stat.count,
  }));

  const taskLinkedChartData = (taskLinkedStats || []).map((stat: any) => ({
    name: stat.linked,
    value: stat.count,
  }));

  // Check for query errors
  const hasErrors = false; // Could be enhanced to check individual query errors

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
            
            <TabsContent value="requests" className="mt-4 space-y-4">
              {/* KPI Dashboard Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="gradient-card border-l-4 border-l-purple-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1" data-testid="stat-total">{stats?.totalRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">All time requests</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-green-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">{completionRate}%</div>
                    <p className="text-xs text-muted-foreground">{stats?.completed || 0} of {stats?.totalRequests || 0} completed</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-blue-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Completion Time</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400" data-testid="stat-avg-completion">
                      {stats?.avgCompletionDays || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Days on average</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-orange-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Requests</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-orange-600 dark:text-orange-400">{activeRequests}</div>
                    <p className="text-xs text-muted-foreground">In progress + at risk</p>
                  </CardContent>
                </Card>
              </div>

              {/* Visual Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Distribution - Donut Chart */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <>
                        <ChartContainer
                          config={{
                            completed: { label: "Completed", color: CHART_COLORS.green },
                            inProgress: { label: "In Progress", color: CHART_COLORS.blue },
                            atRisk: { label: "At Risk", color: CHART_COLORS.orange },
                            overdue: { label: "Overdue", color: CHART_COLORS.red },
                          }}
                          className="h-[220px]"
                        >
                          <RechartsPieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={statusChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              label={false}
                            >
                              {statusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ChartContainer>
                        {/* Custom Legend */}
                        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                          {statusChartData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 shrink-0 rounded-sm border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-xs font-medium text-foreground">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Department Breakdown - Bar Chart */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      Requests by Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {departmentChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <ChartContainer
                        config={{
                          value: { label: "Requests", color: CHART_COLORS.blue },
                        }}
                        className="h-[250px]"
                      >
                        <BarChart data={departmentChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="value" fill={CHART_COLORS.blue} radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Request Type Distribution - Horizontal Bar */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                      Requests by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {typeChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <ChartContainer
                        config={{
                          value: { label: "Requests", color: CHART_COLORS.purple },
                        }}
                        className="h-[250px]"
                      >
                        <BarChart data={typeChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="value" fill={CHART_COLORS.purple} radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Priority Distribution with Completion Rates */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      Priority Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {priorityChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <div className="space-y-4">
                        {priorityChartData.map((stat, index) => (
                          <div key={stat.name}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium capitalize">{stat.name}</span>
                              <span className="text-sm font-bold" data-testid={`stat-priority-${stat.name.toLowerCase()}`}>
                                {stat.percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-3">
                              <div
                                className="h-3 rounded-full transition-all"
                                style={{
                                  width: `${stat.percentage}%`,
                                  background: PIE_COLORS[index % PIE_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics - Compact */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="gradient-card border-2 border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Acceptance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-acceptance-rate">
                        {acceptanceRateData?.acceptanceRate || 0}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Accepted / Reviewed</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Time to Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-time-to-assignment">
                        {timeToAssignmentData?.days || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Days avg</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-red-200 dark:border-red-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Blocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                      <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-blocked-requests">
                        {blockedRequestsData?.count || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Requests</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Overdue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {stats?.overdue || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Requests</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actionable Insights Panel */}
              <Card className="gradient-card border-2 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Actionable Insights
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Key alerts and recommendations</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Alerts */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        Alerts
                      </h4>
                      <div className="space-y-2">
                        {stats?.overdue && stats.overdue > 0 && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                {stats.overdue} Overdue Request{stats.overdue > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setLocation("/")}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {stats?.atRisk && stats.atRisk > 0 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                {stats.atRisk} At-Risk Request{stats.atRisk > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setLocation("/")}
                                className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {blockedRequestsData?.count && blockedRequestsData.count > 0 && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                {blockedRequestsData.count} Blocked Request{blockedRequestsData.count > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setLocation("/")}
                                className="text-xs text-yellow-600 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {(!stats?.overdue || stats.overdue === 0) && (!stats?.atRisk || stats.atRisk === 0) && (!blockedRequestsData?.count || blockedRequestsData.count === 0) && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <span className="text-sm text-green-700 dark:text-green-300">No active alerts</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        Recommendations
                      </h4>
                      <div className="space-y-2">
                        {departmentChartData.length > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Top Department:</strong> {departmentChartData.sort((a, b) => b.value - a.value)[0]?.name} has the most requests ({departmentChartData.sort((a, b) => b.value - a.value)[0]?.value})
                            </p>
                          </div>
                        )}
                        {completionRate < 80 && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              <strong>Completion Rate:</strong> Consider focusing on completing pending requests to improve the {completionRate}% completion rate
                            </p>
                          </div>
                        )}
                        {stats?.avgCompletionDays && stats.avgCompletionDays > 5 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              <strong>Completion Time:</strong> Average completion time is {stats.avgCompletionDays} days. Review processes to improve efficiency
                            </p>
                          </div>
                        )}
                        {(!departmentChartData.length || completionRate >= 80) && (!stats?.avgCompletionDays || stats.avgCompletionDays <= 5) && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <span className="text-sm text-green-700 dark:text-green-300">All metrics are healthy</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 space-y-4">
              {/* KPI Dashboard Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="gradient-card border-l-4 border-l-purple-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600">
                      <ListChecks className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">{taskStats?.totalTasks || 0}</div>
                    <p className="text-xs text-muted-foreground">All tasks</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-green-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">{taskCompletionRate}%</div>
                    <p className="text-xs text-muted-foreground">{taskStats?.completed || 0} of {taskStats?.totalTasks || 0} completed</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-blue-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400" data-testid="stat-avg-task-duration">
                      {avgTaskDuration?.days || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Days on average</p>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-l-4 border-l-red-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1 text-red-600 dark:text-red-400" data-testid="stat-overdue-tasks">
                      {overdueTasksData?.overdueTasks || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Past deadline</p>
                  </CardContent>
                </Card>
              </div>

              {/* Visual Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Task Status Distribution - Donut Chart */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Task Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {taskStatusChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <>
                        <ChartContainer
                          config={{
                            toDo: { label: "To Do", color: CHART_COLORS.purple },
                            inProgress: { label: "In Progress", color: CHART_COLORS.blue },
                            blocked: { label: "Blocked", color: CHART_COLORS.orange },
                            completed: { label: "Completed", color: CHART_COLORS.green },
                          }}
                          className="h-[220px]"
                        >
                          <RechartsPieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={taskStatusChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              label={false}
                            >
                              {taskStatusChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </RechartsPieChart>
                        </ChartContainer>
                        {/* Custom Legend */}
                        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                          {taskStatusChartData.map((entry) => (
                            <div key={entry.name} className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 shrink-0 rounded-sm border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="text-xs font-medium text-foreground">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Tasks by Assignee - Bar Chart */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      Tasks by Assignee (Top 10)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {taskAssigneeChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No assigned tasks</p>
                    ) : (
                      <ChartContainer
                        config={{
                          value: { label: "Tasks", color: CHART_COLORS.blue },
                        }}
                        className="h-[250px]"
                      >
                        <BarChart data={taskAssigneeChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="value" fill={CHART_COLORS.blue} radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>


                {/* Task Source Distribution */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      Task Source
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {taskLinkedChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                    ) : (
                      <ChartContainer
                        config={{
                          value: { label: "Tasks", color: CHART_COLORS.purple },
                        }}
                        className="h-[250px]"
                      >
                        <BarChart data={taskLinkedChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="value" fill={CHART_COLORS.purple} radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Completion Velocity */}
                <Card className="gradient-card">
                    <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                      Completion Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-[250px]">
                      <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2" data-testid="stat-completion-velocity">
                        {completionVelocity?.tasksPerWeek || 0}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Tasks completed per week</p>
                      {avgTaskDuration?.days && avgTaskDuration.days > 0 && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 w-full">
                          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                            Avg duration: <strong>{avgTaskDuration.days} days</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics - Compact */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="gradient-card border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Avg Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {avgTaskDuration?.days || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Days</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      Velocity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completion-velocity">
                        {completionVelocity?.tasksPerWeek || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Tasks/week</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-red-200 dark:border-red-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Overdue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-overdue-tasks">
                        {overdueTasksData?.overdueTasks || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Tasks</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="gradient-card border-2 border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      Blocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {taskStats?.blocked || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Tasks</p>
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
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Workload Calculation</h4>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="bg-card text-card-foreground p-3 rounded border border-border">
                        <p className="font-medium text-foreground mb-2">Simple Formula:</p>
                        <div className="font-mono text-xs text-blue-600 mb-3">
                          Workload Hours = Σ (Expected Time)
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Expected Time</strong> is calculated using <strong>PERT estimation</strong> during task creation, 
                          which already accounts for <strong>complexity</strong> and <strong>confidence</strong> levels.
                        </p>
                      </div>
                      
                      <div className="bg-card text-card-foreground p-3 rounded border border-border">
                        <p className="font-medium text-foreground mb-2">PERT Time Estimation:</p>
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
                          <p className="font-medium text-foreground mb-2">Capacity:</p>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <div><strong>1 Productive Day</strong> = 4.5 hours</div>
                            <div><strong>1 Productive Week</strong> = 22.5 hours (5 days)</div>
                            <div><strong>Productivity Factor</strong> = 75%</div>
                            <div className="text-xs mt-1 italic">Accounts for meetings, admin, and context switching</div>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-medium text-foreground mb-2">Capacity Levels:</p>
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
                      {teamWorkload.map((analyst) => (
                        <AnalystRow key={analyst.analystId} analyst={analyst} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actionable Insights Panel for Tasks */}
              <Card className="gradient-card border-2 border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Actionable Insights
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Key alerts and recommendations for task management</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Alerts */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        Alerts
                      </h4>
                      <div className="space-y-2">
                        {overdueTasksData?.overdueTasks && overdueTasksData.overdueTasks > 0 && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                {overdueTasksData.overdueTasks} Overdue Task{overdueTasksData.overdueTasks > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setLocation("/tasks?status=overdue")}
                                className="text-xs text-red-600 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {taskStats?.blocked && taskStats.blocked > 0 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                {taskStats.blocked} Blocked Task{taskStats.blocked > 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={() => setLocation("/tasks?status=blocked")}
                                className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {teamWorkload.length > 0 && teamWorkload.some(a => a.capacityLevel === 'overloaded' || a.capacityLevel === 'heavy') && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                {teamWorkload.filter(a => a.capacityLevel === 'overloaded' || a.capacityLevel === 'heavy').length} Analyst{teamWorkload.filter(a => a.capacityLevel === 'overloaded' || a.capacityLevel === 'heavy').length > 1 ? 's' : ''} Overloaded
                              </span>
                              <span className="text-xs text-yellow-600">Review workload above</span>
                            </div>
                          </div>
                        )}
                        {(!overdueTasksData?.overdueTasks || overdueTasksData.overdueTasks === 0) && (!taskStats?.blocked || taskStats.blocked === 0) && (!teamWorkload.length || !teamWorkload.some(a => a.capacityLevel === 'overloaded' || a.capacityLevel === 'heavy')) && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <span className="text-sm text-green-700 dark:text-green-300">No active alerts</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        Recommendations
                      </h4>
                      <div className="space-y-2">
                        {taskAssigneeChartData.length > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>Top Performer:</strong> {taskAssigneeChartData[0]?.name} has {taskAssigneeChartData[0]?.value} tasks assigned
                            </p>
                          </div>
                        )}
                        {taskCompletionRate < 70 && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                              <strong>Completion Rate:</strong> Current rate is {taskCompletionRate}%. Focus on completing pending tasks
                            </p>
                          </div>
                        )}
                        {avgTaskDuration?.days && avgTaskDuration.days > 7 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                            <p className="text-sm text-orange-700 dark:text-orange-300">
                              <strong>Duration:</strong> Average task duration is {avgTaskDuration.days} days. Review processes for efficiency
                            </p>
                          </div>
                        )}
                        {teamWorkload.length > 0 && teamWorkload.some(a => a.capacityLevel === 'available' || a.capacityLevel === 'light') && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              <strong>Capacity:</strong> {teamWorkload.filter(a => a.capacityLevel === 'available' || a.capacityLevel === 'light').length} analyst{teamWorkload.filter(a => a.capacityLevel === 'available' || a.capacityLevel === 'light').length > 1 ? 's' : ''} have available capacity for new tasks
                            </p>
                          </div>
                        )}
                        {(!taskAssigneeChartData.length || taskCompletionRate >= 70) && (!avgTaskDuration?.days || avgTaskDuration.days <= 7) && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <span className="text-sm text-green-700 dark:text-green-300">All metrics are healthy</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
            <RequestDetail 
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Task Detail Dialog - Navigate to tasks page for full functionality */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
            <div className="p-6">
              <p className="text-lg font-semibold mb-4">{selectedTask.title}</p>
              <p className="text-sm text-muted-foreground mb-4">
                For full task details and management, please visit the Tasks page.
              </p>
              <button
                onClick={() => {
                  setSelectedTask(null);
                  setLocation(`/tasks?taskId=${selectedTask.id}`);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Open in Tasks Page
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
