import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User as UserIcon, Calendar as CalendarIcon, ListChecks, Trash2, Eye } from "lucide-react";
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
    refetchInterval: 5000,
  });

  // Fetch analysts for assignment
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isAuthenticated && isTeamLead,
  });

  // Filter out sub-tasks (they show only in parent task detail)
  const parentTasks = tasks.filter(t => !t.parentTaskId);

  // Sort tasks by status
  const sortedTasks = [...parentTasks].sort((a, b) => {
    const statusOrder = {
      'to_do': 1,
      'in_progress': 2,
      'blocked': 3,
      'completed': 4,
    };
    
    const orderA = statusOrder[a.status as keyof typeof statusOrder] || 999;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] || 999;
    
    // Primary sort: by status
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Secondary sort: by due date (if exists)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    // Tertiary sort: by creation date (newest first)
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

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
      
      <div className="flex">
        <Sidebar 
          onNewRequest={() => setLocation("/new-request")} 
          user={user as any} 
        />
        <main className="flex-1 p-6">
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
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
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
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Time</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading tasks...
                      </TableCell>
                    </TableRow>
                  ) : sortedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tasks found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onSelectTask={setSelectedTask}
                        updateStatusMutation={updateTaskStatusMutation}
                        getStatusBadge={getStatusBadge}
                        formatStatus={formatStatus}
                        setLocation={setLocation}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
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

// Task Row Component
function TaskRow({ 
  task, 
  onSelectTask, 
  updateStatusMutation,
  getStatusBadge,
  formatStatus,
  setLocation
}: { 
  task: TaskWithDetails; 
  onSelectTask: (task: TaskWithDetails) => void;
  updateStatusMutation: any;
  getStatusBadge: (status: string) => string;
  formatStatus: (status: string) => string;
  setLocation: (path: string) => void;
}) {
  const { user, isAuthenticated } = useAuth();

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
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      data-testid={`task-row-${task.id}`}
    >
      <TableCell className="font-medium">
        <div>
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
              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                <ListChecks className="w-3 h-3" />
                {progress.completed}/{progress.total}
              </Badge>
            )}
          </div>
          <div 
            className="font-medium cursor-pointer hover:text-primary"
            onClick={() => onSelectTask(task)}
            data-testid={`task-title-${task.id}`}
          >
            {task.title}
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {task.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {task.request ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (task.request) {
                setLocation(`/requests/${task.request.id}`);
              }
            }}
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            data-testid={`link-request-${task.id}`}
          >
            #{task.request.requestNumber}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {task.assignedTo ? (
          <span className="text-sm">
            {task.assignedTo.firstName} {task.assignedTo.lastName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Unassigned</span>
        )}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select 
          value={task.status} 
          onValueChange={(newStatus) => updateStatusMutation.mutate({ id: task.id, status: newStatus })}
        >
          <SelectTrigger 
            className={`w-32 ${getStatusBadge(task.status)}`}
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
      </TableCell>
      <TableCell>
        {task.expectedTime ? (
          <span className="text-sm">{task.expectedTime.toFixed(1)}h</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {task.dueDate ? (
          <span className="text-sm">{format(new Date(task.dueDate), "MMM d, yyyy")}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTask(task);
          }}
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
  onUpdate 
}: { 
  task: TaskWithDetails; 
  open: boolean; 
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSubTaskId, setDeletingSubTaskId] = useState<string | null>(null);

  const isTeamLead = (user as any)?.role === "team_lead";

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
                      <div className="flex items-center gap-2">
                        <Badge variant={subTask.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                          {subTask.status === 'to_do' && 'To Do'}
                          {subTask.status === 'in_progress' && 'In Progress'}
                          {subTask.status === 'blocked' && 'Blocked'}
                          {subTask.status === 'completed' && 'Completed'}
                        </Badge>
                        {isTeamLead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingSubTaskId(subTask.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-subtask-${subTask.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {isTeamLead && (
            <div className="border-t pt-4 flex justify-end">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
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
    </Dialog>
  );
}

// Sub-task Form Component
function SubTaskForm({ 
  parentTaskId, 
  onSuccess, 
  onCancel 
}: { 
  parentTaskId: string; 
  onSuccess: () => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

    createSubTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status: "to_do",
      parentTaskId,
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
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-subtask"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createSubTaskMutation.isPending}
            data-testid="button-save-subtask"
          >
            {createSubTaskMutation.isPending ? "Creating..." : "Create Sub-task"}
          </Button>
        </div>
      </div>
    </Card>
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("unassigned");
  const [optimisticTime, setOptimisticTime] = useState("");
  const [mostLikelyTime, setMostLikelyTime] = useState("");
  const [pessimisticTime, setPessimisticTime] = useState("");
  const [dueDate, setDueDate] = useState("");

  const isTeamLead = (user as any)?.role === "team_lead";

  // Fetch analysts for assignment
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isTeamLead && open,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task created successfully" });
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setOptimisticTime("");
      setMostLikelyTime("");
      setPessimisticTime("");
      setDueDate("");
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

    const taskData: any = {
      title: title.trim(),
      description: description.trim() || undefined,
      status: "to_do",
      assignedToId: assignedToId === "unassigned" ? undefined : assignedToId,
      dueDate: dueDate || undefined,
    };

    // Add PERT estimates if provided
    if (optimisticTime || mostLikelyTime || pessimisticTime) {
      taskData.optimisticTime = optimisticTime ? parseFloat(optimisticTime) : undefined;
      taskData.mostLikelyTime = mostLikelyTime ? parseFloat(mostLikelyTime) : undefined;
      taskData.pessimisticTime = pessimisticTime ? parseFloat(pessimisticTime) : undefined;
    }

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="dialog-create-task">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Task Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="mt-1"
              data-testid="input-task-title"
            />
          </div>

          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              className="mt-1"
              rows={3}
              data-testid="textarea-task-description"
            />
          </div>

          {isTeamLead && (
            <div>
              <Label>Assign To</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="mt-1" data-testid="select-assign-to">
                  <SelectValue placeholder="Select analyst" />
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
          )}

          <div>
            <Label>Due Date (Optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
              data-testid="input-due-date"
            />
          </div>

          <div>
            <Label>PERT Time Estimates (Optional, in hours)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <Label className="text-xs text-muted-foreground">Optimistic</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={optimisticTime}
                  onChange={(e) => setOptimisticTime(e.target.value)}
                  placeholder="0.0"
                  className="mt-1"
                  data-testid="input-optimistic-time"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Most Likely</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={mostLikelyTime}
                  onChange={(e) => setMostLikelyTime(e.target.value)}
                  placeholder="0.0"
                  className="mt-1"
                  data-testid="input-most-likely-time"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pessimistic</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={pessimisticTime}
                  onChange={(e) => setPessimisticTime(e.target.value)}
                  placeholder="0.0"
                  className="mt-1"
                  data-testid="input-pessimistic-time"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-task">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending}
            data-testid="button-submit-task"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
