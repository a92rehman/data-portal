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
import { Clock, CheckCircle2, AlertCircle, Plus, User as UserIcon, Calendar as CalendarIcon, ListTodo, BarChart2 } from "lucide-react";
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
      <div className="flex-1 min-w-[300px]">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="font-semibold text-sm uppercase text-muted-foreground">{title}</h3>
          <Badge variant="outline" className="ml-auto">{tasks.length}</Badge>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <Card 
              key={task.id} 
              className={`hover:shadow-md transition-shadow ${statusColors[status as keyof typeof statusColors]}`}
              data-testid={`task-card-${task.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 
                    className="font-medium flex-1 cursor-pointer" 
                    onClick={() => setSelectedTask(task)}
                    data-testid={`task-title-${task.id}`}
                  >
                    {task.title}
                  </h4>
                  <Select 
                    value={task.status} 
                    onValueChange={(newStatus) => updateTaskStatusMutation.mutate({ id: task.id, status: newStatus })}
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
                    onClick={() => setSelectedTask(task)}
                  >
                    {task.description}
                  </p>
                )}
                
                <div 
                  className="flex flex-wrap gap-2 text-xs text-muted-foreground cursor-pointer"
                  onClick={() => setSelectedTask(task)}
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
                  <div 
                    className="mt-2 pt-2 border-t cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <p className="text-xs text-muted-foreground">
                      Linked to: {task.request.title}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar 
        onNewRequest={() => setLocation("/new-request")} 
        user={user as any} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user as any} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-1" data-testid="page-title">Tasks</h1>
              <p className="text-muted-foreground">Manage your team's tasks and workload</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-task">
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
            <div className="flex gap-4 overflow-x-auto pb-4">
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
              <p className="text-sm mt-1">{task.request.title}</p>
            </div>
          )}
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
            <Label className="mb-2 block">PERT Time Estimation (hours)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="optimistic" className="text-xs text-muted-foreground">Optimistic</Label>
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
                <Label htmlFor="mostLikely" className="text-xs text-muted-foreground">Most Likely</Label>
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
                <Label htmlFor="pessimistic" className="text-xs text-muted-foreground">Pessimistic</Label>
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
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-task">
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
