import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  X, 
  Save, 
  Send, 
  CheckCircle, 
  Eye, 
  Settings, 
  Clock,
  CircleAlert,
  MinusCircle,
  InfoIcon,
  UserPlus,
  Paperclip,
  Download,
  FileIcon
} from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

interface RequestDetailProps {
  request: DataRequestWithDetails;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RequestDetail({ request, onClose, onUpdate }: RequestDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [selectedAnalyst, setSelectedAnalyst] = useState(request.assignedToId || "");
  const [isEditingPriorityDeadline, setIsEditingPriorityDeadline] = useState(false);
  const [editedPriority, setEditedPriority] = useState(request.priority);
  const [editedDueDate, setEditedDueDate] = useState(new Date(request.dueDate).toISOString().split('T')[0]);

  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: (user as any)?.role === "team_lead" || (user as any)?.role === "analyst",
  });

  const analystForm = useForm({
    defaultValues: {
      status: request.status,
      estimatedDays: request.estimatedCompletionDays?.toString() || "",
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; estimatedDays?: number }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/status`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/requests/${request.id}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const updatePriorityDeadlineMutation = useMutation({
    mutationFn: async (data: { priority: string; dueDate: string }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/priority-deadline`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Priority and deadline updated successfully",
      });
      setIsEditingPriorityDeadline(false);
      onUpdate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to update priority and deadline",
        variant: "destructive",
      });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (analystId: string) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/assign`, { analystId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request assigned successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to assign request",
        variant: "destructive",
      });
    },
  });

  const handleAssignAnalyst = () => {
    if (selectedAnalyst) {
      assignMutation.mutate(selectedAnalyst);
    }
  };

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (data: { uploadToken: string; fileName: string; fileSize: number; mimeType: string }) => {
      return await apiRequest("POST", `/api/requests/${request.id}/attachments`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/requests", request.id] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId: request.id }),
    });
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
      fields: { uploadToken: data.uploadToken },
    };
  };

  const handleUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadToken = file.meta?.uploadToken as string;
      if (!uploadToken) {
        toast({
          title: "Error",
          description: "Upload succeeded but upload token is missing",
          variant: "destructive",
        });
        return;
      }
      uploadAttachmentMutation.mutate({
        uploadToken,
        fileName: file.name || "untitled",
        fileSize: file.size || 0,
        mimeType: file.type || "application/octet-stream",
      });
    }
  };

  // New three-role workflow mutations
  const acceptRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/accept`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request accepted successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept request",
        variant: "destructive",
      });
    },
  });

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  const rejectRequestMutation = useMutation({
    mutationFn: async (reason: string) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request rejected",
      });
      setShowRejectDialog(false);
      setRejectionReason("");
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const [assignAnalystId, setAssignAnalystId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const assignAnalystMutation = useMutation({
    mutationFn: async (data: { analystId: string; dueDate?: string }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/assign-analyst`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request assigned to analyst successfully",
      });
      setShowAssignDialog(false);
      setAssignAnalystId("");
      setAssignDueDate("");
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign analyst",
        variant: "destructive",
      });
    },
  });

  const [blockerDescription, setBlockerDescription] = useState("");
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);

  const addBlockerMutation = useMutation({
    mutationFn: async (description: string) => {
      return await apiRequest("POST", `/api/requests/${request.id}/blockers`, { description });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Blocker added successfully",
      });
      setShowBlockerDialog(false);
      setBlockerDescription("");
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add blocker",
        variant: "destructive",
      });
    },
  });

  const [suggestedDeadlineDate, setSuggestedDeadlineDate] = useState("");
  const [showSuggestDeadlineDialog, setShowSuggestDeadlineDialog] = useState(false);

  const suggestDeadlineMutation = useMutation({
    mutationFn: async (suggestedDeadline: string) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/suggest-deadline`, { suggestedDeadline });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deadline suggestion submitted successfully",
      });
      setShowSuggestDeadlineDialog(false);
      setSuggestedDeadlineDate("");
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suggest deadline",
        variant: "destructive",
      });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      submitted: "gradient-badge-submitted",
      "under_review": "gradient-badge-review",
      "in_progress": "gradient-badge-progress",
      completed: "gradient-badge-completed",
      cancelled: "gradient-badge-cancelled",
    };
    return variants[status as keyof typeof variants] || "gradient-badge-submitted";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <CircleAlert className="w-4 h-4 text-destructive" />;
      case "medium":
        return <MinusCircle className="w-4 h-4 text-warning" />;
      case "low":
        return <InfoIcon className="w-4 h-4 text-info" />;
      default:
        return <InfoIcon className="w-4 h-4 text-info" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Send className="w-4 h-4" />;
      case "under_review":
        return <Eye className="w-4 h-4" />;
      case "in_progress":
        return <Settings className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

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

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "p0_critical":
        return "P0 - Critical";
      case "p1_high":
        return "P1 - High";
      case "p2_medium":
        return "P2 - Medium";
      case "p3_low":
        return "P3 - Low";
      default:
        return priority.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const onAnalystSubmit = (data: any) => {
    const estimatedDays = data.estimatedDays ? parseInt(data.estimatedDays) : undefined;
    updateStatusMutation.mutate({
      status: data.status,
      estimatedDays,
    });
  };

  const onCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const isAnalyst = (user as any)?.role === "analyst";
  const isTeamLead = (user as any)?.role === "team_lead";
  const isRequester = (user as any)?.role === "requester";

  return (
    <>
      <DialogHeader>
        <div>
          <DialogTitle className="text-xl font-semibold" data-testid="text-request-id">
            {request.id.slice(0, 12)}...
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-request-title">
            {request.title}
          </p>
        </div>
      </DialogHeader>

      <div className="space-y-6">
        {/* Request Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <Badge className={`status-badge ${getStatusBadge(request.status)}`} data-testid="badge-status">
                {formatStatus(request.status)}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Priority</p>
              {isTeamLead && isEditingPriorityDeadline ? (
                <Select value={editedPriority} onValueChange={(value) => setEditedPriority(value as "p0_critical" | "p1_high" | "p2_medium" | "p3_low")} data-testid="select-edit-priority">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                    <SelectItem value="p1_high">P1 - High</SelectItem>
                    <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                    <SelectItem value="p3_low">P3 - Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1" data-testid="priority-display">
                  {getPriorityIcon(request.priority)}
                  <span className="text-sm font-medium capitalize">{formatPriority(request.priority)}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Request Type</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-request-type">
                {formatRequestType(request.type)}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Department</p>
              <p className="text-sm font-medium text-foreground capitalize" data-testid="text-department">
                {request.department}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Requested By</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-requested-by">
                {request.requestedBy.firstName} {request.requestedBy.lastName} ({request.requestedBy.role?.replace("_", " ")})
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Due Date</p>
              {isTeamLead && isEditingPriorityDeadline ? (
                <Input 
                  type="date" 
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  data-testid="input-edit-due-date"
                />
              ) : (
                <p className="text-sm font-medium text-foreground" data-testid="text-due-date">
                  {formatDate(request.dueDate.toString())}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Edit Priority and Deadline buttons for Data Lead */}
        {isTeamLead && (
          <div className="flex justify-end gap-2 -mt-2">
            {isEditingPriorityDeadline ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingPriorityDeadline(false);
                    setEditedPriority(request.priority);
                    setEditedDueDate(new Date(request.dueDate).toISOString().split('T')[0]);
                  }}
                  data-testid="button-cancel-edit-priority-deadline"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    updatePriorityDeadlineMutation.mutate({
                      priority: editedPriority,
                      dueDate: editedDueDate,
                    });
                  }}
                  disabled={updatePriorityDeadlineMutation.isPending}
                  data-testid="button-save-priority-deadline"
                  className="gradient-button-primary text-white font-semibold"
                  style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                >
                  {updatePriorityDeadlineMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPriorityDeadline(true)}
                data-testid="button-edit-priority-deadline"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Priority & Deadline
              </Button>
            )}
          </div>
        )}

        {/* Data Lead Actions (Accept/Reject) */}
        {isTeamLead && request.status === "pending_review" && (
          <Card className="border-2 border-green-300 shadow-md bg-green-50/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Review Request
              </h4>
              <div className="flex gap-2">
                <Button
                  onClick={() => acceptRequestMutation.mutate()}
                  disabled={acceptRequestMutation.isPending}
                  data-testid="button-accept-request"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {acceptRequestMutation.isPending ? "Accepting..." : "Accept Request"}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectRequestMutation.isPending}
                  variant="destructive"
                  data-testid="button-reject-request"
                  className="flex-1"
                >
                  Reject Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Accepted Status */}
        {request.status === "accepted" && (
          <Card className="border-2 border-green-300 shadow-md bg-green-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold" data-testid="text-request-accepted">Request Accepted</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This request has been accepted by the Data Lead and is ready for assignment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Analyst Actions (Add Blocker) */}
        {isAnalyst && (request.status === "assigned" || request.status === "in_progress") && (
          <Card className="border-2 border-orange-300 shadow-md bg-orange-50/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CircleAlert className="w-4 h-4 text-orange-600" />
                Blockers & Issues
              </h4>
              <Button
                onClick={() => setShowBlockerDialog(true)}
                variant="outline"
                size="sm"
                data-testid="button-add-blocker"
                className="w-full"
              >
                <CircleAlert className="w-4 h-4 mr-2" />
                Add Blocker
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Section 3: Request Details & Business Impact */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <InfoIcon className="w-4 h-4" />
            Section 3: Request Details & Business Impact
          </h4>
          
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Primary Question</p>
            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-4">
                <p className="text-sm text-foreground" data-testid="text-primary-question">
                  {request.primaryQuestion}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Business Problem or Goal</p>
            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-4">
                <p className="text-sm text-foreground" data-testid="text-business-problem">
                  {request.businessProblem}
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Decision or Action</p>
            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-4">
                <p className="text-sm text-foreground" data-testid="text-decision-action">
                  {request.decisionAction}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Impact</p>
              <Card className="border-2 border-blue-200 shadow-md">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground capitalize" data-testid="text-impact">
                    {request.impact}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Frequency</p>
              <Card className="border-2 border-blue-200 shadow-md">
                <CardContent className="p-4">
                  <p className="text-sm text-foreground" data-testid="text-frequency">
                    {request.frequency}
                    {request.frequencyDuration && request.frequencyUnit && 
                      ` (${request.frequencyDuration} ${request.frequencyUnit})`
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Section 4: Dashboard-Specific Details (if applicable) */}
        {(request.type === "new_dashboard" || request.type === "modify_dashboard") && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Section 4: Dashboard-Specific Details
            </h4>

            {request.dashboardAudience && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Audience/Users</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground" data-testid="text-dashboard-audience">
                      {request.dashboardAudience}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {request.dashboardRefreshFrequency && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Intended Refresh Frequency</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground capitalize" data-testid="text-refresh-frequency">
                      {request.dashboardRefreshFrequency}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {request.keyMetrics && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Key Metrics/KPIs Needed</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground" data-testid="text-key-metrics">
                      {request.keyMetrics}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {request.filters && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Filters</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground" data-testid="text-filters">
                      {request.filters}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {request.mockups && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Mock-ups, Examples, or Links</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground" data-testid="text-mockups">
                      {request.mockups}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {request.actionPlan && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Action Plan</p>
                <Card className="border-2 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm text-foreground" data-testid="text-action-plan">
                      {request.actionPlan}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Attachments</p>
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonVariant="outline"
              buttonSize="sm"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Upload File
            </ObjectUploader>
          </div>
          {request.attachments && request.attachments.length > 0 ? (
            <div className="space-y-2">
              {request.attachments.map((attachment) => (
                <Card key={attachment.id} className="border-2 border-blue-200 shadow-sm hover:shadow-md transition-all">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate" data-testid={`attachment-name-${attachment.id}`}>
                            {attachment.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} • Uploaded by {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
                          </p>
                        </div>
                      </div>
                      <a
                        href={attachment.filePath}
                        download={attachment.fileName}
                        className="flex-shrink-0"
                        data-testid={`button-download-${attachment.id}`}
                      >
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">No attachments yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assigned Analyst Display */}
        {request.assignedTo && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assigned To</p>
            <Card className="border-2 border-green-200 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={request.assignedTo.profileImageUrl ?? ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {getInitials(request.assignedTo.firstName ?? undefined, request.assignedTo.lastName ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid="text-assigned-analyst">
                      {request.assignedTo.firstName} {request.assignedTo.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{request.assignedTo.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assignment Section for Data Lead */}
        {isTeamLead && (
          <Card className="border-2 border-blue-300 shadow-md bg-blue-50/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Assign Request
              </h4>
              <div className="flex gap-2">
                <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst} data-testid="select-assign-analyst">
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select analyst..." />
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
                <Button 
                  size="sm" 
                  onClick={handleAssignAnalyst}
                  disabled={!selectedAnalyst || assignMutation.isPending}
                  data-testid="button-assign"
                  className="gradient-button-primary text-white font-semibold"
                  style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                >
                  {assignMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Analyst Response Section */}
        {isAnalyst && (
          <Card className="bg-accent">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Analyst Response</h4>
              <Form {...analystForm}>
                <form onSubmit={analystForm.handleSubmit(onAnalystSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={analystForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Update Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-analyst-status">
                            <FormControl>
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending_review">Pending Review</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="assigned">Assigned</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={analystForm.control}
                      name="estimatedDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Completion Days</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 5" 
                              {...field}
                              data-testid="input-estimated-days"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-update-status"
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Request
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Communication History */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Communication History</h4>
          <div className="space-y-3">
            {request.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Start the conversation!
              </p>
            ) : (
              request.comments.map((comment) => (
                <Card key={comment.id} className="bg-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user.profileImageUrl ?? ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {getInitials(comment.user.firstName ?? undefined, comment.user.lastName ?? undefined)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground" data-testid={`comment-author-${comment.id}`}>
                            {comment.user.firstName} {comment.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {comment.user.role?.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground" data-testid={`comment-date-${comment.id}`}>
                        {comment.createdAt ? formatDate(comment.createdAt.toString()) : ''}
                      </p>
                    </div>
                    <p className="text-sm text-foreground" data-testid={`comment-content-${comment.id}`}>
                      {comment.content}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <div className="mt-4">
            <form onSubmit={onCommentSubmit} className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1"
                data-testid="input-new-comment"
              />
              <Button 
                type="submit" 
                disabled={!newComment.trim() || addCommentMutation.isPending}
                data-testid="button-add-comment"
                className="gradient-button-primary text-white font-semibold px-6"
                style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
              >
                {addCommentMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Reject Request Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent data-testid="dialog-reject-request">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be shared with the requester.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="min-h-[100px]"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectRequestMutation.mutate(rejectionReason)}
              disabled={!rejectionReason.trim() || rejectRequestMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectRequestMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blocker Dialog */}
      <Dialog open={showBlockerDialog} onOpenChange={setShowBlockerDialog}>
        <DialogContent data-testid="dialog-add-blocker">
          <DialogHeader>
            <DialogTitle>Add Blocker</DialogTitle>
            <DialogDescription>
              Describe the blocker or issue preventing progress on this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={blockerDescription}
              onChange={(e) => setBlockerDescription(e.target.value)}
              placeholder="Describe the blocker..."
              className="min-h-[100px]"
              data-testid="input-blocker-description"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockerDialog(false);
                setBlockerDescription("");
              }}
              data-testid="button-cancel-blocker"
            >
              Cancel
            </Button>
            <Button
              onClick={() => addBlockerMutation.mutate(blockerDescription)}
              disabled={!blockerDescription.trim() || addBlockerMutation.isPending}
              data-testid="button-confirm-blocker"
              className="gradient-button-primary text-white font-semibold"
            >
              {addBlockerMutation.isPending ? "Adding..." : "Add Blocker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Analyst Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent data-testid="dialog-assign-analyst">
          <DialogHeader>
            <DialogTitle>Assign Analyst</DialogTitle>
            <DialogDescription>
              Select an analyst and optionally set a deadline for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Analyst</label>
              <Select value={assignAnalystId} onValueChange={setAssignAnalystId} data-testid="select-dialog-analyst">
                <SelectTrigger>
                  <SelectValue placeholder="Choose analyst..." />
                </SelectTrigger>
                <SelectContent>
                  {analysts.map((analyst) => (
                    <SelectItem key={analyst.id} value={analyst.id}>
                      {analyst.firstName} {analyst.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Due Date (Optional)</label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                data-testid="input-dialog-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setAssignAnalystId("");
                setAssignDueDate("");
              }}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignAnalystMutation.mutate({ 
                analystId: assignAnalystId, 
                dueDate: assignDueDate || undefined 
              })}
              disabled={!assignAnalystId || assignAnalystMutation.isPending}
              data-testid="button-confirm-assign"
              className="gradient-button-primary text-white font-semibold"
            >
              {assignAnalystMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest Deadline Dialog */}
      <Dialog open={showSuggestDeadlineDialog} onOpenChange={setShowSuggestDeadlineDialog}>
        <DialogContent data-testid="dialog-suggest-deadline">
          <DialogHeader>
            <DialogTitle>Suggest Deadline</DialogTitle>
            <DialogDescription>
              Suggest a realistic deadline for completing this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="date"
              value={suggestedDeadlineDate}
              onChange={(e) => setSuggestedDeadlineDate(e.target.value)}
              data-testid="input-suggested-deadline"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuggestDeadlineDialog(false);
                setSuggestedDeadlineDate("");
              }}
              data-testid="button-cancel-suggest"
            >
              Cancel
            </Button>
            <Button
              onClick={() => suggestDeadlineMutation.mutate(suggestedDeadlineDate)}
              disabled={!suggestedDeadlineDate || suggestDeadlineMutation.isPending}
              data-testid="button-confirm-suggest"
              className="gradient-button-primary text-white font-semibold"
            >
              {suggestDeadlineMutation.isPending ? "Suggesting..." : "Suggest Deadline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
