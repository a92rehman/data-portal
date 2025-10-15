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
import { Label } from "@/components/ui/label";
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
  AlertCircle,
  AlertTriangle,
  Trash2,
  User2,
  User as UserIcon,
  Package,
  Link as LinkIcon,
  FileText,
  Calendar,
  RefreshCw,
  Edit,
  Edit2,
  ListTodo,
  ListChecks,
  Plus,
  Users
} from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { calculateUrgency } from "@/lib/urgency";
import { formatRequestType } from "@/lib/formatters";

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
  const [selectedAnalyst, setSelectedAnalyst] = useState(request.assignedToId || "unassigned");
  const [editedPriority, setEditedPriority] = useState(request.priority);
  const [editedDueDate, setEditedDueDate] = useState(new Date(request.dueDate).toISOString().split('T')[0]);
  const [editedRequestType, setEditedRequestType] = useState(request.type);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [showEditPriorityDialog, setShowEditPriorityDialog] = useState(false);
  const [showEditDueDateDialog, setShowEditDueDateDialog] = useState(false);
  const [showEditRequestTypeDialog, setShowEditRequestTypeDialog] = useState(false);
  const [showEditAssignedToDialog, setShowEditAssignedToDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState("unassigned");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskOptimisticTime, setNewTaskOptimisticTime] = useState("");
  const [newTaskMostLikelyTime, setNewTaskMostLikelyTime] = useState("");
  const [newTaskPessimisticTime, setNewTaskPessimisticTime] = useState("");
  
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

  // Fetch tasks linked to this request
  const { data: requestTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/requests", request.id, "tasks"],
    queryFn: async () => {
      const response = await fetch(`/api/requests/${request.id}/tasks`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch request tasks');
      return response.json();
    },
    enabled: !!(user && request.id),
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

  const updateRequestTypeMutation = useMutation({
    mutationFn: async (type: string) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/request-type`, { type });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request type updated successfully",
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
        description: error.message || "Failed to update request type",
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const deleteRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/requests/${request.id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request deleted successfully",
      });
      setShowDeleteDialog(false);
      onClose(); // Close the dialog after deletion
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete request",
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

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully",
      });
      setShowCreateTaskDialog(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAssignedTo("unassigned");
      setNewTaskDueDate("");
      setNewTaskOptimisticTime("");
      setNewTaskMostLikelyTime("");
      setNewTaskPessimisticTime("");
      // Invalidate request tasks
      queryClient.invalidateQueries({ queryKey: ["/api/requests", request.id, "tasks"] });
      // Invalidate all task queries including those with filters
      queryClient.invalidateQueries({ 
        queryKey: ["/api/tasks"],
        refetchType: 'all' 
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      // Yellow - Pending/Initial state
      pending_review: "gradient-badge-progress",
      
      // Blue - Accepted/Ready state
      accepted: "gradient-badge-review",
      
      // Green - Completed state
      completed: "gradient-badge-completed",
      
      // Yellow - Active/In-Progress state
      in_progress: "gradient-badge-progress",
      
      // Red - Negative/Blocked/Rejected states
      rejected: "gradient-badge-cancelled",
      blocked: "gradient-badge-cancelled",
    };
    return variants[status as keyof typeof variants] || "gradient-badge-progress";
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
      case "pending_review":
        return <Eye className="w-4 h-4" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Settings className="w-4 h-4" />;
      case "blocked":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
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
  const isPrimaryDataLead = (user as any)?.email === "abdur.rehman@taleemabad.com" && (user as any)?.role === "team_lead";

  const [deliveryType, setDeliveryType] = useState("attachment");
  const [deliveryLink, setDeliveryLink] = useState("");
  const [deliveryContent, setDeliveryContent] = useState("");
  const [deliveryFileUrl, setDeliveryFileUrl] = useState("");
  const [deliveryFileName, setDeliveryFileName] = useState("");
  const [isDeliverAgainMode, setIsDeliverAgainMode] = useState(false);

  const deliveredRequestMutation = useMutation({
    mutationFn: async (data: { 
      deliveryType: string; 
      deliveryLink?: string; 
      deliveryContent?: string;
      deliveryFileUrl?: string;
      deliveryFileName?: string;
    }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/delivered`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request marked as delivered successfully",
      });
      setIsDeliverAgainMode(false);
      // Reset form fields
      setDeliveryLink("");
      setDeliveryContent("");
      setDeliveryFileUrl("");
      setDeliveryFileName("");
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

  const handleDeliveryFileUpload = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
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
      
      // Generate the file URL based on the upload token
      const fileUrl = `/api/objects/${uploadToken}`;
      setDeliveryFileUrl(fileUrl);
      setDeliveryFileName(file.name || "delivery-file");
      
      toast({
        title: "Success",
        description: "Delivery file uploaded successfully. Click 'Mark as Delivered' to complete.",
      });
    }
  };

  const handleDeliver = () => {
    const data: any = { deliveryType };
    
    if (deliveryType === "link") {
      data.deliveryLink = deliveryLink;
    } else if (deliveryType === "text") {
      data.deliveryContent = deliveryContent;
    } else if (deliveryType === "attachment") {
      data.deliveryFileUrl = deliveryFileUrl;
      data.deliveryFileName = deliveryFileName;
    }
    
    deliveredRequestMutation.mutate(data);
  };

  const isOnTime = () => {
    const dueDate = new Date(request.dueDate);
    // Set due date to end of day for comparison
    dueDate.setHours(23, 59, 59, 999);
    
    if (request.deliveredAt) {
      // If delivered, check if delivered on or before due date
      const deliveredDate = new Date(request.deliveredAt);
      return deliveredDate <= dueDate;
    } else {
      // If not delivered yet, check if current time is still before due date
      const now = new Date();
      return now <= dueDate;
    }
  };

  return (
    <>
      {/* 1. Header Row */}
      <DialogHeader className="border-b -m-6 mb-0">
        <div className="flex flex-col">
          {/* Top Action Buttons Row */}
          <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-2">
            <Button
              variant="outline"
              size="default"
              onClick={onClose}
              className="flex-shrink-0 gap-2 shadow-sm hover:shadow-md transition-shadow"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back</span>
            </Button>
            
            {/* Action Buttons Group - Positioned down and slightly left */}
            <div className="flex gap-2 mr-10 mt-3">
              {/* Accept/Reject Buttons - Data Lead can toggle between accept and reject */}
              {isTeamLead && (request.status === "pending_review" || request.status === "accepted" || request.rejectionReason) && (
                <>
                  {/* Show Accept button ONLY if rejected */}
                  {request.rejectionReason && (
                    <Button
                      onClick={() => acceptRequestMutation.mutate()}
                      disabled={acceptRequestMutation.isPending}
                      size="sm"
                      data-testid="button-accept-request"
                      className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {acceptRequestMutation.isPending ? "Accepting..." : "Accept"}
                    </Button>
                  )}
                  {/* Show Reject button ONLY if accepted OR pending review (not rejected) */}
                  {(request.status === "accepted" || request.status === "pending_review") && !request.rejectionReason && (
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={rejectRequestMutation.isPending}
                      variant="destructive"
                      size="sm"
                      data-testid="button-reject-request"
                      className="shadow-md"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  )}
                </>
              )}

              {/* Delete Button - Only for Primary Data Lead */}
              {isPrimaryDataLead && (
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  size="sm"
                  data-testid="button-delete-request"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}

              {/* Create Task Button */}
              {((user as any)?.role === 'team_lead' || (user as any)?.role === 'analyst') && (
                <Button
                  size="sm"
                  onClick={() => {
                    if (requestTasks && requestTasks.length > 0) {
                      toast({
                        title: "Task Already Exists",
                        description: "A task against this request has already been created.",
                        variant: "destructive",
                      });
                    } else {
                      setShowCreateTaskDialog(true);
                    }
                  }}
                  data-testid="button-create-task-header"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Task
                </Button>
              )}
            </div>
          </div>

          {/* Title Tile with Status Badge - Full Width */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-4 border-y border-indigo-200 dark:border-indigo-800/50 mt-4">
            <div className="flex items-center justify-center gap-4 relative px-6">
              {/* Centered Title and Urgency */}
              <div className="flex items-center gap-3">
                <DialogTitle className="text-xl font-bold text-indigo-900 dark:text-indigo-100" data-testid="text-request-title">
                  {formatRequestType(request.type)}
                </DialogTitle>
                {(() => {
                  const urgency = calculateUrgency(request);
                  if (!urgency.label) {
                    return null;
                  }
                  return (
                    <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${urgency.colorClass}`}>
                      {urgency.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* Status Badge on the Right - Absolutely positioned */}
              <div className="absolute right-0 flex gap-2">
                {/* Task Created Badge */}
                {requestTasks && requestTasks.length > 0 && (
                  <Badge className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-semibold pl-[12px] pr-[12px] mt-[0px] mb-[0px] ml-[-42px] mr-[-42px]" data-testid="badge-task-created">
                    <ListChecks className="w-4 h-4 mr-1.5" />
                    Task Created
                  </Badge>
                )}
                
                {request.status === "accepted" && !request.rejectionReason && (
                  <Badge className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold ml-[40px] mr-[40px]" data-testid="badge-request-accepted">
                    <Check className="w-4 h-4 mr-1.5" />
                    Request Accepted
                  </Badge>
                )}

                {request.rejectionReason && (
                  <Badge className="px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 font-semibold" data-testid="badge-request-rejected">
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Request Rejected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="flex-1">
        {/* 2. Info Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 px-6 py-4 border-b bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-blue-950/20">
          {/* 1. Requested By Card */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm">
            <p className="text-xs text-purple-600 dark:text-purple-400 uppercase mb-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              Requested By
            </p>
            <p className="text-sm font-semibold truncate" data-testid="text-requested-by">
              {request.requestedBy.firstName} {request.requestedBy.lastName}
            </p>
          </div>

          {/* 2. Department & Team Card */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mb-1">Department</p>
            <p className="text-sm font-semibold capitalize truncate" data-testid="text-department">
              {request.department}
            </p>
            {request.team && (
              <p className="text-xs text-muted-foreground mt-1 truncate" data-testid="text-team">
                {request.team}
              </p>
            )}
          </div>

          {/* 3. Request Type Card with Edit Button */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-800/50 shadow-sm relative group">
            <p className="text-xs text-green-600 dark:text-green-400 uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Request Type
            </p>
            <p className="text-sm font-semibold truncate" data-testid="text-request-type">
              {formatRequestType(request.type)}
            </p>
            {(isTeamLead || isAnalyst) && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditRequestTypeDialog(true)}
                data-testid="button-edit-request-type"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 4. Priority Card with Edit Button */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800/50 shadow-sm relative group">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase mb-1 flex items-center gap-1">
              {getPriorityIcon(request.priority)}
              Priority
              {request.originalPriority && request.originalPriority !== request.priority && (
                <span className="inline-flex items-center justify-center w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Priority has been changed" />
              )}
            </p>
            <p className="text-sm font-semibold truncate" data-testid="priority-display">
              {formatPriority(request.priority)}
            </p>
            {request.originalPriority && request.originalPriority !== request.priority && (
              <p className="text-xs text-muted-foreground line-through mt-1" title="Original priority">
                was {formatPriority(request.originalPriority)}
              </p>
            )}
            {isTeamLead && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditPriorityDialog(true)}
                data-testid="button-edit-priority"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 5. Created Date Card */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 shadow-sm">
            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created
            </p>
            <p className="text-sm font-semibold truncate" data-testid="text-created-date">
              {request.createdAt ? new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : 'N/A'}
            </p>
          </div>

          {/* 6. Due Date Card with Edit Button */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm relative group">
            <p className="text-xs text-purple-600 dark:text-purple-400 uppercase mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Due Date
              {request.originalDueDate && new Date(request.originalDueDate).getTime() !== new Date(request.dueDate).getTime() && (
                <span className="inline-flex items-center justify-center w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" title="Due date has been changed" />
              )}
            </p>
            <p className="text-sm font-semibold truncate" data-testid="text-due-date">
              {new Date(request.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {request.originalDueDate && new Date(request.originalDueDate).getTime() !== new Date(request.dueDate).getTime() && (
              <p className="text-xs text-muted-foreground line-through mt-1" title="Original due date">
                was {new Date(request.originalDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
            {isTeamLead && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditDueDateDialog(true)}
                data-testid="button-edit-due-date"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 7. Assigned To Card with Edit Button */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-teal-200 dark:border-teal-800/50 shadow-sm relative group">
            <p className="text-xs text-teal-600 dark:text-teal-400 uppercase mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Assigned To
            </p>
            <p className="text-sm font-semibold truncate" data-testid="text-assigned-to">
              {request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned'}
            </p>
            {isTeamLead && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setShowEditAssignedToDialog(true)}
                data-testid="button-edit-assigned-to"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 3. 2-Column Main Content */}
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
            <Card className="border-2 border-purple-200 dark:border-purple-800/50 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Delivery Status
                </CardTitle>
                {(isAnalyst || (isTeamLead && isAssignedToMe)) && !request.deliveredAt && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <InfoIcon className="w-4 h-4" />
                      Your delivery will appear in this box once uploaded
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unified Delivery Box - Reorganized Layout */}
                {(isAnalyst || (isTeamLead && isAssignedToMe)) && (
                  <div className="space-y-3 border-t pt-4">
                    {/* Delivery Identification Message */}
                    {request.deliveredAt ? (
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                            You have 1 delivery
                          </p>
                        </div>
                        {!isDeliverAgainMode && (
                          <Button
                            onClick={() => setIsDeliverAgainMode(true)}
                            variant="outline"
                            size="sm"
                            data-testid="button-deliver-again"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Deliver Again
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-muted-foreground">
                          No delivery yet
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Delivery Status</p>
                    </div>

                    {/* Show Edit Form if: not delivered yet OR in deliver-again mode */}
                    {(!request.deliveredAt || isDeliverAgainMode) && (
                      <>
                        {/* 1. Delivery Type Selector */}
                        <div className="pb-3 border-b">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Delivery Type
                            </label>
                          </div>
                          <div className="ml-6">
                            <Select 
                              value={deliveryType} 
                              onValueChange={setDeliveryType}
                              data-testid="select-delivery-type"
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="attachment">📎 Attachment</SelectItem>
                                <SelectItem value="link">🔗 Link</SelectItem>
                                <SelectItem value="text">📝 Text</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* 2. Delivery Content Input */}
                        <div className="pb-3 border-b">
                          <div className="flex items-center gap-2 mb-2">
                            {deliveryType === "attachment" ? <Paperclip className="w-4 h-4 text-muted-foreground" /> :
                             deliveryType === "link" ? <LinkIcon className="w-4 h-4 text-muted-foreground" /> :
                             <FileText className="w-4 h-4 text-muted-foreground" />}
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Content
                            </label>
                          </div>

                          <div className="ml-6">
                            {deliveryType === "attachment" && (
                              <div>
                                <ObjectUploader
                                  onGetUploadParameters={handleGetUploadParameters}
                                  onComplete={handleDeliveryFileUpload}
                                  maxFileSize={10 * 1024 * 1024}
                                  maxNumberOfFiles={1}
                                  buttonVariant="outline"
                                  buttonSize="sm"
                                  buttonClassName="w-full"
                                >
                                  <Paperclip className="w-4 h-4 mr-2" />
                                  {deliveryFileName ? `Uploaded: ${deliveryFileName}` : "Upload Delivery File"}
                                </ObjectUploader>
                                {deliveryFileName && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                    ✓ File ready: {deliveryFileName}
                                  </p>
                                )}
                              </div>
                            )}

                            {deliveryType === "link" && (
                              <Input
                                value={deliveryLink}
                                onChange={(e) => setDeliveryLink(e.target.value)}
                                placeholder="Enter delivery link..."
                                data-testid="input-delivery-link"
                              />
                            )}

                            {deliveryType === "text" && (
                              <Textarea
                                value={deliveryContent}
                                onChange={(e) => setDeliveryContent(e.target.value)}
                                placeholder="Enter delivery content or notes..."
                                rows={4}
                                data-testid="textarea-delivery-content"
                              />
                            )}
                          </div>
                        </div>

                        {/* Deliver/Cancel Buttons */}
                        <div className="flex gap-2">
                          {isDeliverAgainMode && (
                            <Button
                              onClick={() => {
                                setIsDeliverAgainMode(false);
                                setDeliveryLink("");
                                setDeliveryContent("");
                                setDeliveryFileUrl("");
                                setDeliveryFileName("");
                              }}
                              variant="outline"
                              className="flex-1"
                              data-testid="button-cancel-deliver"
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            onClick={handleDeliver}
                            disabled={
                              deliveredRequestMutation.isPending || 
                              (deliveryType === "link" && !deliveryLink.trim()) ||
                              (deliveryType === "text" && !deliveryContent.trim()) ||
                              (deliveryType === "attachment" && !deliveryFileUrl)
                            }
                            data-testid="button-delivered"
                            className={`${isDeliverAgainMode ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white`}
                          >
                            {deliveredRequestMutation.isPending ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                {isDeliverAgainMode ? 'Updating...' : 'Marking as Delivered...'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {isDeliverAgainMode ? 'Update Delivery' : 'Mark as Delivered'}
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Show Read-Only View if delivered and NOT in deliver-again mode */}
                    {request.deliveredAt && !isDeliverAgainMode && (
                      <>
                        {/* 1. Delivery Type (Read-Only) */}
                        <div className="pb-3 border-b">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Delivery Type
                            </label>
                          </div>
                          <Badge variant="outline" className="ml-6" data-testid="badge-delivery-type">
                            {request.deliveryType === "attachment" ? "📎 Attachment" : 
                             request.deliveryType === "link" ? "🔗 Link" : 
                             "📝 Text"}
                          </Badge>
                        </div>

                        {/* 2. Delivered Content (Read-Only) */}
                        <div className="pb-3 border-b">
                          <div className="flex items-center gap-2 mb-2">
                            {request.deliveryType === "attachment" ? <Paperclip className="w-4 h-4 text-muted-foreground" /> :
                             request.deliveryType === "link" ? <LinkIcon className="w-4 h-4 text-muted-foreground" /> :
                             <FileText className="w-4 h-4 text-muted-foreground" />}
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Content
                            </label>
                          </div>
                          <div className="ml-6">
                            {request.deliveryType === "link" && request.deliveryLink ? (
                              <a 
                                href={request.deliveryLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                                data-testid="link-delivery-content"
                              >
                                {request.deliveryLink}
                              </a>
                            ) : request.deliveryType === "text" && request.deliveryContent ? (
                              <div className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg whitespace-pre-wrap" data-testid="text-delivery-content">
                                {request.deliveryContent}
                              </div>
                            ) : request.deliveryType === "attachment" && request.deliveryFileUrl ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={request.deliveryFileUrl}
                                  download={request.deliveryFileName || "delivery-file"}
                                  className="flex-1"
                                  data-testid="link-download-delivery"
                                >
                                  <Button variant="outline" size="sm" className="w-full justify-start">
                                    <FileIcon className="w-4 h-4 mr-2" />
                                    <span className="truncate">{request.deliveryFileName || "Download File"}</span>
                                  </Button>
                                </a>
                                <a
                                  href={request.deliveryFileUrl}
                                  download={request.deliveryFileName || "delivery-file"}
                                  data-testid="button-download-delivery"
                                >
                                  <Button variant="ghost" size="sm">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </a>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground" data-testid="text-no-delivery-content">
                                No delivery content available
                              </p>
                            )}
                          </div>
                        </div>

                        {/* 3. Delivered On */}
                        <div className="pb-3 border-b">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Delivered On
                            </label>
                          </div>
                          <div className="flex items-center gap-2 ml-6">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-green-700 dark:text-green-400" data-testid="text-delivered-date">
                              {new Date(request.deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>

                        {/* 4. Delivery Status */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <label className="text-xs font-semibold text-muted-foreground uppercase">
                              Delivery Status
                            </label>
                          </div>
                          <div className={`ml-6 flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
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
                      </>
                    )}
                  </div>
                )}

                {/* Read-Only Delivery View for Non-Assignees */}
                {!(isAnalyst || (isTeamLead && isAssignedToMe)) && request.deliveredAt && (
                  <div className="space-y-3 border-t pt-4">
                    {/* Delivery Identification Message */}
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        This request has 1 delivery
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground uppercase font-semibold">Delivery Status</p>

                    {/* 1. Delivery Type */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Delivery Type
                        </label>
                      </div>
                      <Badge variant="outline" className="ml-6" data-testid="badge-delivery-type-readonly">
                        {request.deliveryType === "attachment" ? "📎 Attachment" : 
                         request.deliveryType === "link" ? "🔗 Link" : 
                         "📝 Text"}
                      </Badge>
                    </div>

                    {/* 4. Delivered Content */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        {request.deliveryType === "attachment" ? <Paperclip className="w-4 h-4 text-muted-foreground" /> :
                         request.deliveryType === "link" ? <LinkIcon className="w-4 h-4 text-muted-foreground" /> :
                         <FileText className="w-4 h-4 text-muted-foreground" />}
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Content
                        </label>
                      </div>
                      <div className="ml-6">
                        {request.deliveryType === "link" && request.deliveryLink ? (
                          <a 
                            href={request.deliveryLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                            data-testid="link-delivery-content-readonly"
                          >
                            {request.deliveryLink}
                          </a>
                        ) : request.deliveryType === "text" && request.deliveryContent ? (
                          <div className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg whitespace-pre-wrap" data-testid="text-delivery-content-readonly">
                            {request.deliveryContent}
                          </div>
                        ) : request.deliveryType === "attachment" && request.deliveryFileUrl ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={request.deliveryFileUrl}
                              download={request.deliveryFileName || "delivery-file"}
                              className="flex-1"
                              data-testid="link-download-delivery-readonly"
                            >
                              <Button variant="outline" size="sm" className="w-full justify-start">
                                <FileIcon className="w-4 h-4 mr-2" />
                                <span className="truncate">{request.deliveryFileName || "Download File"}</span>
                              </Button>
                            </a>
                            <a
                              href={request.deliveryFileUrl}
                              download={request.deliveryFileName || "delivery-file"}
                              data-testid="button-download-delivery-readonly"
                            >
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground" data-testid="text-no-delivery-content-readonly">
                            No delivery content available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 3. Delivered On */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Delivered On
                        </label>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-400" data-testid="text-delivered-date-readonly">
                          {new Date(request.deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* 4. Delivery Status */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Delivery Status
                        </label>
                      </div>
                      <div className={`ml-6 flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                        {isOnTime() ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-semibold text-green-700 dark:text-green-400" data-testid="status-delivery-on-time-readonly">On Time</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-semibold text-red-700 dark:text-red-400" data-testid="status-delivery-late-readonly">Late</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* On Time Indicator - For Requester or Team Lead when NOT assigned and NOT delivered */}
                {(isRequester || (isTeamLead && !isAssignedToMe)) && !request.deliveredAt && (
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

        {/* 6. Tasks Section - Full Width */}
        {(request.assignedToId || (user as any)?.role === 'team_lead' || (user as any)?.role === 'analyst') && (
          <div className="px-6 py-4 border-t">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  Linked Tasks ({requestTasks.filter((t: any) => !t.parentTaskId).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requestTasks.filter((t: any) => !t.parentTaskId).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No tasks created yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create tasks to organize the work for this request</p>
                  </div>
                ) : (
                  requestTasks
                    .filter((t: any) => !t.parentTaskId)
                    .map((task: any) => {
                      const subTasks = requestTasks.filter((t: any) => t.parentTaskId === task.id);
                      return (
                        <div key={task.id} className="border rounded-lg overflow-hidden">
                          {/* Parent Task */}
                          <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{task.title}</h4>
                                  {subTasks.length > 0 && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                      {subTasks.filter((st: any) => st.status === 'completed').length}/{subTasks.length} sub-tasks
                                    </Badge>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {task.assignedTo && (
                                    <span>Assigned to: {task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {task.status === 'to_do' && 'To Do'}
                                    {task.status === 'in_progress' && 'In Progress'}
                                    {task.status === 'blocked' && 'Blocked'}
                                    {task.status === 'completed' && 'Completed'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.location.href = '/tasks'}
                                className="text-purple-600 hover:text-purple-700"
                              >
                                View
                              </Button>
                            </div>
                          </div>

                          {/* Sub-Tasks */}
                          {subTasks.length > 0 && (
                            <div className="border-t bg-gray-50/50 dark:bg-gray-900/20">
                              {subTasks.map((subTask: any) => (
                                <div 
                                  key={subTask.id} 
                                  className="p-3 pl-8 border-b last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-purple-400 rounded-sm" />
                                        <h5 className="font-medium text-xs">{subTask.title}</h5>
                                      </div>
                                      {subTask.description && (
                                        <p className="text-xs text-muted-foreground mt-1 ml-5">{subTask.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 ml-5">
                                        <Badge 
                                          variant={subTask.status === 'completed' ? 'default' : 'outline'} 
                                          className="text-xs"
                                        >
                                          {subTask.status === 'to_do' && 'To Do'}
                                          {subTask.status === 'in_progress' && 'In Progress'}
                                          {subTask.status === 'blocked' && 'Blocked'}
                                          {subTask.status === 'completed' && 'Completed'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </ScrollArea>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-task">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Create New Task
            </DialogTitle>
            <DialogDescription>
              Create a task to track work for "{request.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="h-px bg-border flex-1" />
                <span>Task Details</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Task Title *</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Build sales dashboard, Extract user data, Fix metric calculation"
                  className="mt-1.5"
                  data-testid="input-task-title"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add details about what needs to be done, requirements, or any relevant context..."
                  className="mt-1.5 min-h-[100px]"
                  rows={4}
                  data-testid="textarea-task-description"
                />
              </div>
            </div>

            {/* Assignment & Schedule Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="h-px bg-border flex-1" />
                <span>Assignment & Schedule</span>
                <div className="h-px bg-border flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {((user as any)?.role === 'team_lead') && (
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      Assign To
                    </Label>
                    <Select value={newTaskAssignedTo} onValueChange={setNewTaskAssignedTo}>
                      <SelectTrigger className="mt-1.5" data-testid="select-assign-to">
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
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Due Date
                  </Label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="mt-1.5"
                    data-testid="input-due-date"
                  />
                </div>
              </div>
            </div>

            {/* PERT Time Estimates Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <div className="h-px bg-border flex-1" />
                <span>Time Estimates (PERT)</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Estimate task duration in hours</p>
                    <p className="text-xs">PERT calculation: (Optimistic + 4 × Most Likely + Pessimistic) ÷ 6</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Best Case (Optimistic)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newTaskOptimisticTime}
                      onChange={(e) => setNewTaskOptimisticTime(e.target.value)}
                      placeholder="2.0"
                      className="mt-1.5"
                      data-testid="input-optimistic-time"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Expected (Most Likely)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newTaskMostLikelyTime}
                      onChange={(e) => setNewTaskMostLikelyTime(e.target.value)}
                      placeholder="4.0"
                      className="mt-1.5"
                      data-testid="input-most-likely-time"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Worst Case (Pessimistic)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newTaskPessimisticTime}
                      onChange={(e) => setNewTaskPessimisticTime(e.target.value)}
                      placeholder="8.0"
                      className="mt-1.5"
                      data-testid="input-pessimistic-time"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateTaskDialog(false);
                setNewTaskTitle("");
                setNewTaskDescription("");
                setNewTaskAssignedTo("unassigned");
                setNewTaskDueDate("");
                setNewTaskOptimisticTime("");
                setNewTaskMostLikelyTime("");
                setNewTaskPessimisticTime("");
              }}
              data-testid="button-cancel-create-task"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const taskData: any = {
                  title: newTaskTitle.trim(),
                  description: newTaskDescription.trim() || undefined,
                  status: "to_do",
                  requestId: request.id,
                  assignedToId: newTaskAssignedTo === "unassigned" ? undefined : newTaskAssignedTo,
                  dueDate: newTaskDueDate || undefined,
                };

                // Add PERT estimates if provided
                if (newTaskOptimisticTime || newTaskMostLikelyTime || newTaskPessimisticTime) {
                  taskData.optimisticTime = newTaskOptimisticTime ? parseFloat(newTaskOptimisticTime) : undefined;
                  taskData.mostLikelyTime = newTaskMostLikelyTime ? parseFloat(newTaskMostLikelyTime) : undefined;
                  taskData.pessimisticTime = newTaskPessimisticTime ? parseFloat(newTaskPessimisticTime) : undefined;
                }

                createTaskMutation.mutate(taskData);
              }}
              disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
              data-testid="button-confirm-create-task"
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Delete Request Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid="dialog-delete-request">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRequestMutation.mutate()}
              disabled={deleteRequestMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteRequestMutation.isPending ? "Deleting..." : "Delete Request"}
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
              <Select value={assignAnalystId || undefined} onValueChange={setAssignAnalystId} data-testid="select-assign-analyst-dialog">
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

      {/* Edit Priority Dialog */}
      <Dialog open={showEditPriorityDialog} onOpenChange={setShowEditPriorityDialog}>
        <DialogContent data-testid="dialog-edit-priority">
          <DialogHeader>
            <DialogTitle>Edit Priority</DialogTitle>
            <DialogDescription>
              Update the priority level for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Priority Level</label>
            <Select 
              value={editedPriority} 
              onValueChange={(value) => setEditedPriority(value as any)}
              data-testid="select-dialog-priority"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                <SelectItem value="p1_high">P1 - High</SelectItem>
                <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                <SelectItem value="p3_low">P3 - Low</SelectItem>
              </SelectContent>
            </Select>
            {request.priority !== editedPriority && (
              <p className="text-xs text-muted-foreground mt-2">
                Current: {formatPriority(request.priority)} → New: {formatPriority(editedPriority)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditedPriority(request.priority);
                setShowEditPriorityDialog(false);
              }}
              data-testid="button-cancel-edit-priority"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updatePriorityDeadlineMutation.mutate({
                  priority: editedPriority,
                  dueDate: editedDueDate,
                });
                setShowEditPriorityDialog(false);
              }}
              disabled={updatePriorityDeadlineMutation.isPending || editedPriority === request.priority}
              data-testid="button-save-edit-priority"
            >
              {updatePriorityDeadlineMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Due Date Dialog */}
      <Dialog open={showEditDueDateDialog} onOpenChange={setShowEditDueDateDialog}>
        <DialogContent data-testid="dialog-edit-due-date">
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
            <DialogDescription>
              Update the deadline for this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Due Date</label>
            <Input 
              type="date" 
              value={editedDueDate}
              onChange={(e) => setEditedDueDate(e.target.value)}
              data-testid="input-dialog-due-date"
            />
            {new Date(request.dueDate).toISOString().split('T')[0] !== editedDueDate && (
              <p className="text-xs text-muted-foreground mt-2">
                Current: {new Date(request.dueDate).toLocaleDateString()} → New: {new Date(editedDueDate).toLocaleDateString()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditedDueDate(new Date(request.dueDate).toISOString().split('T')[0]);
                setShowEditDueDateDialog(false);
              }}
              data-testid="button-cancel-edit-due-date"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updatePriorityDeadlineMutation.mutate({
                  priority: editedPriority,
                  dueDate: editedDueDate,
                });
                setShowEditDueDateDialog(false);
              }}
              disabled={updatePriorityDeadlineMutation.isPending || editedDueDate === new Date(request.dueDate).toISOString().split('T')[0]}
              data-testid="button-save-edit-due-date"
            >
              {updatePriorityDeadlineMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Type Dialog */}
      <Dialog open={showEditRequestTypeDialog} onOpenChange={setShowEditRequestTypeDialog}>
        <DialogContent data-testid="dialog-edit-request-type">
          <DialogHeader>
            <DialogTitle>Edit Request Type</DialogTitle>
            <DialogDescription>
              Update the type of this request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Request Type</label>
            <Select 
              value={editedRequestType} 
              onValueChange={(value) => setEditedRequestType(value as any)}
              data-testid="select-dialog-request-type"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_dashboard">New Dashboard/Report</SelectItem>
                <SelectItem value="modify_dashboard">Modification to Existing Dashboard/Report</SelectItem>
                <SelectItem value="adhoc_analysis">Ad-hoc Data Analysis</SelectItem>
                <SelectItem value="data_extraction">One-time Data Extraction</SelectItem>
                <SelectItem value="data_bug">Data Bug / Data Quality Issue</SelectItem>
                <SelectItem value="bq_access">BigQuery Access Request</SelectItem>
                <SelectItem value="tracking">Event Tracking / Instrumentation</SelectItem>
                <SelectItem value="metric_change">Metric Definition / Business Rule Change</SelectItem>
                <SelectItem value="pipeline_change">Data Pipeline / Table Change</SelectItem>
                <SelectItem value="recurring_report">Scheduled / Recurring Report</SelectItem>
                <SelectItem value="experimentation">Experimentation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {request.type !== editedRequestType && (
              <p className="text-xs text-muted-foreground mt-2">
                Current: {formatRequestType(request.type)} → New: {formatRequestType(editedRequestType)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditedRequestType(request.type);
                setShowEditRequestTypeDialog(false);
              }}
              data-testid="button-cancel-edit-request-type"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateRequestTypeMutation.mutate(editedRequestType);
                setShowEditRequestTypeDialog(false);
              }}
              disabled={updateRequestTypeMutation.isPending || editedRequestType === request.type}
              data-testid="button-save-edit-request-type"
            >
              {updateRequestTypeMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assigned To Dialog */}
      <Dialog open={showEditAssignedToDialog} onOpenChange={setShowEditAssignedToDialog}>
        <DialogContent data-testid="dialog-edit-assigned-to">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Assign or reassign this request to an analyst.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Assigned To</label>
            <Select 
              value={selectedAnalyst} 
              onValueChange={setSelectedAnalyst}
              data-testid="select-dialog-assigned-to"
            >
              <SelectTrigger>
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
            {(request.assignedToId || "unassigned") !== selectedAnalyst && (
              <p className="text-xs text-muted-foreground mt-2">
                Current: {request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned'} → New: {selectedAnalyst === "unassigned" ? "Unassigned" : analysts.find(a => a.id === selectedAnalyst) ? `${analysts.find(a => a.id === selectedAnalyst)?.firstName} ${analysts.find(a => a.id === selectedAnalyst)?.lastName}` : ""}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedAnalyst(request.assignedToId || "unassigned");
                setShowEditAssignedToDialog(false);
              }}
              data-testid="button-cancel-edit-assigned-to"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleAssignAnalyst();
                setShowEditAssignedToDialog(false);
              }}
              disabled={!selectedAnalyst || assignMutation.isPending}
              data-testid="button-save-edit-assigned-to"
            >
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
