import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  FileIcon,
  MessageSquare,
  ArrowLeft,
  Check,
  XCircle,
  AlertCircle
} from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { calculateUrgency } from "@/lib/urgency";

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
  const [editedPriority, setEditedPriority] = useState(request.priority);
  const [editedDueDate, setEditedDueDate] = useState(new Date(request.dueDate).toISOString().split('T')[0]);
  
  const { sendTyping, typingUsers } = useWebSocket((user as User)?.id);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (user && sendTyping) {
        const userName = `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'User';
        sendTyping(request.id, false, userName);
      }
    };
  }, [user, sendTyping, request.id]);

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

  const completeRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/complete`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request marked as completed successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete request",
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
      pending_review: "gradient-badge-review",
      accepted: "gradient-badge-completed",
      rejected: "gradient-badge-cancelled",
      assigned: "gradient-badge-progress",
      in_progress: "gradient-badge-progress",
      blocked: "gradient-badge-cancelled",
      completed: "gradient-badge-completed",
      cancelled: "gradient-badge-cancelled",
    };
    return variants[status as keyof typeof variants] || "gradient-badge-submitted";
  };

  const getPriorityIcon = (priority: string) => {
    if (priority.includes("critical") || priority.includes("p0")) {
      return <CircleAlert className="w-4 h-4 text-red-600 dark:text-red-400" />;
    } else if (priority.includes("high") || priority.includes("p1")) {
      return <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    } else if (priority.includes("medium") || priority.includes("p2")) {
      return <MinusCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    } else {
      return <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <Send className="w-4 h-4" />;
      case "pending_review":
      case "under_review":
        return <Eye className="w-4 h-4" />;
      case "in_progress":
      case "assigned":
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
    const typeMap: Record<string, string> = {
      adhoc_analysis: "Ad-hoc Analysis",
      new_dashboard: "New Dashboard",
      modify_dashboard: "Modify Dashboard",
      data_bug: "Data Bug",
      bq_access: "BigQuery Access",
      tracking: "Tracking Request",
      metric_change: "Metric Change",
      pipeline_change: "Pipeline Change",
      powerbi: "Power BI Dashboard",
      adhoc: "Ad-hoc Request"
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
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

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    if (value.trim() && user && sendTyping) {
      const userName = `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'User';
      sendTyping(request.id, true, userName);

      // Auto-stop typing after 2 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(request.id, false, userName);
      }, 2000);
    }
  };

  const onCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (user && sendTyping) {
      const userName = `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'User';
      sendTyping(request.id, false, userName);
    }

    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const isAnalyst = (user as any)?.role === "analyst";
  const isTeamLead = (user as any)?.role === "team_lead";
  const isRequester = (user as any)?.role === "requester";
  const isAssignedToMe = request.assignedToId === (user as any)?.id;

  const [deliveryType, setDeliveryType] = useState("attachment");
  const [deliveryLink, setDeliveryLink] = useState("");

  const deliveredRequestMutation = useMutation({
    mutationFn: async (data: { deliveryType: string; deliveryLink?: string }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/delivered`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request marked as delivered successfully",
      });
      onUpdate();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark request as delivered",
        variant: "destructive",
      });
    },
  });

  const handleDeliver = () => {
    deliveredRequestMutation.mutate({
      deliveryType,
      deliveryLink: deliveryType === "link" ? deliveryLink : undefined,
    });
  };

  const isOnTime = () => {
    const dueDate = new Date(request.dueDate);
    const today = new Date();
    return today <= dueDate;
  };

  return (
    <>
      {/* 1. Header Row */}
      <DialogHeader className="border-b px-6 py-6 -m-6 mb-0">
        <div className="flex flex-col gap-4">
          {/* Back and Close Button Row */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          {/* Title and Status Banner Tile */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold truncate text-indigo-900 dark:text-indigo-100" data-testid="text-request-title">
                  {request.title}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${calculateUrgency(request).colorClass}`}>
                    {calculateUrgency(request).label}
                  </Badge>
                </div>
              </div>

              {/* Status Banners - Same line as title */}
              {request.status === "accepted" && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 flex-shrink-0" data-testid="banner-request-accepted">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">✓ Request Accepted</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Ready for assignment</p>
                  </div>
                </div>
              )}

              {request.rejectionReason && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-700 flex-shrink-0" data-testid="banner-request-rejected">
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 whitespace-nowrap">✗ Request Rejected</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">{request.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Accept/Reject Buttons - Only for Team Lead when status is pending review */}
              {isTeamLead && (request.status === "submitted" || request.status === "under_review" || request.status === "pending_review") && (
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    onClick={() => acceptRequestMutation.mutate()}
                    disabled={acceptRequestMutation.isPending}
                    data-testid="button-accept-request"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {acceptRequestMutation.isPending ? "Accepting..." : "Accept"}
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={rejectRequestMutation.isPending}
                    variant="destructive"
                    data-testid="button-reject-request"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="flex-1">
        {/* 2. 4-Column Info Tiles Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mb-1 flex items-center gap-1">
              {getPriorityIcon(request.priority)}
              Priority
            </p>
            <p className="text-sm font-semibold truncate" data-testid="priority-display">
              {formatPriority(request.priority)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50">
            <p className="text-xs text-purple-600 dark:text-purple-400 uppercase mb-1">Due Date</p>
            <p className="text-sm font-semibold truncate" data-testid="text-due-date">
              {new Date(request.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mb-1">Department</p>
            <p className="text-sm font-semibold capitalize truncate" data-testid="text-department">
              {request.department}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50">
            <p className="text-xs text-purple-600 dark:text-purple-400 uppercase mb-1">Requested By</p>
            <p className="text-sm font-semibold truncate" data-testid="text-requested-by">
              {request.requestedBy.firstName} {request.requestedBy.lastName}
            </p>
          </div>
        </div>

        {/* 3. 3-Column Edit Row - Only for Team Lead */}
        {isTeamLead && (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-4 px-6 py-4 border-b bg-indigo-50 dark:bg-indigo-950/20">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                New Priority
              </label>
              <div className="flex gap-2">
                <Select 
                  value={editedPriority} 
                  onValueChange={(value) => setEditedPriority(value as any)}
                  data-testid="select-edit-priority"
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                    <SelectItem value="p1_high">P1 - High</SelectItem>
                    <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                    <SelectItem value="p3_low">P3 - Low</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    updatePriorityDeadlineMutation.mutate({
                      priority: editedPriority,
                      dueDate: editedDueDate,
                    });
                  }}
                  disabled={updatePriorityDeadlineMutation.isPending}
                  data-testid="button-save-priority"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                New Due Date
              </label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={editedDueDate}
                  onChange={(e) => setEditedDueDate(e.target.value)}
                  className="flex-1"
                  data-testid="input-edit-due-date"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updatePriorityDeadlineMutation.mutate({
                      priority: editedPriority,
                      dueDate: editedDueDate,
                    });
                  }}
                  disabled={updatePriorityDeadlineMutation.isPending}
                  data-testid="button-save-deadline"
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                Assigned To
              </label>
              <div className="flex gap-2">
                <Select 
                  value={selectedAnalyst} 
                  onValueChange={setSelectedAnalyst}
                  data-testid="select-assign-analyst"
                >
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
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 4. 2-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 px-6 py-4">
          {/* Left Column - Request Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Common fields for most request types */}
                {(request.primaryQuestion || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change'].includes(request.type)) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Primary Question</p>
                    <p className="text-sm" data-testid="text-primary-question">
                      {request.primaryQuestion || 'N/A'}
                    </p>
                  </div>
                )}

                {(request.businessProblem || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change'].includes(request.type)) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Business Problem or Goal</p>
                    <p className="text-sm" data-testid="text-business-problem">
                      {request.businessProblem || 'N/A'}
                    </p>
                  </div>
                )}

                {(request.decisionAction || ['adhoc_analysis', 'new_dashboard', 'modify_dashboard'].includes(request.type)) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Decision or Action</p>
                    <p className="text-sm" data-testid="text-decision-action">
                      {request.decisionAction || 'N/A'}
                    </p>
                  </div>
                )}

                {(request.impact || request.frequency) && (
                  <div className="grid grid-cols-2 gap-4">
                    {request.impact && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Impact</p>
                        <p className="text-sm capitalize" data-testid="text-impact">
                          {request.impact}
                        </p>
                      </div>
                    )}
                    {request.frequency && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Frequency</p>
                        <p className="text-sm" data-testid="text-frequency">
                          {request.frequency}
                          {request.frequencyDuration && request.frequencyUnit && 
                            ` (${request.frequencyDuration} ${request.frequencyUnit})`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Data Bug fields */}
                {request.bugDescription && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Bug Description</p>
                    <p className="text-sm" data-testid="text-bug-description">
                      {request.bugDescription}
                    </p>
                  </div>
                )}

                {request.bugLocation && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Bug Location</p>
                    <p className="text-sm" data-testid="text-bug-location">
                      {request.bugLocation}
                    </p>
                  </div>
                )}

                {/* BigQuery Access fields */}
                {request.bqEmail && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">BigQuery Email</p>
                    <p className="text-sm" data-testid="text-bq-email">
                      {request.bqEmail}
                    </p>
                  </div>
                )}

                {request.bqDatasets && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Datasets Needed</p>
                    <p className="text-sm" data-testid="text-bq-datasets">
                      {request.bqDatasets}
                    </p>
                  </div>
                )}

                {request.bqPurpose && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Purpose</p>
                    <p className="text-sm" data-testid="text-bq-purpose">
                      {request.bqPurpose}
                    </p>
                  </div>
                )}

                {/* Tracking fields */}
                {request.trackingPlatform && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Tracking Platform</p>
                    <p className="text-sm capitalize" data-testid="text-tracking-platform">
                      {request.trackingPlatform}
                    </p>
                  </div>
                )}

                {request.trackingEvent && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Tracking Event</p>
                    <p className="text-sm" data-testid="text-tracking-event">
                      {request.trackingEvent}
                    </p>
                  </div>
                )}

                {request.trackingDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Tracking Details</p>
                    <p className="text-sm" data-testid="text-tracking-details">
                      {request.trackingDetails}
                    </p>
                  </div>
                )}

                {/* Metric Change fields */}
                {request.metricName && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Metric Name</p>
                    <p className="text-sm" data-testid="text-metric-name">
                      {request.metricName}
                    </p>
                  </div>
                )}

                {request.metricChangeType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Metric Change Type</p>
                    <p className="text-sm" data-testid="text-metric-change-type">
                      {request.metricChangeType}
                    </p>
                  </div>
                )}

                {request.metricReason && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Metric Reason</p>
                    <p className="text-sm" data-testid="text-metric-reason">
                      {request.metricReason}
                    </p>
                  </div>
                )}

                {/* Pipeline Change fields */}
                {request.pipelineName && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Pipeline Name</p>
                    <p className="text-sm" data-testid="text-pipeline-name">
                      {request.pipelineName}
                    </p>
                  </div>
                )}

                {request.pipelineChangeType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Pipeline Change Type</p>
                    <p className="text-sm" data-testid="text-pipeline-change-type">
                      {request.pipelineChangeType}
                    </p>
                  </div>
                )}

                {request.pipelineDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Pipeline Details</p>
                    <p className="text-sm" data-testid="text-pipeline-details">
                      {request.pipelineDetails}
                    </p>
                  </div>
                )}

                {/* Dashboard specific fields */}
                {request.dashboardAudience && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Dashboard Audience</p>
                    <p className="text-sm" data-testid="text-dashboard-audience">
                      {request.dashboardAudience}
                    </p>
                  </div>
                )}

                {request.dashboardRefreshFrequency && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Dashboard Refresh Frequency</p>
                    <p className="text-sm" data-testid="text-dashboard-refresh-frequency">
                      {request.dashboardRefreshFrequency}
                    </p>
                  </div>
                )}

                {request.keyMetrics && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Key Metrics</p>
                    <p className="text-sm" data-testid="text-key-metrics">
                      {request.keyMetrics}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Delivery Status Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Request Type */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Request Type</p>
                  <p className="text-sm font-medium" data-testid="text-request-type">
                    {formatRequestType(request.type)}
                  </p>
                </div>

                {/* Attachments */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                    Attachments ({request.attachments?.length || 0})
                  </p>
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    maxFileSize={10 * 1024 * 1024}
                    maxNumberOfFiles={5}
                    buttonVariant="outline"
                    buttonSize="sm"
                    buttonClassName="w-full"
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Upload File
                  </ObjectUploader>
                  {request.attachments && request.attachments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {request.attachments.map((attachment) => (
                        <div key={attachment.id} className="border rounded-lg p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs truncate" data-testid={`attachment-name-${attachment.id}`}>
                              {attachment.fileName}
                            </span>
                          </div>
                          <a
                            href={attachment.filePath}
                            download={attachment.fileName}
                            data-testid={`button-download-${attachment.id}`}
                          >
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery Status Panel - For Analyst or Team Lead when assigned */}
                {(isAnalyst || (isTeamLead && isAssignedToMe)) && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Delivery Status</p>
                    
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivery Type
                      </label>
                      <Select 
                        value={deliveryType} 
                        onValueChange={setDeliveryType}
                        data-testid="select-delivery-type"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attachment">Attachment</SelectItem>
                          <SelectItem value="link">Link</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {deliveryType === "attachment" && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                          Upload Delivery File
                        </p>
                        <ObjectUploader
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          maxFileSize={10 * 1024 * 1024}
                          maxNumberOfFiles={1}
                          buttonVariant="outline"
                          buttonSize="sm"
                          buttonClassName="w-full"
                        >
                          <Paperclip className="w-4 h-4 mr-2" />
                          Upload Delivery File
                        </ObjectUploader>
                      </div>
                    )}

                    {deliveryType === "link" && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                          Delivery Link
                        </label>
                        <Input
                          value={deliveryLink}
                          onChange={(e) => setDeliveryLink(e.target.value)}
                          placeholder="Enter delivery link..."
                          data-testid="input-delivery-link"
                        />
                      </div>
                    )}

                    <Button
                      onClick={handleDeliver}
                      disabled={deliveredRequestMutation.isPending || (deliveryType === "link" && !deliveryLink.trim())}
                      data-testid="button-delivered"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {deliveredRequestMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Marking as Delivered...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Delivered
                        </>
                      )}
                    </Button>

                    {/* On Time/Late status - Show after delivered */}
                    {request.deliveredAt && (
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                        {isOnTime() ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-400" data-testid="status-on-time">On Time</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-semibold text-red-700 dark:text-red-400" data-testid="status-late">Late</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Read-Only Delivery Panel for Team Lead */}
                {isTeamLead && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Delivery Status (Analyst View)</p>
                    
                    {/* Delivery Type Display */}
                    {request.deliveryType && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                          Delivery Type
                        </label>
                        <Badge variant="outline" data-testid="badge-delivery-type">
                          {request.deliveryType === "attachment" ? "Attachment" : "Link"}
                        </Badge>
                      </div>
                    )}

                    {/* Delivery Link/File Display */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivery Link/File
                      </label>
                      {request.deliveryType === "link" && request.deliveryLink ? (
                        <a 
                          href={request.deliveryLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                          data-testid="text-delivery-link"
                        >
                          {request.deliveryLink}
                        </a>
                      ) : request.deliveryType === "attachment" ? (
                        <p className="text-sm text-muted-foreground" data-testid="text-delivery-file">
                          File uploaded
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground" data-testid="text-no-delivery">
                          Not set yet
                        </p>
                      )}
                    </div>

                    {/* Delivered Status */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivered Status
                      </label>
                      {request.deliveredAt ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-400" data-testid="text-delivered-yes">
                            Delivered on {new Date(request.deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground" data-testid="text-delivered-no">
                          Not delivered yet
                        </p>
                      )}
                    </div>

                    {/* On Time/Late Indicator - Show only if delivered */}
                    {request.deliveredAt && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                          Delivery Timeliness
                        </label>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                          {isOnTime() ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-semibold text-green-700 dark:text-green-400" data-testid="status-delivery-on-time">On Time</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-sm font-semibold text-red-700 dark:text-red-400" data-testid="status-delivery-late">Late</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* On Time Indicator - For Requester or Team Lead when NOT assigned */}
                {(isRequester || (isTeamLead && !isAssignedToMe)) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Timeline Status</p>
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                      {isOnTime() ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-semibold text-green-700 dark:text-green-400">On Time</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Overdue</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Completed Button - For Analyst or Team Lead when assigned and in_progress */}
                {(isAnalyst || (isTeamLead && isAssignedToMe)) && request.status === "in_progress" && (
                  <Button
                    onClick={() => completeRequestMutation.mutate()}
                    disabled={completeRequestMutation.isPending}
                    data-testid="button-mark-complete"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {completeRequestMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                )}

                {/* Assigned Analyst Display */}
                {request.assignedTo && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Assigned Analyst</p>
                    <div className="flex items-center gap-2 p-2 border rounded-lg">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={request.assignedTo.profileImageUrl ?? ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(request.assignedTo.firstName ?? undefined, request.assignedTo.lastName ?? undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid="text-assigned-analyst">
                          {request.assignedTo.firstName} {request.assignedTo.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 5. Comments Section - Full Width */}
        <div className="px-6 py-4 border-t">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments & Discussion ({request.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comments List */}
              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {request.comments.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  </div>
                ) : (
                  request.comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.user.profileImageUrl ?? ""} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getInitials(comment.user.firstName ?? undefined, comment.user.lastName ?? undefined)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold" data-testid={`comment-author-${comment.id}`}>
                              {comment.user.firstName} {comment.user.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground" data-testid={`comment-date-${comment.id}`}>
                              {comment.createdAt ? formatDate(comment.createdAt.toString()) : ''}
                            </span>
                          </div>
                          <p className="text-sm break-words" data-testid={`comment-content-${comment.id}`}>
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Typing Indicator */}
              {typingUsers[request.id] && typingUsers[request.id].length > 0 && (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground animate-in fade-in duration-200" data-testid="typing-indicator">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span>
                    {typingUsers[request.id].length === 1 
                      ? `${typingUsers[request.id][0]} is typing...`
                      : typingUsers[request.id].length === 2
                      ? `${typingUsers[request.id][0]} and ${typingUsers[request.id][1]} are typing...`
                      : `${typingUsers[request.id].slice(0, -1).join(', ')}, and ${typingUsers[request.id].slice(-1)} are typing...`
                    }
                  </span>
                </div>
              )}

              {/* Add Comment Form */}
              <form onSubmit={onCommentSubmit} className="space-y-3 pt-2">
                <Textarea
                  value={newComment}
                  onChange={handleCommentChange}
                  placeholder="Write a comment or ask a question..."
                  className="min-h-[80px]"
                  data-testid="input-new-comment"
                />
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Post Comment
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

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
              <label className="text-sm font-medium mb-2 block">Analyst</label>
              <Select value={assignAnalystId} onValueChange={setAssignAnalystId} data-testid="select-assign-analyst-dialog">
                <SelectTrigger>
                  <SelectValue placeholder="Select analyst..." />
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
              <label className="text-sm font-medium mb-2 block">Due Date (Optional)</label>
              <Input
                type="date"
                value={assignDueDate}
                onChange={(e) => setAssignDueDate(e.target.value)}
                data-testid="input-assign-due-date"
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
              data-testid="button-cancel-assign-dialog"
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignAnalystMutation.mutate({ 
                analystId: assignAnalystId, 
                dueDate: assignDueDate || undefined 
              })}
              disabled={!assignAnalystId || assignAnalystMutation.isPending}
              data-testid="button-confirm-assign-dialog"
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
            <DialogTitle>Suggest New Deadline</DialogTitle>
            <DialogDescription>
              Suggest a new deadline for this request based on complexity and workload.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Suggested Deadline</label>
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
              data-testid="button-cancel-suggest-deadline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => suggestDeadlineMutation.mutate(suggestedDeadlineDate)}
              disabled={!suggestedDeadlineDate || suggestDeadlineMutation.isPending}
              data-testid="button-confirm-suggest-deadline"
            >
              {suggestDeadlineMutation.isPending ? "Submitting..." : "Submit Suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
