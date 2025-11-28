import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User as UserIcon, Calendar as CalendarIcon, ListChecks, Trash2, Eye, CornerDownRight, ExternalLink, Edit2, Check, X, Clock, Target, Info, ChevronDown, ChevronRight, AlertCircle, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import type { TaskWithDetails, User, DataRequestWithDetails } from "@shared/schema";

// Time conversion constants - aligned with analytics
const HOURS_PER_DAY = 6;
const PRODUCTIVITY_FACTOR = 0.75;
const EFFECTIVE_HOURS_PER_DAY = HOURS_PER_DAY * PRODUCTIVITY_FACTOR; // 4.5 hours

// Task health calculation helper
const getTaskHealth = (task: TaskWithDetails): {
  status: 'overdue' | 'at-risk' | 'blocked' | 'on-track' | 'no-date';
  message?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
} => {
  if (!task.dueDate) return { status: 'no-date' };
  
  const now = new Date();
  const due = new Date(task.dueDate);
  const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (task.status === 'blocked') {
    return { status: 'blocked', message: 'Task is blocked', daysUntilDue };
  }
  
  if (daysUntilDue < 0 && task.status !== 'completed') {
    const daysOverdue = Math.abs(daysUntilDue);
    return { 
      status: 'overdue', 
      message: `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
      daysOverdue 
    };
  }
  
  if (daysUntilDue <= 2 && task.status !== 'completed') {
    return { 
      status: 'at-risk', 
      message: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
      daysUntilDue 
    };
  }
  
  return { status: 'on-track', daysUntilDue };
};

export default function Tasks() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterDueDate, setFilterDueDate] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";

  // Fetch tasks with filters
  const { data: tasks = [], isLoading, error } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks", { status: filterStatus, assignedToId: filterAssignee }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterAssignee) params.append('assignedToId', filterAssignee);
      
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch tasks: ${response.status} ${errorText}`);
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Fetch analysts for assignment
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isAuthenticated && isTeamLead,
  });

  // Auto-update selectedTask when tasks data changes (for real-time updates)
  useEffect(() => {
    if (selectedTask && tasks.length > 0) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

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
  }, [searchString, location, setLocation]);

  // Organize tasks with sub-tasks nested under parents
  const parentTasks = tasks.filter(t => !t.parentTaskId);
  const subTasksMap = new Map<string, TaskWithDetails[]>();
  
  tasks.forEach(task => {
    if (task.parentTaskId) {
      if (!subTasksMap.has(task.parentTaskId)) {
        subTasksMap.set(task.parentTaskId, []);
      }
      subTasksMap.get(task.parentTaskId)?.push(task);
    }
  });

  // Enhanced sort function - NEW first, then by urgency
  const sortTasks = (a: TaskWithDetails, b: TaskWithDetails) => {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Get viewed status from localStorage
    const viewedTasks = JSON.parse(localStorage.getItem('viewedTasks') || '{}');
    const aIsViewed = viewedTasks[a.id] || false;
    const bIsViewed = viewedTasks[b.id] || false;
    
    // Check if tasks are NEW (created < 24h AND not viewed)
    const aIsNew = a.createdAt && (now - new Date(a.createdAt).getTime()) < dayInMs && !aIsViewed;
    const bIsNew = b.createdAt && (now - new Date(b.createdAt).getTime()) < dayInMs && !bIsViewed;
    
    // 1. NEW TASKS AT TOP (newest first)
    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    if (aIsNew && bIsNew) {
      return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
    }
    
    // 2. COMPLETED AT BOTTOM (recent first)
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'completed') {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    }
    
    // 3. BLOCKED BEFORE COMPLETED (by due date)
    if (a.status === 'blocked' && b.status !== 'blocked') return 1;
    if (a.status !== 'blocked' && b.status === 'blocked') return -1;
    if (a.status === 'blocked' && b.status === 'blocked') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    // 4. ACTIVE TASKS (not NEW, not blocked, not completed)
    // Sort by due date urgency (soonest first)
    
    if (!a.dueDate && !b.dueDate) {
      // Both no due date - by creation (newest first)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    // Sort by due date (earliest first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };

  // Sort parent tasks - new tasks first, then by due date
  const sortedParentTasks = [...parentTasks].sort(sortTasks);
  
  // Sort subtasks and create a sorted map
  const sortedSubTasksMap = new Map<string, TaskWithDetails[]>();
  subTasksMap.forEach((subTasks, parentId) => {
    sortedSubTasksMap.set(parentId, [...subTasks].sort(sortTasks));
  });
  
  // Check if task is new (created in last 24 hours AND not viewed)
  const isNewTask = (taskId: string, createdAt: Date | string | null) => {
    if (!createdAt) return false;
    const taskDate = new Date(createdAt);
    const now = new Date();
    const dayInMs = 24 * 60 * 60 * 1000;
    const isRecent = (now.getTime() - taskDate.getTime()) < dayInMs;
    
    if (!isRecent) return false;
    
    // Check if task has been viewed
    const viewedTasks = JSON.parse(localStorage.getItem('viewedTasks') || '{}');
    return !viewedTasks[taskId];
  };

  // Apply due date filtering
  const filterTasksByDueDate = (tasks: TaskWithDetails[]) => {
    if (!filterDueDate || filterDueDate === 'all') return tasks;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - today.getDay()));
    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
    
    return tasks.filter(task => {
      if (!task.dueDate && filterDueDate === 'no_date') return true;
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      
      switch (filterDueDate) {
        case 'overdue':
          return dueDay < today && task.status !== 'completed';
        case 'today':
          return dueDay.getTime() === today.getTime();
        case 'tomorrow':
          return dueDay.getTime() === tomorrow.getTime();
        case 'this_week':
          return dueDay >= today && dueDay <= endOfWeek;
        case 'next_week':
          return dueDay > endOfWeek && dueDay <= endOfNextWeek;
        default:
          return true;
      }
    });
  };

  // Apply due date filter to parent tasks
  const filteredParentTasks = filterTasksByDueDate(sortedParentTasks);

  // Create flattened list with sub-tasks nested under parents
  const sortedTasks: TaskWithDetails[] = [];
  filteredParentTasks.forEach(parent => {
    sortedTasks.push(parent);
    const sortedSubTasks = sortedSubTasksMap.get(parent.id) || [];
    sortedTasks.push(...sortedSubTasks);
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status, blockingReason }: { id: string; status: string; blockingReason?: string | null }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}/status`, { status, blockingReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task status updated" });
    },
    onError: (error: Error) => {
      // If blocking without reason, guide user to detail modal
      if (error.message?.includes("Blocking reason is required")) {
        toast({ 
          title: "Blocking Reason Required", 
          description: "Please open the task detail to provide a blocking reason.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to update task status",
          variant: "destructive" 
        });
      }
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      to_do: "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      in_progress: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
      blocked: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
      completed: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    };
    return variants[status as keyof typeof variants] || variants.to_do;
  };

  const formatStatus = (status: string) => {
    const statusMap = {
      to_do: "To Do",
      in_progress: "In Progress",
      blocked: "Blocked",
      completed: "Completed",
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div>
        <Sidebar 
          onNewRequest={() => setLocation("/new-request")} 
          user={user as any} 
        />
        <main className="md:ml-64 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1" data-testid="page-title">Team Tasks</h1>
              <p className="text-muted-foreground">Manage your team's tasks and workload</p>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              data-testid="button-create-task"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6 sticky top-[73px] z-20 bg-card">
            <CardContent className="p-4">
              <div className="flex gap-3 flex-wrap">
                <Select value={filterStatus || "all"} onValueChange={(value) => setFilterStatus(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="to_do">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDueDate || "all"} onValueChange={(value) => setFilterDueDate(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-[200px]" data-testid="select-due-date-filter">
                    <SelectValue placeholder="All Due Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Due Dates</SelectItem>
                    <SelectItem value="overdue">🔴 Overdue</SelectItem>
                    <SelectItem value="today">📅 Due Today</SelectItem>
                    <SelectItem value="tomorrow">📅 Due Tomorrow</SelectItem>
                    <SelectItem value="this_week">📅 Due This Week</SelectItem>
                    <SelectItem value="next_week">📅 Due Next Week</SelectItem>
                    <SelectItem value="no_date">❓ No Due Date</SelectItem>
                  </SelectContent>
                </Select>

                {isTeamLead && (
                  <Select value={filterAssignee || "all"} onValueChange={(value) => setFilterAssignee(value === "all" ? "" : value)}>
                    <SelectTrigger className="w-[200px]" data-testid="select-assignee-filter">
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {analysts.map(analyst => (
                        <SelectItem key={analyst.id} value={analyst.id}>
                          {analyst.firstName} {analyst.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tasks Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : error ? (
            <Card className="p-12 text-center">
              <p className="text-destructive font-semibold mb-2">Error loading tasks</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </Card>
          ) : filteredParentTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {tasks.length === 0 
                  ? "No tasks found. Create a new task to get started!" 
                  : `No parent tasks found matching your criteria (${tasks.length} total task${tasks.length !== 1 ? 's' : ''}, but all are sub-tasks)`}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredParentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isNew={isNewTask(task.id, task.createdAt)}
                  subTasks={sortedSubTasksMap.get(task.id) || []}
                  onSelectTask={(task) => {
                    // Mark task as viewed
                    const viewedTasks = JSON.parse(localStorage.getItem('viewedTasks') || '{}');
                    viewedTasks[task.id] = true;
                    localStorage.setItem('viewedTasks', JSON.stringify(viewedTasks));
                    setSelectedTask(task);
                  }}
                  onSelectRequest={setSelectedRequest}
                  updateStatusMutation={updateTaskStatusMutation}
                  getStatusBadge={getStatusBadge}
                  formatStatus={formatStatus}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog 
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] })}
          onSelectTask={setSelectedTask}
          onSelectRequest={setSelectedRequest}
        />
      )}

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

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        }}
      />
    </div>
  );
}

// Task Card Component
function TaskCard({ 
  task,
  isNew,
  subTasks,
  onSelectTask,
  onSelectRequest,
  updateStatusMutation,
  getStatusBadge,
  formatStatus,
}: { 
  task: TaskWithDetails;
  isNew: boolean;
  subTasks: TaskWithDetails[];
  onSelectTask: (task: TaskWithDetails) => void;
  onSelectRequest: (request: DataRequestWithDetails) => void;
  updateStatusMutation: any;
  getStatusBadge: (status: string) => string;
  formatStatus: (status: string) => string;
}) {
  const { isAuthenticated } = useAuth();
  const [showSubtasks, setShowSubtasks] = useState(false); // Collapsible subtasks state

  // Fetch sub-task progress
  const { data: progress } = useQuery<{ total: number; completed: number }>({
    queryKey: ["/api/tasks", task.id, "subtasks", "progress"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}/subtasks/progress`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sub-task progress');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // Calculate subtask summary
  const subtaskSummary = {
    total: subTasks.length,
    completed: subTasks.filter(st => st.status === 'completed').length,
    allocatedHours: subTasks.reduce((sum, st) => sum + (st.expectedTime || 0), 0),
    remainingHours: (task.expectedTime || 0) - subTasks.reduce((sum, st) => sum + (st.expectedTime || 0), 0),
  };

  const handleRequestClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.request) {
      try {
        const response = await fetch(`/api/requests/${task.request.id}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch request');
        const requestData = await response.json();
        onSelectRequest(requestData);
      } catch (error) {
        console.error('Error fetching request:', error);
      }
    }
  };

  // Get task health status
  const health = getTaskHealth(task);
  
  // Health status colors
  const healthColors = {
    'overdue': 'border-l-red-500 dark:border-l-red-600',
    'at-risk': 'border-l-yellow-500 dark:border-l-yellow-600',
    'blocked': 'border-l-gray-500 dark:border-l-gray-600',
    'on-track': 'border-l-green-500 dark:border-l-green-600',
    'no-date': 'border-l-gray-200 dark:border-l-gray-700',
  };

  return (
    <Card 
      className={`border-2 border-border hover:border-purple-400 dark:hover:border-purple-600 bg-card shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden border-l-4 ${healthColors[health.status]}`}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-5">
        {/* Health Warning Banner */}
        {(health.status === 'overdue' || health.status === 'at-risk' || health.status === 'blocked') && health.message && (
          <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${
            health.status === 'overdue' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300' :
            health.status === 'at-risk' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300' :
            'bg-gray-50 dark:bg-gray-950/20 text-gray-700 dark:text-gray-300'
          }`}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-semibold uppercase">{health.message}</span>
          </div>
        )}
        
        {/* Main Task Row */}
        <div className="flex flex-col gap-4">
          {/* Top Section: Title and Badges */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 cursor-pointer" onClick={() => {
              // Mark as viewed when clicking title
              const viewedTasks = JSON.parse(localStorage.getItem('viewedTasks') || '{}');
              viewedTasks[task.id] = true;
              localStorage.setItem('viewedTasks', JSON.stringify(viewedTasks));
              onSelectTask(task);
            }}>
              <h3 className="text-xl font-bold mb-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors line-clamp-2" data-testid={`task-title-${task.id}`}>
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* NEW Badge for tasks created in last 24 hours */}
                {isNew && (
                  <Badge className="text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                    ✨ NEW
                  </Badge>
                )}
                
                {task.requestId && task.request ? (
                  <button
                    onClick={handleRequestClick}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                    data-testid={`link-request-${task.id}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Request #{task.request.requestNumber}
                  </button>
                ) : (
                  <Badge variant="outline" className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                    Team Task
                  </Badge>
                )}
                
                {/* Time Estimation Badge */}
                {task.expectedTime && (
                  <Badge variant="outline" className="text-xs font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                    <Clock className="w-3 h-3" />
                    {task.expectedTime >= EFFECTIVE_HOURS_PER_DAY
                      ? `${(task.expectedTime / EFFECTIVE_HOURS_PER_DAY).toFixed(1)}d`
                      : `${task.expectedTime.toFixed(1)}h`
                    }
                  </Badge>
                )}
                
                {progress && progress.total > 0 && (
                  <Badge variant="outline" className="text-xs font-medium flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                    <ListChecks className="w-3.5 h-3.5" />
                    {progress.completed}/{progress.total} subtasks
                  </Badge>
                )}
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={() => {
                // Mark as viewed when clicking View button
                const viewedTasks = JSON.parse(localStorage.getItem('viewedTasks') || '{}');
                viewedTasks[task.id] = true;
                localStorage.setItem('viewedTasks', JSON.stringify(viewedTasks));
                onSelectTask(task);
              }}
              className="h-9 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all rounded-lg font-medium"
              data-testid={`button-view-task-${task.id}`}
            >
              <Eye className="w-4 h-4 mr-1.5" />
              View
            </Button>
          </div>

          {/* Bottom Section: Metadata Grid */}
          <div className="grid grid-cols-4 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            {/* Assigned To */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900">
                <UserIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Assigned To</p>
                <p className="text-sm font-semibold truncate">
                  {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}
                </p>
              </div>
            </div>

            {/* Status */}
            <div onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Status</p>
              <Select 
                value={task.status} 
                onValueChange={(newStatus) => {
                  if (newStatus === 'blocked') {
                    // Guide user to detail modal for blocking
                    onSelectTask(task);
                  } else {
                    updateStatusMutation.mutate({ id: task.id, status: newStatus, blockingReason: null });
                  }
                }}
              >
                <SelectTrigger 
                  className={`w-full h-9 font-semibold ${getStatusBadge(task.status)}`}
                  data-testid={`select-status-${task.id}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_do">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed" disabled={!!(task.requestId && !task.parentTaskId)}>
                    Completed {task.requestId && !task.parentTaskId && "(via delivery)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900">
                <CalendarIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Due Date</p>
                <p className="text-sm font-semibold">
                  {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                </p>
              </div>
            </div>

            {/* Expected Time */}
            {task.expectedTime && (
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900 dark:to-yellow-900">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">Expected</p>
                  <p className="text-sm font-semibold">
                    {task.expectedTime >= EFFECTIVE_HOURS_PER_DAY
                      ? `${(task.expectedTime / EFFECTIVE_HOURS_PER_DAY).toFixed(1)} days`
                      : `${task.expectedTime.toFixed(1)} hours`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Subtasks Section - Collapsible */}
        {subTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t-2 border-blue-300 dark:border-blue-700">
            {/* Subtask Header - Clickable to expand/collapse */}
            <button
              onClick={() => setShowSubtasks(!showSubtasks)}
              className="w-full flex items-center justify-between p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {showSubtasks ? (
                  <ChevronDown className="w-4 h-4 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 transition-transform" />
                )}
                <CornerDownRight className="w-3.5 h-3.5" />
                <span>SUBTASKS ({subtaskSummary.total})</span>
              </div>
              
              {/* Subtask Summary - shown when collapsed */}
              {!showSubtasks && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-600" />
                    {subtaskSummary.completed} completed
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {subtaskSummary.allocatedHours.toFixed(1)}h allocated
                  </span>
                  {subtaskSummary.remainingHours > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 font-medium">
                        {subtaskSummary.remainingHours.toFixed(1)}h remaining
                      </span>
                    </>
                  )}
                </div>
              )}
            </button>

            {/* Subtask List - shown when expanded */}
            {showSubtasks && (
              <div className="space-y-2.5 mt-3">
                {subTasks.map((subTask) => (
                  <div 
                    key={subTask.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-br from-blue-50/60 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all"
                    data-testid={`subtask-${subTask.id}`}
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectTask(subTask)}>
                      <p className="text-sm font-semibold text-foreground mb-1">{subTask.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {subTask.assignedTo ? `${subTask.assignedTo.firstName} ${subTask.assignedTo.lastName}` : "Unassigned"}
                        </span>
                        {subTask.expectedTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {subTask.expectedTime.toFixed(1)}h
                          </span>
                        )}
                        {subTask.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(subTask.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-32" onClick={(e) => e.stopPropagation()}>
                      <Select 
                        value={subTask.status} 
                        onValueChange={(newStatus) => {
                          if (newStatus === 'blocked') {
                            // Guide user to detail modal for blocking (open parent task to see subtask)
                            onSelectTask(task);
                          } else {
                            updateStatusMutation.mutate({ id: subTask.id, status: newStatus, blockingReason: null });
                          }
                        }}
                      >
                        <SelectTrigger 
                          className={`w-full h-8 text-xs font-medium ${getStatusBadge(subTask.status)}`}
                          data-testid={`select-status-${subTask.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="to_do">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectTask(subTask)}
                      className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                      data-testid={`button-view-subtask-${subTask.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Task Row Component
function TaskRow({ 
  task, 
  onSelectTask,
  onSelectRequest,
  updateStatusMutation,
  getStatusBadge,
  formatStatus,
  setLocation
}: { 
  task: TaskWithDetails; 
  onSelectTask: (task: TaskWithDetails) => void;
  onSelectRequest: (request: DataRequestWithDetails) => void;
  updateStatusMutation: any;
  getStatusBadge: (status: string) => string;
  formatStatus: (status: string) => string;
  setLocation: (path: string) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const isSubTask = !!task.parentTaskId;

  // Fetch sub-task progress for parent tasks only
  const { data: progress } = useQuery<{ total: number; completed: number }>({
    queryKey: ["/api/tasks", task.id, "subtasks", "progress"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}/subtasks/progress`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sub-task progress');
      return response.json();
    },
    enabled: isAuthenticated && !isSubTask,
  });

  const handleRequestClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.request) {
      try {
        const response = await fetch(`/api/requests/${task.request.id}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch request');
        const requestData = await response.json();
        onSelectRequest(requestData);
      } catch (error) {
        console.error('Error fetching request:', error);
      }
    }
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 transition-colors border-b border-border ${isSubTask ? 'bg-muted/20' : ''}`}
      data-testid={`task-row-${task.id}`}
    >
      {/* Task Title Cell with Better Visual Hierarchy */}
      <TableCell className={`py-4 ${isSubTask ? 'pl-12 border-l-4 border-blue-300 dark:border-blue-700' : ''}`}>
        <div className="flex flex-col gap-2">
          {/* Title Row with Type Badge and Request Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Badge BEFORE Title */}
            {task.requestId ? (
              <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                Request Task
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                Team Task
              </Badge>
            )}
            
            {/* Request Number Badge (if applicable) */}
            {task.request && (
              <button
                onClick={handleRequestClick}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-colors"
                data-testid={`link-request-${task.id}`}
              >
                Request #{task.request.requestNumber}
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            
            {/* Sub-task Progress Badge */}
            {progress && progress.total > 0 && (
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <ListChecks className="w-3 h-3" />
                {progress.completed}/{progress.total}
              </Badge>
            )}
          </div>
          
          {/* Task Title */}
          <div 
            className={`${isSubTask ? 'text-sm font-medium text-muted-foreground' : 'text-base font-semibold'} cursor-pointer hover:text-primary transition-colors`}
            onClick={() => onSelectTask(task)}
            data-testid={`task-title-${task.id}`}
          >
            {task.title}
          </div>
          
          {/* Description (if exists) */}
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </TableCell>
      
      {/* Assigned To Cell with Icon */}
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-muted-foreground" />
          {task.assignedTo ? (
            <span className="text-sm font-medium">
              {task.assignedTo.firstName} {task.assignedTo.lastName}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground italic">Unassigned</span>
          )}
        </div>
      </TableCell>
      
      {/* Status Cell */}
      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
        <Select 
          value={task.status} 
          onValueChange={(newStatus) => updateStatusMutation.mutate({ id: task.id, status: newStatus })}
        >
          <SelectTrigger 
            className={`w-36 ${getStatusBadge(task.status)}`}
            data-testid={`select-status-${task.id}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="to_do">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="completed" disabled={!!(task.requestId && !task.parentTaskId)}>
              Completed {task.requestId && !task.parentTaskId && "(via delivery)"}
            </SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      
      {/* Due Date Cell with Icon */}
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
          {task.dueDate ? (
            <span className="text-sm font-medium">{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </TableCell>
      
      {/* Time Estimation Cell */}
      <TableCell className="py-4">
        {task.expectedTime ? (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-sm font-medium">
              {task.expectedTime >= EFFECTIVE_HOURS_PER_DAY
                ? `${(task.expectedTime / EFFECTIVE_HOURS_PER_DAY).toFixed(1)}d`
                : `${task.expectedTime.toFixed(1)}h`
              }
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
      
      {/* Actions Cell */}
      <TableCell className="py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTask(task);
          }}
          className="hover:bg-primary/10"
          data-testid={`button-view-${task.id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// Task Detail Dialog Component
function TaskDetailDialog({ 
  task, 
  open, 
  onClose, 
  onUpdate,
  onSelectTask,
  onSelectRequest
}: { 
  task: TaskWithDetails; 
  open: boolean; 
  onClose: () => void;
  onUpdate: () => void;
  onSelectTask: (task: TaskWithDetails) => void;
  onSelectRequest: (request: DataRequestWithDetails) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSubTaskId, setDeletingSubTaskId] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
  const [editingTime, setEditingTime] = useState(false);
  const [editedHours, setEditedHours] = useState<number | ''>('');
  const [displayExpectedHours, setDisplayExpectedHours] = useState<number>(Number(task.expectedTime || 0));
  const justUpdatedHoursRef = useRef(false);
  const lastProcessedExpectedTimeRef = useRef<number | null>(null);
  const [showBlockingReasonModal, setShowBlockingReasonModal] = useState(false);
  const [blockingReasonInput, setBlockingReasonInput] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [blockingTaskId, setBlockingTaskId] = useState<string | null>(null); // ID of task/subtask being blocked
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(task.requestId || null);

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";
  const isSubTask = !!task.parentTaskId; // Check if this task is itself a subtask
  const canLinkRequest = isTeamLead || isAnalyst; // Both Data Lead and Analysts can link tasks to requests
  
  // Update dueDateValue when task changes
  useEffect(() => {
    setDueDateValue(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
    setEditingDueDate(false);
  }, [task.id, task.dueDate]);
  
  // Determine if user can reassign THIS task based on task type
  // Main tasks: only Data Lead can reassign
  // Subtasks: both Data Lead and Analyst can reassign
  const canReassign = isSubTask ? (isTeamLead || isAnalyst) : isTeamLead;

  // Fetch analysts for assignment dropdown
  // Always fetch for Data Lead or Analyst (needed for reassigning subtasks even when viewing a main task)
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: open && (isTeamLead || isAnalyst),
  });

  // Fetch sub-tasks (only for parent tasks)
  const { data: subTasks = [] } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks", task.id, "subtasks"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}/subtasks`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sub-tasks');
      return response.json();
    },
    enabled: open && !isSubTask, // Only fetch if not a subtask
  });

  // Fetch requests for linking (only for Data Lead and Analysts)
  const { data: availableRequests = [] } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests"],
    queryFn: async () => {
      const response = await fetch(`/api/requests`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
    enabled: open && canLinkRequest,
  });

  // Update selectedRequestId when task changes
  useEffect(() => {
    setSelectedRequestId(task.requestId || null);
  }, [task.requestId]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, blockingReason }: { status: string; blockingReason?: string | null }) => {
      return await apiRequest("PATCH", `/api/tasks/${task.id}/status`, { status, blockingReason });
    },
    onSuccess: async (updatedTask) => {
      // Refetch the full task with all relations to ensure we have the latest data
      try {
        const response = await fetch(`/api/tasks/${task.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const fullTask = await response.json();
          onSelectTask(fullTask);
        } else {
          // If refetch fails, use the updated task from the response
          if (updatedTask) {
            onSelectTask(updatedTask);
          }
        }
      } catch (error) {
        // If refetch fails, use the updated task from the response
        if (updatedTask) {
          onSelectTask(updatedTask);
        }
      }
      
      // Invalidate and refetch tasks list to ensure it's up to date
      // Use refetchQueries to ensure data is actually refetched
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id] });
      
      toast({ title: "Success", description: "Task status updated" });
      onUpdate();
      setShowBlockingReasonModal(false);
      setBlockingReasonInput("");
      setPendingStatus(null);
      setBlockingTaskId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      return await apiRequest("PATCH", `/api/tasks/${task.id}/assign`, { assignedToId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
      toast({ title: "Success", description: "Task assignee updated" });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignee",
        variant: "destructive",
      });
    },
  });

  const updateDueDateMutation = useMutation({
    mutationFn: async (dueDate: string | null) => {
      // Convert date string to ISO timestamp for the database
      const formattedDate = dueDate ? new Date(dueDate).toISOString() : null;
      return await apiRequest("PATCH", `/api/tasks/${task.id}`, { dueDate: formattedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
      toast({ title: "Success", description: "Due date updated" });
      setEditingDueDate(false);
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update due date",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task deleted successfully" });
      setShowDeleteDialog(false);
      onClose();
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: async (subTaskId: string) => {
      return await apiRequest("DELETE", `/api/tasks/${subTaskId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
      toast({ title: "Success", description: "Sub-task deleted successfully" });
      setDeletingSubTaskId(null);
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sub-task",
        variant: "destructive",
      });
      setDeletingSubTaskId(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      to_do: "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
      in_progress: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700",
      blocked: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
      completed: "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
    };
    return variants[status as keyof typeof variants] || variants.to_do;
  };

  // Reset tracking ref when task changes or dialog opens
  useEffect(() => {
    if (open) {
      lastProcessedExpectedTimeRef.current = null;
    }
  }, [open, task?.id]);

  useEffect(() => {
    if (open && typeof task?.expectedTime === 'number') {
      const taskHours = Number(task.expectedTime);
      const roundedHours = Number(task.expectedTime.toFixed(1));
      
      // Check if task.expectedTime actually changed from what we last processed
      const hasTaskValueChanged = lastProcessedExpectedTimeRef.current === null || 
                                   Math.abs(taskHours - lastProcessedExpectedTimeRef.current) > 0.01;
      
      // Update editedHours to match the task, but only if not currently editing
      if (!editingTime && hasTaskValueChanged) {
        setEditedHours(roundedHours);
      }
      
      // Only update displayExpectedHours if:
      // 1. We're not currently editing
      // 2. We haven't just updated (within the guard period)
      // 3. The task value actually changed from what we last processed
      // 4. The new value is actually different from what we're displaying
      if (!editingTime && 
          !justUpdatedHoursRef.current && 
          hasTaskValueChanged) {
        const currentDisplayHours = displayExpectedHours;
        const isValueDifferent = Math.abs(taskHours - currentDisplayHours) > 0.01;
        
        if (isValueDifferent) {
          setDisplayExpectedHours(taskHours);
        }
        
        // Track that we've processed this expectedTime value
        lastProcessedExpectedTimeRef.current = taskHours;
      }
    }
  }, [open, task?.id, task?.expectedTime, editingTime, displayExpectedHours]);

  const updateTimeMutation = useMutation({
    mutationFn: async () => {
      if (typeof editedHours !== 'number') return;
      return await apiRequest('PATCH', `/api/tasks/${task.id}`, {
        expectedTime: Number(editedHours)
      });
    },
    onSuccess: async () => {
      // Update the local dialog immediately for better UX
      const newHours = Number((editedHours as number).toFixed(1));
      setDisplayExpectedHours(newHours);
      // Mark that we've processed this value to prevent reverts from stale refetch data
      lastProcessedExpectedTimeRef.current = newHours;
      justUpdatedHoursRef.current = true;
      setTimeout(() => { justUpdatedHoursRef.current = false; }, 1500);
      const fresh = { ...task, expectedTime: newHours } as TaskWithDetails;
      onSelectTask?.(fresh);
      
      // Invalidate and refetch queries to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      await queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id] });
      
      toast({ title: 'Success', description: 'Task time updated' });
      setEditingTime(false);
      onUpdate();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update time', variant: 'destructive' });
    },
  });

  const updateRequestLinkMutation = useMutation({
    mutationFn: async (requestId: string | null) => {
      return await apiRequest('PATCH', `/api/tasks/${task.id}`, {
        requestId: requestId || null
      });
    },
    onSuccess: async (updatedTask) => {
      // Refetch the full task with all relations
      try {
        const response = await fetch(`/api/tasks/${task.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const fullTask = await response.json();
          onSelectTask(fullTask);
        } else if (updatedTask) {
          onSelectTask(updatedTask);
        }
      } catch (error) {
        if (updatedTask) {
          onSelectTask(updatedTask);
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      await queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id] });
      
      toast({ 
        title: 'Success', 
        description: requestId ? 'Task linked to request successfully' : 'Task unlinked from request successfully' 
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to update request link', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[1200px] max-w-[98vw] max-h-[90vh] overflow-y-auto" data-testid="dialog-task-detail">
        <DialogHeader className="pb-4 border-b pr-12">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold" data-testid="task-detail-title">{task.title}</DialogTitle>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {task.requestId ? (
                  <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                    Request Task
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">
                    Team Task
                  </Badge>
                )}
                {task.request && (
                  <button
                    onClick={async () => {
                      if (task.request) {
                        try {
                          const response = await fetch(`/api/requests/${task.request.id}`, {
                            credentials: 'include',
                          });
                          if (!response.ok) throw new Error('Failed to fetch request');
                          const requestData = await response.json();
                          onSelectRequest(requestData);
                        } catch (error) {
                          console.error('Error fetching request:', error);
                          toast({
                            title: "Error",
                            description: "Failed to load request details",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-colors"
                  >
                    Request #{task.request.requestNumber}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Select 
                value={task.status} 
                onValueChange={(value) => {
                  if (value === 'blocked') {
                    // Open modal to get blocking reason
                    setPendingStatus(value);
                    setBlockingTaskId(task.id);
                    setShowBlockingReasonModal(true);
                  } else {
                    // For other statuses, update directly (blocking reason will be cleared)
                    updateStatusMutation.mutate({ status: value, blockingReason: null });
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className={`w-40 ${getStatusBadge(task.status)}`} data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_do">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed" disabled={!!(task.requestId && !task.parentTaskId)}>
                    Completed {task.requestId && !task.parentTaskId && "(via delivery)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Task Information Grid - 6 columns if request linking available, 5 otherwise */}
          <div className={`grid gap-3 ${canLinkRequest ? 'grid-cols-6' : 'grid-cols-5'}`}>
            {/* Assigned To Card */}
            <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative group overflow-visible">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                </div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Assigned To</Label>
              </div>
              {canReassign ? (
                <div className="mt-1.5">
                  <Select
                    value={task.assignedToId || "unassigned"}
                    onValueChange={(value) => {
                      const assignedToId = value === "unassigned" ? null : value;
                      updateAssigneeMutation.mutate(assignedToId);
                    }}
                    disabled={updateAssigneeMutation.isPending}
                  >
                    <SelectTrigger 
                      className="h-8 text-xs w-full"
                      data-testid="select-task-assignee"
                    >
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {analysts.map((analyst) => (
                        <SelectItem key={analyst.id} value={analyst.id}>
                          {analyst.firstName} {analyst.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                ) : (
                <p className="text-sm font-medium truncate pl-1 mt-1.5">
                    {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}
                </p>
              )}
            </Card>

            {/* Due Date Card */}
            <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative group overflow-visible">
              <div className={`flex items-center gap-2 ${editingDueDate ? 'min-h-[124px]' : ''}`}> 
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CalendarIcon className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</Label>
                  {editingDueDate ? (
                    <div className="flex flex-col items-center justify-center gap-3 w-full pt-1">
                      <Input
                        type="date"
                        value={dueDateValue}
                        onChange={(e) => setDueDateValue(e.target.value)}
                        className="h-7 text-xs"
                        data-testid="input-edit-due-date"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => updateDueDateMutation.mutate(dueDateValue || null)}
                          disabled={updateDueDateMutation.isPending}
                          data-testid="button-save-due-date"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingDueDate(false);
                            setDueDateValue(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
                          }}
                          data-testid="button-cancel-due-date"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium mt-0.5 truncate">
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                    </p>
                  )}
                </div>
                {isTeamLead && !editingDueDate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingDueDate(true)}
                    data-testid="button-edit-due-date"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>

            {/* Time Estimation Card */}
            <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative group overflow-visible">
              <div className={`flex items-center gap-2 ${editingTime ? 'min-h-[124px]' : ''}`}> 
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Time Estimation
                  </Label>
                  {!editingTime ? (
                    <div className="mt-0.5 text-sm">
                      <span className="font-bold">{((displayExpectedHours ?? 0) / EFFECTIVE_HOURS_PER_DAY).toFixed(2)} days</span>
                      {` (`}<span className="font-medium">{(displayExpectedHours ?? 0).toFixed(1)} hours</span>{`)`}
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-col gap-2">
                      <div className="flex flex-col items-center justify-center gap-2 w-full pt-1">
                        <Label className="text-xs w-28">Task Hours</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editedHours}
                          onChange={(e) => setEditedHours(e.target.value === '' ? '' : Number(e.target.value))}
                          className="h-8 text-xs"
                        />
                        {typeof editedHours === 'number' && (
                          <div className="text-xs">
                            <span className="font-bold">{(editedHours / EFFECTIVE_HOURS_PER_DAY).toFixed(2)} days</span>
                            {` (`}<span className="font-medium">{editedHours.toFixed(1)} hours</span>{`)`}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => updateTimeMutation.mutate()}
                            disabled={updateTimeMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingTime(false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {!editingTime && isTeamLead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingTime(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </Card>

            {/* Created By Card */}
            <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <UserIcon className="w-4 h-4 text-green-600 dark:text-green-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created By</Label>
                  <p className="text-sm font-medium mt-0.5 truncate">
                    {task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : "Unknown"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Linked Request Card */}
            {canLinkRequest && (
              <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 relative group overflow-visible">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked Request</Label>
                    <Select
                      value={selectedRequestId || "none"}
                      onValueChange={(value) => {
                        const newRequestId = value === "none" ? null : value;
                        setSelectedRequestId(newRequestId);
                        updateRequestLinkMutation.mutate(newRequestId);
                      }}
                      disabled={updateRequestLinkMutation.isPending}
                    >
                      <SelectTrigger 
                        className="h-8 text-xs w-full mt-1.5"
                        data-testid="select-task-request"
                      >
                        <SelectValue placeholder="No request linked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No request linked</SelectItem>
                        {availableRequests.map((req) => (
                          <SelectItem key={req.id} value={req.id}>
                            #{req.requestNumber} - {req.title.substring(0, 40)}{req.title.length > 40 ? '...' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            )}

            {/* Created Date Card */}
            <Card className="p-3 h-full w-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <CalendarIcon className="w-4 h-4 text-orange-600 dark:text-orange-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Created On</Label>
                  <p className="text-sm font-medium mt-0.5 truncate">
                    {task.createdAt ? format(new Date(task.createdAt), "MMM d, yyyy") : "Unknown"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Description Section */}
          {task.description && (
            <Card className="p-4 bg-gradient-to-br from-blue-50/30 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/20 border-l-4 border-blue-500">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
              <p className="text-sm mt-2 leading-relaxed">{task.description}</p>
            </Card>
          )}

          {/* Blocking Reason Section - Only show when status is blocked and reason exists */}
          {task.status === 'blocked' && task.blockingReason && (
            <Card className="p-4 bg-gradient-to-br from-red-50/30 to-orange-50/30 dark:from-red-950/20 dark:to-orange-950/20 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Blocking Reason</Label>
              </div>
              <p className="text-sm mt-2 leading-relaxed text-foreground">{task.blockingReason}</p>
            </Card>
          )}

          {/* Sub-tasks Section - Only show for parent tasks, not subtasks */}
          {!isSubTask && (
            <Card className="p-5 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <ListChecks className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <Label className="text-base font-bold">Sub-tasks ({subTasks.length})</Label>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowSubTaskForm(!showSubTaskForm)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
                  data-testid="button-add-subtask"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Sub-task
                </Button>
              </div>

            {showSubTaskForm && (
              <div className="mb-4">
                <SubTaskForm
                  parentTaskId={task.id}
                  parentTask={task}
                  subTasks={subTasks}
                  onSuccess={() => {
                    setShowSubTaskForm(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                  }}
                  onCancel={() => setShowSubTaskForm(false)}
                />
              </div>
            )}

            <div className="space-y-3">
              {subTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-3">
                    <ListChecks className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sub-tasks yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add Sub-task" to create one</p>
                </div>
              ) : (
                subTasks.map((subTask) => (
                  <Card key={subTask.id} className="p-3 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-l-4 border-blue-500 dark:border-blue-600 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* Task Title Column */}
                      <div className="col-span-2 flex items-center gap-2">
                        <CornerDownRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <h5 className="font-semibold text-sm truncate">{subTask.title}</h5>
                          {subTask.description && (
                            <p className="text-xs text-muted-foreground truncate">{subTask.description}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Assigned To Column */}
                      <div className="col-span-2">
                        {(isTeamLead || isAnalyst) ? (
                          <Select
                            value={subTask.assignedToId || "unassigned"}
                            onValueChange={(value) => {
                              const assignedToId = value === "unassigned" ? null : value;
                              apiRequest("PATCH", `/api/tasks/${subTask.id}/assign`, { assignedToId })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
                                  toast({ title: "Success", description: "Sub-task assignee updated" });
                                })
                                .catch((error: Error) => {
                                  toast({ 
                                    title: "Error", 
                                    description: error.message || "Failed to update assignee",
                                    variant: "destructive" 
                                  });
                                });
                            }}
                          >
                            <SelectTrigger 
                              className="w-full h-7 text-xs border-muted"
                              data-testid={`select-subtask-assignee-${subTask.id}`}
                            >
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {analysts.map((analyst) => (
                                <SelectItem key={analyst.id} value={analyst.id}>
                                  {analyst.firstName} {analyst.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {subTask.assignedTo ? `${subTask.assignedTo.firstName} ${subTask.assignedTo.lastName}` : "—"}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Column */}
                      <div className="col-span-2">
                        <Select 
                          value={subTask.status} 
                          onValueChange={(newStatus) => {
                            if (newStatus === 'blocked') {
                              // Open modal to get blocking reason for subtask
                              setPendingStatus(newStatus);
                              setBlockingTaskId(subTask.id);
                              setShowBlockingReasonModal(true);
                            } else {
                              apiRequest("PATCH", `/api/tasks/${subTask.id}/status`, { status: newStatus, blockingReason: null })
                                .then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
                                  toast({ title: "Success", description: "Sub-task status updated" });
                                })
                                .catch((error: Error) => {
                                  toast({ 
                                    title: "Error", 
                                    description: error.message || "Failed to update status",
                                    variant: "destructive" 
                                  });
                                });
                            }
                          }}
                        >
                          <SelectTrigger 
                            className={`w-full h-7 text-xs ${getStatusBadge(subTask.status)}`}
                            data-testid={`select-subtask-status-${subTask.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to_do">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Expected Time Column */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        {subTask.expectedTime ? (
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            {subTask.expectedTime >= EFFECTIVE_HOURS_PER_DAY
                              ? `${(subTask.expectedTime / EFFECTIVE_HOURS_PER_DAY).toFixed(1)}d`
                              : `${subTask.expectedTime.toFixed(1)}h`
                            }
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                      
                      {/* Due Date Column */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {subTask.dueDate ? format(new Date(subTask.dueDate), "MMM d") : "—"}
                        </span>
                      </div>
                      
                      {/* Actions Column */}
                      <div className="col-span-1 flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectTask(subTask)}
                          className="h-7 w-7 p-0 hover:bg-primary/10"
                          data-testid={`button-view-subtask-detail-${subTask.id}`}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isTeamLead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingSubTaskId(subTask.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-white hover:bg-destructive transition-colors"
                            data-testid={`button-delete-subtask-${subTask.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
          )}

          {isTeamLead && (
            <div className="border-t pt-6 flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all"
                data-testid="button-delete-task"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Task
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Delete Task Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This will also delete all sub-tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate(task.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Sub-task Confirmation */}
      <AlertDialog open={!!deletingSubTaskId} onOpenChange={() => setDeletingSubTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sub-task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSubTaskId && deleteSubTaskMutation.mutate(deletingSubTaskId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocking Reason Input Modal */}
      <Dialog open={showBlockingReasonModal} onOpenChange={(open) => {
        if (!open) {
          setShowBlockingReasonModal(false);
          setBlockingReasonInput("");
          setPendingStatus(null);
          setBlockingTaskId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Task</DialogTitle>
            <DialogDescription>
              Please provide a reason for blocking this task. This reason will be visible to all team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="blocking-reason">Blocking Reason *</Label>
              <Textarea
                id="blocking-reason"
                placeholder="Enter the reason for blocking this task..."
                value={blockingReasonInput}
                onChange={(e) => setBlockingReasonInput(e.target.value)}
                className="min-h-[100px]"
                data-testid="textarea-blocking-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockingReasonModal(false);
                setBlockingReasonInput("");
                setPendingStatus(null);
                setBlockingTaskId(null);
              }}
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!blockingReasonInput.trim()) {
                  toast({
                    title: "Error",
                    description: "Blocking reason is required",
                    variant: "destructive",
                  });
                  return;
                }
                if (pendingStatus && blockingTaskId) {
                  // Check if blocking a subtask or main task
                  if (blockingTaskId === task.id) {
                    // Main task
                    updateStatusMutation.mutate({ status: pendingStatus, blockingReason: blockingReasonInput.trim() });
                  } else {
                    // Subtask
                    apiRequest("PATCH", `/api/tasks/${blockingTaskId}/status`, { status: pendingStatus, blockingReason: blockingReasonInput.trim() })
                      .then(async () => {
                        // Refetch the parent task to ensure it's up to date
                        try {
                          const response = await fetch(`/api/tasks/${task.id}`, {
                            credentials: 'include',
                          });
                          if (response.ok) {
                            const fullTask = await response.json();
                            onSelectTask(fullTask);
                          }
                        } catch (error) {
                          // Continue even if refetch fails
                        }
                        
                        // Invalidate and refetch queries to ensure data is up to date
                        await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                        await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
                        queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
                        
                        toast({ title: "Success", description: "Sub-task status updated" });
                        setShowBlockingReasonModal(false);
                        setBlockingReasonInput("");
                        setPendingStatus(null);
                        setBlockingTaskId(null);
                        onUpdate();
                      })
                      .catch((error: Error) => {
                        toast({ 
                          title: "Error", 
                          description: error.message || "Failed to update status",
                          variant: "destructive" 
                        });
                      });
                  }
                }
              }}
              disabled={updateStatusMutation.isPending || !blockingReasonInput.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-block"
            >
              Block Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// Sub-task Form Component
function SubTaskForm({ 
  parentTaskId,
  parentTask,
  subTasks,
  onSuccess, 
  onCancel 
}: { 
  parentTaskId: string;
  parentTask: TaskWithDetails;
  subTasks: TaskWithDetails[];
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("self");
  const [status, setStatus] = useState("to_do");
  
  // Raw hours for sub-task (no PERT adjustments - parent already has PERT buffer)
  const [hours, setHours] = useState<number | null>(null);

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";
  const canAssignSubtask = isTeamLead || isAnalyst;

  // Calculate already allocated time from existing sub-tasks
  const allocatedHours = subTasks.reduce((sum, st) => 
    sum + (st.expectedTime || 0), 0
  );
  const parentTotalHours = parentTask.expectedTime || 0;
  const availableHours = parentTotalHours - allocatedHours;
  
  // Display time in hours or days
  const displayTime = hours && hours >= EFFECTIVE_HOURS_PER_DAY
    ? `${(hours / EFFECTIVE_HOURS_PER_DAY).toFixed(1)} day${(hours / EFFECTIVE_HOURS_PER_DAY) > 1 ? 's' : ''}`
    : hours ? `${hours.toFixed(1)}h` : '';

  // Fetch all analysts for assignment dropdown (both team leads and analysts can assign subtasks)
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: canAssignSubtask,
  });

  const createSubTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sub-task created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sub-task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the sub-task",
        variant: "destructive",
      });
      return;
    }

    // Validate that sub-task raw hours don't exceed available parent time (which is PERT-adjusted)
    if (hours && hours > availableHours) {
      toast({
        title: "Error",
        description: `Sub-task time (${hours.toFixed(1)}h) exceeds available parent task time (${availableHours.toFixed(1)}h remaining)`,
        variant: "destructive",
      });
      return;
    }

    createSubTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      parentTaskId,
      dueDate: dueDate || undefined,
      // Store raw hours as all three PERT values (no PERT adjustment for sub-tasks)
      optimisticTime: hours || 0,
      mostLikelyTime: hours || 0,
      pessimisticTime: hours || 0,
      // "self" means auto-assign to creator (don't send assignedToId)
      // otherwise send the selected assignedToId
      assignedToId: assignedToId === "self" ? undefined : assignedToId,
    });
  };

  return (
    <Card className="p-4 bg-muted">
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Sub-task Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter sub-task title"
            className="mt-1"
            data-testid="input-subtask-title"
          />
        </div>
        <div>
          <Label className="text-xs">Description (Optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            className="mt-1"
            rows={2}
            data-testid="textarea-subtask-description"
          />
        </div>
        <div>
          <Label className="text-xs">Due Date (Optional)</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1"
            data-testid="input-subtask-due-date"
          />
        </div>

        {/* Parent Task Budget Display */}
        <div className="border-t pt-3">
          <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="font-medium text-sm">Parent Task Budget</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold ml-1">{parentTotalHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Allocated:</span>
                <span className="font-semibold ml-1">{allocatedHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Available:</span>
                <span className={`font-semibold ml-1 ${availableHours <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {availableHours.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Estimation Section - Raw Hours (No PERT for sub-tasks) */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Time Estimation (Optional)</h4>
            {hours && (
              <Badge variant="outline" className="text-xs">
                {displayTime}
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Hours</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="Enter hours (e.g., 2.5)"
                value={hours || ''}
                onChange={(e) => setHours(e.target.value ? parseFloat(e.target.value) : null)}
                className="mt-1"
              />
            </div>
            
            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-muted-foreground">
                <Info className="w-3 h-3 inline mr-1" />
                Enter raw hours for this sub-task. The parent task already includes time buffers.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1" data-testid="select-subtask-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="to_do">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canAssignSubtask && (
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="mt-1" data-testid="select-subtask-assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Assign to yourself</SelectItem>
                  {analysts.map((analyst) => (
                    <SelectItem key={analyst.id} value={analyst.id}>
                      {analyst.firstName} {analyst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="button-cancel-subtask"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createSubTaskMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm"
            data-testid="button-save-subtask"
          >
            {createSubTaskMutation.isPending ? "Creating..." : "Create Sub-task"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Enhanced Create Task Dialog Component with PERT Time Estimation
function CreateTaskDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("to_do");
  
  // PERT time estimation state
  const [timeEstimation, setTimeEstimation] = useState({
    baseHours: null as number | null,
    complexity: 'medium' as 'simple' | 'medium' | 'complex',
    confidence: 'medium' as 'high' | 'medium' | 'low'
  });
  
  // Time conversion constants - aligned with analytics
  const HOURS_PER_DAY = 6;
  const PRODUCTIVITY_FACTOR = 0.75;
  const EFFECTIVE_HOURS_PER_DAY = HOURS_PER_DAY * PRODUCTIVITY_FACTOR; // 4.5 hours
  
  const hoursToDays = (hours: number): number => {
    return Math.ceil(hours / EFFECTIVE_HOURS_PER_DAY);
  };
  
  // PERT calculation with complexity and confidence multipliers
  const calculatePertValues = () => {
    if (!timeEstimation.baseHours) {
      return { optimistic: 0, mostLikely: 0, pessimistic: 0 };
    }
    
    const base = timeEstimation.baseHours;
    
    // Complexity factors - Adds buffer time based on uncertainty
    const complexityFactors = {
      simple: 0.2,    // 20% buffer range
      medium: 0.5,    // 50% buffer range
      complex: 0.8    // 80% buffer range
    };
    
    // Confidence multipliers - Affects how much buffer to add to pessimistic
    const confidenceMultipliers = {
      high: 1.0,    // Pessimistic = base + (range × 1)
      medium: 2.0,  // Pessimistic = base + (range × 2)
      low: 3.5      // Pessimistic = base + (range × 3.5)
    };
    
    const complexityFactor = complexityFactors[timeEstimation.complexity];
    const confidenceMultiplier = confidenceMultipliers[timeEstimation.confidence];
    
    const range = base * complexityFactor;
    
    return {
      optimistic: base,  // At least 0.1 hours
      mostLikely: base + (range * 0.5),                   // Add half the range
      pessimistic: base + (range * confidenceMultiplier)  // Add full adjusted range
    };
  };
  
  const pertValues = calculatePertValues();
  const expectedTime = (pertValues.optimistic + 4 * pertValues.mostLikely + pertValues.pessimistic) / 6;
  const expectedDays = hoursToDays(expectedTime);
  
  // Convert hours to days for display when >= 4.5 hours (effective day)
  const displayExpectedTime = expectedTime >= EFFECTIVE_HOURS_PER_DAY
    ? `${Math.round(expectedTime / EFFECTIVE_HOURS_PER_DAY * 2) / 2} day${Math.round(expectedTime / EFFECTIVE_HOURS_PER_DAY * 2) / 2 > 1 ? 's' : ''}`
    : `${expectedTime.toFixed(1)}h`;

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task created successfully" });
      setTitle("");
      setDescription("");
      setDueDate("");
      setStatus("to_do");
      setTimeEstimation({ baseHours: null, complexity: 'medium', confidence: 'medium' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    if (!timeEstimation.baseHours) {
      toast({
        title: "Error",
        description: "Please enter time estimation (hours) for the task",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Error",
        description: "Please select a due date for the task",
        variant: "destructive",
      });
      return;
    }

    const taskData: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      dueDate: dueDate || undefined,
      // Include PERT values
      optimisticTime: pertValues.optimistic,
      mostLikelyTime: pertValues.mostLikely,
      pessimisticTime: pertValues.pessimistic,
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-xl md:max-w-2xl max-h-[95vh] !grid-cols-1 flex flex-col p-0 gap-0 [&>button]:hidden" data-testid="dialog-create-task">
        <DialogHeader className="bg-background border-b px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Create New Task
              </DialogTitle>
              <DialogDescription className="text-sm">
                Create a task with time estimation to help with workload planning
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <div className="space-y-6 py-4">
          {/* Basic Task Info */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Task Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="mt-1.5"
                data-testid="input-task-title"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the task..."
                className="mt-1.5 min-h-[80px]"
                data-testid="textarea-task-description"
              />
            </div>
          </div>
          
          {/* Simplified PERT Time Estimation Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-medium">Time Estimation</h3>
              <Badge variant="outline" className="text-xs">
                {displayExpectedTime}
              </Badge>
            </div>
            
            {/* Complexity, Confidence, and Custom Input Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {/* Complexity Dropdown */}
              <div>
                <Label className="text-sm font-medium">Complexity</Label>
                <Select 
                  value={timeEstimation.complexity} 
                  onValueChange={(value) => setTimeEstimation(prev => ({ ...prev, complexity: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Confidence Dropdown */}
              <div>
                <Label className="text-sm font-medium">Confidence</Label>
                <Select 
                  value={timeEstimation.confidence} 
                  onValueChange={(value) => setTimeEstimation(prev => ({ ...prev, confidence: value as any }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Custom Hours Input */}
              <div>
                <Label className="text-sm font-medium">Hours</Label>
                <Input
                  type="number"
                  placeholder="Enter hours..."
                  value={timeEstimation.baseHours || ''}
                  onChange={(e) => setTimeEstimation(prev => ({ 
                    ...prev, 
                    baseHours: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  className="mt-1"
                />
              </div>
            </div>
            
            {/* Compact PERT Breakdown Display */}
            {timeEstimation.baseHours && (
              <div className="p-2.5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h4 className="font-medium">PERT Analysis</h4>
                  </div>
                  <Badge className="text-sm bg-purple-600 text-white px-3 py-1">
                    Expected: {displayExpectedTime}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="text-green-600 font-medium text-sm">Optimistic</div>
                    <div className="text-base font-bold">{pertValues.optimistic.toFixed(1)}h</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <div className="text-blue-600 font-medium text-sm">Most Likely</div>
                    <div className="text-base font-bold">{pertValues.mostLikely.toFixed(1)}h</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                    <div className="text-orange-600 font-medium text-sm">Pessimistic</div>
                    <div className="text-base font-bold">{pertValues.pessimistic.toFixed(1)}h</div>
                  </div>
                </div>
                
                <div className="mt-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    <span>Based on {timeEstimation.complexity} complexity and {timeEstimation.confidence} confidence</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Due Date and Status - Two Column Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
                data-testid="input-due-date"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1" data-testid="select-task-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_do">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Assignment Info */}
          <div>
            <p className="text-xs text-muted-foreground">
              Task will be automatically assigned to you. Data Lead can reassign it later if needed.
            </p>
          </div>
          </div>
        </div>
        
        <DialogFooter className="bg-background border-t px-6 py-4 flex-shrink-0 mt-auto">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-task">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            data-testid="button-submit-task"
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
