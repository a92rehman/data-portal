import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckCircle2, AlertCircle, Plus, User as UserIcon, Calendar as CalendarIcon, ListTodo, BarChart2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { TaskWithDetails, User } from "@shared/schema";

export default function Tasks() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";

  // Fetch tasks with filters
  const { data: tasks = [], isLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks", { status: filterStatus, assignedToId: filterAssignee }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterAssignee) params.append('assignedToId', filterAssignee);
      
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch analysts for assignment
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isAuthenticated && isTeamLead,
  });

  // Group tasks by status for Kanban
  const tasksByStatus = {
    to_do: tasks.filter(t => t.status === "to_do"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    blocked: tasks.filter(t => t.status === "blocked"),
    completed: tasks.filter(t => t.status === "completed"),
  };

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task status updated" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update task status",
        variant: "destructive" 
      });
    },
  });

  const StatusColumn = ({ status, title, icon, tasks }: { 
    status: string; 
    title: string; 
    icon: React.ReactNode;
    tasks: TaskWithDetails[];
  }) => {
    const statusColors = {
      to_do: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
      in_progress: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
      blocked: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
      completed: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
    };

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">{title}</h3>
          <Badge variant="outline" className="ml-auto">{tasks.length}</Badge>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} statusColors={statusColors} status={status} onSelectTask={setSelectedTask} updateStatusMutation={updateTaskStatusMutation} />
          ))}
        </div>
      </div>
    );
  };

  const TaskCard = ({ task, statusColors, status, onSelectTask, updateStatusMutation }: {
    task: TaskWithDetails;
    statusColors: any;
    status: string;
    onSelectTask: (task: TaskWithDetails) => void;
    updateStatusMutation: any;
  }) => {
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

    return (
      <Card 
        className={`hover:shadow-md transition-shadow ${statusColors[status as keyof typeof statusColors]}`}
        data-testid={`task-card-${task.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {task.requestId ? (
                  <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                    Request Task
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Team Task
                  </Badge>
                )}
                {progress && progress.total > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {progress.completed}/{progress.total} sub-tasks
                  </Badge>
                )}
              </div>
              <h4 
                className="font-medium cursor-pointer" 
                onClick={() => onSelectTask(task)}
                data-testid={`task-title-${task.id}`}
              >
                {task.title}
              </h4>
            </div>
            <Select 
              value={task.status} 
              onValueChange={(newStatus) => updateStatusMutation.mutate({ id: task.id, status: newStatus })}
            >
              <SelectTrigger 
                className="w-24 h-7 text-xs" 
                onClick={(e) => e.stopPropagation()}
                data-testid={`select-status-${task.id}`}
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
          {task.description && (
            <p 
              className="text-sm text-muted-foreground mb-3 line-clamp-2 cursor-pointer"
              onClick={() => onSelectTask(task)}
            >
              {task.description}
            </p>
          )}
          
          <div 
            className="flex flex-wrap gap-2 text-xs text-muted-foreground cursor-pointer"
            onClick={() => onSelectTask(task)}
          >
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <span>{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
              </div>
            )}
            {task.expectedTime && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{task.expectedTime.toFixed(1)}h</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{format(new Date(task.dueDate), "MMM d")}</span>
              </div>
            )}
          </div>

          {task.request && (
            <div className="mt-2 pt-2 border-t">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.request) {
                    setLocation(`/requests/${task.request.id}`);
                  }
                }}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                data-testid={`link-request-${task.id}`}
              >
                <span>→ Request #{task.request?.requestNumber}: {task.request?.title}</span>
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div className="flex">
        <Sidebar 
          onNewRequest={() => setLocation("/new-request")} 
          user={user as any} 
        />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1" data-testid="page-title">Tasks</h1>
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
          <div className="flex gap-3 mb-6">
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

          {/* Kanban Board */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusColumn 
                status="to_do"
                title="To Do" 
                icon={<ListTodo className="w-4 h-4 text-slate-500" />}
                tasks={tasksByStatus.to_do}
              />
              <StatusColumn 
                status="in_progress"
                title="In Progress" 
                icon={<Clock className="w-4 h-4 text-blue-500" />}
                tasks={tasksByStatus.in_progress}
              />
              <StatusColumn 
                status="blocked"
                title="Blocked" 
                icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                tasks={tasksByStatus.blocked}
              />
              <StatusColumn 
                status="completed"
                title="Completed" 
                icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
                tasks={tasksByStatus.completed}
              />
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
        />
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

// Task Detail Dialog Component
function TaskDetailDialog({ 
  task, 
  open, 
  onClose, 
  onUpdate 
}: { 
  task: TaskWithDetails; 
  open: boolean; 
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);

  // Fetch sub-tasks
  const { data: subTasks = [] } = useQuery<TaskWithDetails[]>({
    queryKey: ["/api/tasks", task.id, "subtasks"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task.id}/subtasks`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch sub-tasks');
      return response.json();
    },
    enabled: open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/tasks/${task.id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Success", description: "Task status updated" });
      onUpdate();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-task-detail">
        <DialogHeader>
          <DialogTitle data-testid="task-detail-title">{task.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {task.description && (
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select 
                value={task.status} 
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
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

            <div>
              <Label className="text-xs text-muted-foreground">Assigned To</Label>
              <p className="text-sm mt-1">
                {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}
              </p>
            </div>
          </div>

          {(task.optimisticTime || task.mostLikelyTime || task.pessimisticTime) && (
            <div>
              <Label className="text-xs text-muted-foreground">PERT Time Estimate</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Optimistic</p>
                  <p className="text-sm font-medium">{task.optimisticTime?.toFixed(1)}h</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Most Likely</p>
                  <p className="text-sm font-medium">{task.mostLikelyTime?.toFixed(1)}h</p>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <p className="text-xs text-muted-foreground">Pessimistic</p>
                  <p className="text-sm font-medium">{task.pessimisticTime?.toFixed(1)}h</p>
                </div>
                <div className="text-center p-2 bg-primary/10 rounded">
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="text-sm font-medium text-primary">{task.expectedTime?.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          )}

          {task.request && (
            <div>
              <Label className="text-xs text-muted-foreground">Linked Request</Label>
              <button
                onClick={() => {
                  if (task.request) {
                    setLocation(`/requests/${task.request.id}`);
                    onClose();
                  }
                }}
                className="text-sm mt-1 text-purple-600 dark:text-purple-400 hover:underline"
              >
                #{task.request.requestNumber}: {task.request.title}
              </button>
            </div>
          )}

          {/* Sub-tasks Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Sub-tasks ({subTasks.length})</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSubTaskForm(!showSubTaskForm)}
                data-testid="button-add-subtask"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Sub-task
              </Button>
            </div>

            {showSubTaskForm && (
              <SubTaskForm
                parentTaskId={task.id}
                onSuccess={() => {
                  setShowSubTaskForm(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/tasks", task.id, "subtasks"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                }}
                onCancel={() => setShowSubTaskForm(false)}
              />
            )}

            <div className="space-y-2 mt-3">
              {subTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sub-tasks yet</p>
              ) : (
                subTasks.map((subTask) => (
                  <Card key={subTask.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{subTask.title}</h5>
                        {subTask.description && (
                          <p className="text-xs text-muted-foreground mt-1">{subTask.description}</p>
                        )}
                      </div>
                      <Badge variant={subTask.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                        {subTask.status === 'to_do' && 'To Do'}
                        {subTask.status === 'in_progress' && 'In Progress'}
                        {subTask.status === 'blocked' && 'Blocked'}
                        {subTask.status === 'completed' && 'Completed'}
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create Task Dialog Component
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    optimisticTime: "",
    mostLikelyTime: "",
    pessimisticTime: "",
    assignedToId: "",
    dueDate: "",
  });

  const isTeamLead = (user as any)?.role === "team_lead";

  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isTeamLead,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task created successfully" });
      onSuccess();
      setFormData({
        title: "",
        description: "",
        optimisticTime: "",
        mostLikelyTime: "",
        pessimisticTime: "",
        assignedToId: "",
        dueDate: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData: any = {
      title: formData.title,
      description: formData.description || undefined,
      optimisticTime: formData.optimisticTime ? parseFloat(formData.optimisticTime) : undefined,
      mostLikelyTime: formData.mostLikelyTime ? parseFloat(formData.mostLikelyTime) : undefined,
      pessimisticTime: formData.pessimisticTime ? parseFloat(formData.pessimisticTime) : undefined,
      assignedToId: formData.assignedToId || undefined,
      dueDate: formData.dueDate || undefined,
    };

    createMutation.mutate(taskData);
  };

  // Calculate expected time using PERT formula
  const expectedTime = 
    formData.optimisticTime && formData.mostLikelyTime && formData.pessimisticTime
      ? (
          (parseFloat(formData.optimisticTime) + 
           4 * parseFloat(formData.mostLikelyTime) + 
           parseFloat(formData.pessimisticTime)) / 6
        ).toFixed(1)
      : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-create-task">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              data-testid="input-task-title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              data-testid="input-task-description"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="block">PERT Time Estimation (hours)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">PERT Time Estimation:</p>
                      <p><strong>Optimistic (O):</strong> Best case - everything goes perfectly</p>
                      <p><strong>Most Likely (M):</strong> Realistic estimate - normal conditions</p>
                      <p><strong>Pessimistic (P):</strong> Worst case - maximum delays/issues</p>
                      <p className="pt-1 border-t"><strong>Expected Time = (O + 4M + P) / 6</strong></p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="optimistic" className="text-xs text-muted-foreground">Optimistic</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Best case scenario - everything goes perfectly with no issues</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="optimistic"
                  type="number"
                  step="0.5"
                  value={formData.optimisticTime}
                  onChange={(e) => setFormData({ ...formData, optimisticTime: e.target.value })}
                  placeholder="Best case"
                  data-testid="input-optimistic-time"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="mostLikely" className="text-xs text-muted-foreground">Most Likely</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Realistic estimate - normal working conditions with typical challenges</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="mostLikely"
                  type="number"
                  step="0.5"
                  value={formData.mostLikelyTime}
                  onChange={(e) => setFormData({ ...formData, mostLikelyTime: e.target.value })}
                  placeholder="Realistic"
                  data-testid="input-most-likely-time"
                />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label htmlFor="pessimistic" className="text-xs text-muted-foreground">Pessimistic</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Worst case scenario - maximum delays and unexpected issues</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="pessimistic"
                  type="number"
                  step="0.5"
                  value={formData.pessimisticTime}
                  onChange={(e) => setFormData({ ...formData, pessimisticTime: e.target.value })}
                  placeholder="Worst case"
                  data-testid="input-pessimistic-time"
                />
              </div>
            </div>
            {expectedTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Expected Time: <span className="font-medium text-primary">{expectedTime} hours</span>
              </p>
            )}
          </div>

          {isTeamLead && (
            <div>
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select 
                value={formData.assignedToId} 
                onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
              >
                <SelectTrigger data-testid="select-assign-to">
                  <SelectValue placeholder="Select analyst" />
                </SelectTrigger>
                <SelectContent>
                  {analysts.map(analyst => (
                    <SelectItem key={analyst.id} value={analyst.id}>
                      {analyst.firstName} {analyst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              data-testid="input-due-date"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending} 
              data-testid="button-submit-task"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sub-task Form Component
function SubTaskForm({
  parentTaskId,
  onSuccess,
  onCancel,
}: {
  parentTaskId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", {
        ...data,
        parentTaskId,
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-muted rounded-lg mb-3">
      <div>
        <Label htmlFor="subtask-title" className="text-sm">Title</Label>
        <Input
          id="subtask-title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter sub-task title"
          className="mt-1"
          data-testid="input-subtask-title"
        />
      </div>

      <div>
        <Label htmlFor="subtask-description" className="text-sm">Description (Optional)</Label>
        <Textarea
          id="subtask-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter sub-task description"
          rows={2}
          className="mt-1"
          data-testid="input-subtask-description"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} data-testid="button-cancel-subtask">
          Cancel
        </Button>
        <Button 
          type="submit" 
          size="sm"
          disabled={createMutation.isPending}
          data-testid="button-create-subtask"
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
        >
          {createMutation.isPending ? "Creating..." : "Create Sub-task"}
        </Button>
      </div>
    </form>
  );
}
