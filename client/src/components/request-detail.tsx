import { useState, useEffect } from "react";
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
  XCircle
} from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

function TimeRemaining({ dueDate, status }: { dueDate: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);
  
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const due = new Date(dueDate).getTime();
      const diff = due - now;
      
      if (diff < 0) {
        setIsOverdue(true);
        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`Overdue by ${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`Overdue by ${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`Overdue by ${minutes}m`);
        }
      } else {
        setIsOverdue(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h left`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m left`);
        } else {
          setTimeLeft(`${minutes}m left`);
        }
      }
    };
    
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    
    return () => clearInterval(interval);
  }, [dueDate]);
  
  if (status === "completed" || status === "cancelled") {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} data-testid="time-remaining">
      <Clock className="w-4 h-4" />
      <span className="font-semibold">{timeLeft}</span>
    </div>
  );
}

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
  const [justAccepted, setJustAccepted] = useState(false);
  const [justRejected, setJustRejected] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [deliveryLinks, setDeliveryLinks] = useState<string[]>(request.deliveryLinks || []);
  const [deliveryNotes, setDeliveryNotes] = useState(request.deliveryNotes || "");
  const [newDeliveryLink, setNewDeliveryLink] = useState("");
  const [deliveryType, setDeliveryType] = useState<"attachment" | "link">("link");

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

  const handleDeliveryUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
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
      uploadDeliveryAttachmentMutation.mutate({
        uploadToken,
        fileName: file.name || "untitled",
        fileSize: file.size || 0,
        mimeType: file.type || "application/octet-stream",
        isDelivery: true,
      });
    }
  };

  const handleAddDeliveryLink = () => {
    if (newDeliveryLink.trim()) {
      setDeliveryLinks([...deliveryLinks, newDeliveryLink.trim()]);
      setNewDeliveryLink("");
    }
  };

  const handleRemoveDeliveryLink = (index: number) => {
    setDeliveryLinks(deliveryLinks.filter((_, i) => i !== index));
  };

  const handleSaveDelivery = () => {
    saveDeliveryMutation.mutate({
      deliveryLinks,
      deliveryNotes,
    });
  };

  const acceptRequestMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/accept`, {});
    },
    onSuccess: () => {
      setJustAccepted(true);
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
      setJustRejected(true);
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
      setJustCompleted(true);
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

  const saveDeliveryMutation = useMutation({
    mutationFn: async (data: { deliveryLinks: string[]; deliveryNotes: string }) => {
      return await apiRequest("PATCH", `/api/requests/${request.id}/delivery`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Delivery information saved successfully",
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
        description: error.message || "Failed to save delivery information",
        variant: "destructive",
      });
    },
  });

  const uploadDeliveryAttachmentMutation = useMutation({
    mutationFn: async (data: { uploadToken: string; fileName: string; fileSize: number; mimeType: string; isDelivery: boolean }) => {
      return await apiRequest("POST", `/api/requests/${request.id}/attachments`, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/requests", request.id] });
      toast({
        title: "Success",
        description: "Delivery file uploaded successfully",
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
        description: error.message || "Failed to upload delivery file",
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
      case "new_dashboard":
        return "New Dashboard";
      case "modify_dashboard":
        return "Modify Dashboard";
      case "adhoc_analysis":
        return "Ad-hoc Analysis";
      case "data_bug":
        return "Data Bug";
      case "bq_access":
        return "BigQuery Access";
      case "tracking":
        return "Tracking";
      case "metric_change":
        return "Metric Change";
      case "pipeline_change":
        return "Pipeline Change";
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

  const isDeliveryOnTime = () => {
    if (request.status !== "completed" || !request.updatedAt) return null;
    const completedDate = new Date(request.updatedAt);
    const dueDate = new Date(request.dueDate);
    return completedDate <= dueDate;
  };

  return (
    <>
      {/* Header Card */}
      <div className="-m-6 mb-6">
        <Card className="p-4 shadow-md border border-gray-200 dark:border-gray-700 rounded-none border-x-0 border-t-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="sr-only">Request Details</DialogTitle>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white" data-testid="text-request-title">
                {formatRequestType(request.type)} - {request.requestedBy.firstName} {request.requestedBy.lastName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
                Request Type: {formatRequestType(request.type)} | ID: {request.id.slice(0, 8)}
              </p>
            </div>
            
            {/* Accept/Reject Buttons */}
            {isTeamLead && !justAccepted && !justRejected && (
              <div className="flex gap-2">
                <Button
                  onClick={() => acceptRequestMutation.mutate()}
                  disabled={acceptRequestMutation.isPending}
                  variant="outline"
                  data-testid="button-accept-request"
                >
                  {acceptRequestMutation.isPending ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectRequestMutation.isPending}
                  variant="destructive"
                  data-testid="button-reject-request"
                >
                  Reject
                </Button>
              </div>
            )}
            
            {/* Success Messages */}
            {justAccepted && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-700 dark:text-green-400" data-testid="text-request-accepted">Request Accepted</span>
              </div>
            )}
            {justRejected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-700 dark:text-red-400" data-testid="text-request-rejected">Request Rejected</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Info Grid - Read-only display */}
        <div className="grid grid-cols-4 gap-4">
          <Input 
            placeholder="Priority" 
            value={formatPriority(request.priority)}
            readOnly
            className="bg-gray-50 dark:bg-gray-900"
            data-testid="priority-display"
          />
          <Input 
            type="text" 
            placeholder="Due Date"
            value={new Date(request.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            readOnly
            className="bg-gray-50 dark:bg-gray-900"
            data-testid="text-due-date"
          />
          <Input 
            placeholder="Department/Team" 
            value={request.department}
            readOnly
            className="bg-gray-50 dark:bg-gray-900 capitalize"
            data-testid="text-department"
          />
          <Input 
            placeholder="Requested By" 
            value={`${request.requestedBy.firstName} ${request.requestedBy.lastName}`}
            readOnly
            className="bg-gray-50 dark:bg-gray-900"
            data-testid="text-requested-by"
          />
        </div>

        {/* Action Row - Team Lead only */}
        {isTeamLead && (
          <div className="grid grid-cols-4 gap-4">
            <Input 
              placeholder="New Priority" 
              value={editedPriority ? formatPriority(editedPriority) : ''}
              readOnly
              className="bg-gray-50 dark:bg-gray-900"
            />
            <Input 
              type="date" 
              placeholder="New Due Date"
              value={editedDueDate}
              onChange={(e) => setEditedDueDate(e.target.value)}
              data-testid="input-edit-due-date"
            />
            <div className="col-span-2">
              <Input 
                placeholder="Assigned To" 
                value={selectedAnalyst && selectedAnalyst !== 'unassigned' ? 
                  analysts.find(a => a.id === selectedAnalyst)?.firstName + ' ' + analysts.find(a => a.id === selectedAnalyst)?.lastName : 
                  request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned'}
                readOnly
                className="w-full bg-gray-50 dark:bg-gray-900"
                data-testid="text-assigned-to"
              />
            </div>
          </div>
        )}

        {/* Two-Column Main Content Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Card - Request Details */}
          <Card className="p-4 shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Request Details</h3>
            <Textarea 
              rows={6}
              placeholder="Enter request details here..."
              value={(() => {
                let details = `Title: ${request.title}\n\n`;
                if (request.primaryQuestion) details += `Primary Question: ${request.primaryQuestion}\n\n`;
                if (request.businessProblem) details += `Business Problem: ${request.businessProblem}\n\n`;
                if (request.decisionAction) details += `Decision/Action: ${request.decisionAction}\n\n`;
                if (request.bugDescription) details += `Bug Description: ${request.bugDescription}\n\n`;
                if (request.bugLocation) details += `Bug Location: ${request.bugLocation}\n\n`;
                if (request.bqEmail) details += `BigQuery Email: ${request.bqEmail}\n\n`;
                if (request.bqDatasets) details += `Datasets: ${request.bqDatasets}\n\n`;
                if (request.bqPurpose) details += `Purpose: ${request.bqPurpose}\n\n`;
                if (request.trackingEvent) details += `Event: ${request.trackingEvent}\n\n`;
                if (request.trackingPlatform) details += `Platform: ${request.trackingPlatform}\n\n`;
                if (request.trackingDetails) details += `Tracking Details: ${request.trackingDetails}\n\n`;
                if (request.metricName) details += `Metric: ${request.metricName}\n\n`;
                if (request.metricChangeType) details += `Change Type: ${request.metricChangeType}\n\n`;
                if (request.metricReason) details += `Reason: ${request.metricReason}\n\n`;
                if (request.pipelineName) details += `Pipeline: ${request.pipelineName}\n\n`;
                if (request.pipelineChangeType) details += `Change Type: ${request.pipelineChangeType}\n\n`;
                if (request.pipelineDetails) details += `Details: ${request.pipelineDetails}\n\n`;
                return details.trim();
              })()}
              readOnly
              className="bg-gray-50 dark:bg-gray-900"
              data-testid="textarea-request-details"
            />
          </Card>

          {/* Right Card - Delivery */}
          <Card className="p-4 space-y-4 shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Delivery</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={deliveryType} onValueChange={(value) => setDeliveryType(value as "link" | "attachment")} data-testid="select-delivery-type">
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attachment">Attachment</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deliveryType === "attachment" && (
              <div>
                <label className="block text-sm font-medium mb-1">Attachment</label>
                <Input type="file" data-testid="input-file-attachment" />
              </div>
            )}

            {deliveryType === "link" && (
              <div>
                <label className="block text-sm font-medium mb-1">Link URL</label>
                <Input type="url" placeholder="https://..." data-testid="input-delivery-link" />
              </div>
            )}

            {request.status === "completed" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Delivered On</label>
                  <Input
                    type="date"
                    value={request.updatedAt ? new Date(request.updatedAt).toISOString().split('T')[0] : ""}
                    readOnly
                    data-testid="input-delivered-date"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to auto-calculate On Time vs Late using the (new) due date.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">On Time</label>
                  <div className={`rounded-md border px-3 py-2 text-sm ${
                    isDeliveryOnTime() === true 
                      ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400" 
                      : isDeliveryOnTime() === false
                      ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                      : "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400"
                  }`}>
                    {isDeliveryOnTime() === null ? "---" : isDeliveryOnTime() ? "On time" : "Late"}
                  </div>
                </div>
              </>
            )}

            {request.status === "in_progress" && (isTeamLead || isAnalyst) && !justCompleted && (
              <div className="pt-2">
                <Button 
                  onClick={() => completeRequestMutation.mutate()}
                  disabled={completeRequestMutation.isPending}
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  data-testid="button-mark-completed"
                >
                  {completeRequestMutation.isPending ? "Marking..." : "Mark as Completed"}
                </Button>
              </div>
            )}

            {justCompleted && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-700 dark:text-green-400" data-testid="text-marked-completed">Marked as Completed</span>
              </div>
            )}
          </Card>
        </div>

        {/* Bottom Full-Width - Messages/Comments Section */}
        <Card className="border-2 border-purple-200 dark:border-purple-700">
          <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4">Messages/Comments ({request.comments.length})</h3>
          
          {/* Add Comment Form */}
          <div className="mb-4">
            <form onSubmit={onCommentSubmit} className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment or ask a question..."
                className="w-full min-h-[90px] border-2 border-purple-200 dark:border-purple-700 focus:border-purple-400 dark:focus:border-purple-500 resize-none"
                data-testid="input-new-comment"
              />
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-add-comment"
                  className="gradient-button-primary text-white font-semibold px-8"
                  style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
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
          </div>

          {/* Comments Thread */}
          <div className="border-t-2 border-purple-200 dark:border-purple-700 pt-4">
              {request.comments.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50/30 dark:bg-purple-900/10">
                  <MessageSquare className="w-14 h-14 mx-auto text-purple-400 dark:text-purple-600 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to comment on this request</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {request.comments.map((comment) => (
                    <div key={comment.id} className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 border-2 border-purple-300 dark:border-purple-600 flex-shrink-0">
                          <AvatarImage src={comment.user.profileImageUrl ?? ""} />
                          <AvatarFallback className="text-white font-semibold text-sm" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                            {getInitials(comment.user.firstName ?? undefined, comment.user.lastName ?? undefined)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-2">
                            <div>
                              <span className="text-sm font-semibold text-foreground" data-testid={`comment-author-${comment.id}`}>
                                {comment.user.firstName} {comment.user.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2 capitalize">
                                ({comment.user.role?.replace("_", " ")})
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground flex-shrink-0" data-testid={`comment-date-${comment.id}`}>
                              {comment.createdAt ? formatDate(comment.createdAt.toString()) : ''}
                            </p>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed break-words" data-testid={`comment-content-${comment.id}`}>
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
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
