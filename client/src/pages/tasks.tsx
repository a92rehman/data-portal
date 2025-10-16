import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
import { Plus, User as UserIcon, Calendar as CalendarIcon, ListChecks, Trash2, Eye, CornerDownRight, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { TaskWithDetails, User, DataRequestWithDetails } from "@shared/schema";

export default function Tasks() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);

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

  // Sort parent tasks by status
  const sortedParentTasks = [...parentTasks].sort((a, b) => {
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

  // Create flattened list with sub-tasks nested under parents
  const sortedTasks: TaskWithDetails[] = [];
  sortedParentTasks.forEach(parent => {
    sortedTasks.push(parent);
    const subTasks = subTasksMap.get(parent.id) || [];
    sortedTasks.push(...subTasks);
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
        <main className="flex-1 ml-64 p-6">
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

          {/* Tasks Grid */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : sortedParentTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No tasks found matching your criteria</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedParentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  subTasks={subTasksMap.get(task.id) || []}
                  onSelectTask={setSelectedTask}
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
  subTasks,
  onSelectTask,
  onSelectRequest,
  updateStatusMutation,
  getStatusBadge,
  formatStatus,
}: { 
  task: TaskWithDetails;
  subTasks: TaskWithDetails[];
  onSelectTask: (task: TaskWithDetails) => void;
  onSelectRequest: (request: DataRequestWithDetails) => void;
  updateStatusMutation: any;
  getStatusBadge: (status: string) => string;
  formatStatus: (status: string) => string;
}) {
  const { isAuthenticated } = useAuth();

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
    <Card 
      className="border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-md hover:shadow-lg transition-all"
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-4">
        {/* Main Task Row */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Task Title and Badges - Takes up more space */}
          <div className="col-span-3 cursor-pointer" onClick={() => onSelectTask(task)}>
            <div className="flex items-center gap-2 mb-1">
              {task.requestId ? (
                <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                  Request Task
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  Team Task
                </Badge>
              )}
              
              {task.request && (
                <button
                  onClick={handleRequestClick}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-colors"
                  data-testid={`link-request-${task.id}`}
                >
                  #{task.request.requestNumber}
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              
              {progress && progress.total > 0 && (
                <Badge variant="outline" className="text-xs flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <ListChecks className="w-3 h-3" />
                  {progress.completed}/{progress.total}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-bold hover:text-primary transition-colors line-clamp-1" data-testid={`task-title-${task.id}`}>
              {task.title}
            </h3>
          </div>

          {/* Assigned To */}
          <div className="col-span-2 flex items-center gap-1.5">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm truncate">
              {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}
            </span>
          </div>

          {/* Status */}
          <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
            <Select 
              value={task.status} 
              onValueChange={(newStatus) => updateStatusMutation.mutate({ id: task.id, status: newStatus })}
            >
              <SelectTrigger 
                className={`w-full h-8 ${getStatusBadge(task.status)}`}
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

          {/* Expected Time */}
          <div className="col-span-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {task.expectedTime ? `${task.expectedTime.toFixed(1)}h` : "—"}
            </span>
          </div>

          {/* Due Date */}
          <div className="col-span-2 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
            </span>
          </div>

          {/* View Button */}
          <div className="col-span-1 flex justify-end">
            <Button
              size="sm"
              onClick={() => onSelectTask(task)}
              className="h-8 px-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm hover:shadow-md transition-all"
              data-testid={`button-view-task-${task.id}`}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </div>

        {/* Subtasks Section */}
        {subTasks.length > 0 && (
          <div className="mt-4 pt-3 pl-4 border-l-4 border-blue-500 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/20 rounded-r-lg space-y-2">
            {subTasks.map((subTask) => (
              <div 
                key={subTask.id}
                className="grid grid-cols-12 gap-3 items-center p-2 rounded-md bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all shadow-sm"
                data-testid={`subtask-${subTask.id}`}
              >
                <div className="col-span-3 cursor-pointer" onClick={() => onSelectTask(subTask)}>
                  <p className="text-sm font-medium truncate">{subTask.title}</p>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <UserIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {subTask.assignedTo ? `${subTask.assignedTo.firstName} ${subTask.assignedTo.lastName}` : "—"}
                  </span>
                </div>
                <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
                  <Select 
                    value={subTask.status} 
                    onValueChange={(newStatus) => updateStatusMutation.mutate({ id: subTask.id, status: newStatus })}
                  >
                    <SelectTrigger 
                      className={`w-full h-7 text-xs ${getStatusBadge(subTask.status)}`}
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
                <div className="col-span-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {subTask.expectedTime ? `${subTask.expectedTime.toFixed(1)}h` : "—"}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {subTask.dueDate ? format(new Date(subTask.dueDate), "MMM d") : "—"}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectTask(subTask)}
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    data-testid={`button-view-subtask-${subTask.id}`}
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
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
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      
      {/* Expected Time Cell with Icon */}
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          {task.expectedTime ? (
            <span className="text-sm font-medium">{task.expectedTime.toFixed(1)}h</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
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

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";
  const isSubTask = !!task.parentTaskId; // Check if this task is itself a subtask
  
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-task-detail">
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
                onValueChange={(value) => updateStatusMutation.mutate(value)}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className={`w-40 ${getStatusBadge(task.status)}`} data-testid="select-task-status">
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
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Task Information Grid - 4 columns in one row */}
          <div className="grid grid-cols-4 gap-3">
            {/* Assigned To Card */}
            <Card className="p-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned To</Label>
                </div>
                {canReassign ? (
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
                ) : (
                  <p className="text-sm font-medium truncate pl-1">
                    {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Unassigned"}
                  </p>
                )}
              </div>
            </Card>

            {/* Due Date Card */}
            <Card className="p-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <CalendarIcon className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</Label>
                  <p className="text-sm font-medium mt-0.5 truncate">
                    {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Created By Card */}
            <Card className="p-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
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

            {/* Created Date Card */}
            <Card className="p-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
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
                      <div className="col-span-3 flex items-center gap-2">
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
                            apiRequest("PATCH", `/api/tasks/${subTask.id}/status`, { status: newStatus })
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
                      
                      {/* Time Estimate Column */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {subTask.expectedTime ? `${subTask.expectedTime.toFixed(1)}h` : "—"}
                        </span>
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("self");
  const [status, setStatus] = useState("to_do");

  const isTeamLead = (user as any)?.role === "team_lead";
  const isAnalyst = (user as any)?.role === "analyst";
  const canAssignSubtask = isTeamLead || isAnalyst;

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

    createSubTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      parentTaskId,
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
  const [dueDate, setDueDate] = useState("");

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Task created successfully" });
      setTitle("");
      setDescription("");
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
      dueDate: dueDate || undefined,
    };

    createTaskMutation.mutate(taskData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-create-task">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            Create New Task
          </DialogTitle>
          <DialogDescription>
            Create a team task to track work
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <div>
            <Label className="text-sm font-medium">Task Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="mt-1.5"
              data-testid="input-task-title"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              className="mt-1.5 min-h-[80px] resize-none"
              data-testid="textarea-task-description"
            />
          </div>

          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Due Date
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1.5"
              data-testid="input-due-date"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Task will be automatically assigned to you. Data Lead can reassign it later if needed.
            </p>
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
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
          >
            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
