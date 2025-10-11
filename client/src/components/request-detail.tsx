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

function CollapsibleSection({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div className="mb-4 border-2 border-purple-200 dark:border-purple-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm">
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors rounded-t-xl" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">{title}</h3>
        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">{isOpen ? '▼ Hide' : '▶ Show'}</span>
      </div>
      {isOpen && <div className="px-4 pb-4 pt-2">{children}</div>}
    </div>
  );
}

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
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [dueDate]);
  
  if (status === "completed" || status === "cancelled") {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} data-testid="time-remaining">
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

  // New three-role workflow mutations
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
      <DialogHeader className="border-b pb-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 -m-6 mb-0 p-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0 hover:bg-purple-100 dark:hover:bg-purple-800/30"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <DialogTitle className="text-2xl font-bold text-foreground" data-testid="text-request-title">
              {request.title}
            </DialogTitle>
            <div className="flex items-center gap-3 mt-2">
              <Badge className={`status-badge ${getStatusBadge(request.status)}`} data-testid="badge-status">
                {formatStatus(request.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground" data-testid="text-request-type">
                {formatRequestType(request.type)}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm font-mono text-muted-foreground" data-testid="text-request-id">
                ID: {request.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>
      </DialogHeader>

      <ScrollArea className="flex-1 px-6">
        <div className="py-4">
          {/* Basic Information - Always at Top */}
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                  {getPriorityIcon(request.priority)}
                  Priority
                </p>
                <p className="text-base font-bold text-gray-900 dark:text-white" data-testid="priority-display">
                  {formatPriority(request.priority)}
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold mb-1">Department</p>
                <p className="text-base font-bold text-gray-900 dark:text-white capitalize" data-testid="text-department">
                  {request.department}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase font-bold mb-1">Requested By</p>
                <p className="text-base font-bold text-gray-900 dark:text-white" data-testid="text-requested-by">
                  {request.requestedBy.firstName} {request.requestedBy.lastName}
                </p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold mb-1">Due Date</p>
                <p className="text-base font-bold text-gray-900 dark:text-white" data-testid="text-due-date">
                  {new Date(request.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <div className="mt-2">
                  <TimeRemaining dueDate={new Date(request.dueDate).toISOString()} status={request.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Request Details */}
            <div className="space-y-4">
              {/* Request Details */}
              <CollapsibleSection title="📝 Request Details & Business Impact" open={true}>
                <div className="space-y-3">
                  {/* Common fields for most request types */}
                  {(request.primaryQuestion || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change'].includes(request.type)) && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Primary Question</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-primary-question">
                          {request.primaryQuestion || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.businessProblem || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change'].includes(request.type)) && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Business Problem or Goal</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-business-problem">
                          {request.businessProblem || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.decisionAction || ['adhoc_analysis', 'new_dashboard', 'modify_dashboard'].includes(request.type)) && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Decision or Action</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-decision-action">
                          {request.decisionAction || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.impact || request.frequency || ['adhoc_analysis', 'new_dashboard', 'modify_dashboard'].includes(request.type)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(request.impact || ['adhoc_analysis', 'new_dashboard', 'modify_dashboard'].includes(request.type)) && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Impact</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground capitalize" data-testid="text-impact">
                              {request.impact || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(request.frequency || ['adhoc_analysis', 'new_dashboard', 'modify_dashboard'].includes(request.type)) && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Frequency</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground" data-testid="text-frequency">
                              {request.frequency || 'N/A'}
                              {request.frequencyDuration && request.frequencyUnit && 
                                ` (${request.frequencyDuration} ${request.frequencyUnit})`
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Bug fields */}
                  {(request.bugDescription || request.type === 'data_bug') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Bug Description</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-bug-description">
                          {request.bugDescription || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.bugLocation || request.type === 'data_bug') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Bug Location</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-bug-location">
                          {request.bugLocation || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* BigQuery Access fields */}
                  {(request.bqEmail || request.type === 'bq_access') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">BigQuery Email</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-bq-email">
                          {request.bqEmail || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.bqDatasets || request.type === 'bq_access') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Datasets Needed</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-bq-datasets">
                          {request.bqDatasets || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.bqPurpose || request.type === 'bq_access') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Purpose</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-bq-purpose">
                          {request.bqPurpose || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tracking fields */}
                  {(request.trackingEvent || request.type === 'tracking') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Tracking Event</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-tracking-event">
                          {request.trackingEvent || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.trackingPlatform || request.type === 'tracking') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Tracking Platform</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-tracking-platform">
                          {request.trackingPlatform || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.trackingDetails || request.type === 'tracking') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Tracking Details</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-tracking-details">
                          {request.trackingDetails || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metric Change fields */}
                  {(request.metricName || request.type === 'metric_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Metric Name</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-metric-name">
                          {request.metricName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.metricChangeType || request.type === 'metric_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Change Type</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-metric-change-type">
                          {request.metricChangeType || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.metricReason || request.type === 'metric_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Reason</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-metric-reason">
                          {request.metricReason || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pipeline Change fields */}
                  {(request.pipelineName || request.type === 'pipeline_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Pipeline Name</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-pipeline-name">
                          {request.pipelineName || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.pipelineChangeType || request.type === 'pipeline_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Change Type</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-pipeline-change-type">
                          {request.pipelineChangeType || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(request.pipelineDetails || request.type === 'pipeline_change') && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Pipeline Details</p>
                      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-foreground" data-testid="text-pipeline-details">
                          {request.pipelineDetails || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Dashboard fields - shown in Dashboard-Specific Details section */}
                  {(request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                    <>
                      {(request.dashboardAudience || request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Dashboard Audience</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground" data-testid="text-dashboard-audience">
                              {request.dashboardAudience || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(request.dashboardRefreshFrequency || request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Refresh Frequency</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground capitalize" data-testid="text-refresh-frequency">
                              {request.dashboardRefreshFrequency || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(request.keyMetrics || request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Key Metrics/KPIs</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground" data-testid="text-key-metrics">
                              {request.keyMetrics || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {(request.filters || request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Filters</p>
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-foreground" data-testid="text-filters">
                              {request.filters || 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleSection>

              {/* Dashboard Details */}
              {(request.type === "new_dashboard" || request.type === "modify_dashboard") && (
                <CollapsibleSection title="📊 Dashboard-Specific Details" open={false}>
                  <div className="space-y-3">
                    {request.dashboardAudience && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Audience/Users</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground" data-testid="text-dashboard-audience">
                            {request.dashboardAudience}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.dashboardRefreshFrequency && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Intended Refresh Frequency</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground capitalize" data-testid="text-refresh-frequency">
                            {request.dashboardRefreshFrequency}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.keyMetrics && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Key Metrics/KPIs Needed</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground" data-testid="text-key-metrics">
                            {request.keyMetrics}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.filters && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Filters</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground" data-testid="text-filters">
                            {request.filters}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.mockups && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Mock-ups, Examples, or Links</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground" data-testid="text-mockups">
                            {request.mockups}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.actionPlan && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Action Plan</p>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-foreground" data-testid="text-action-plan">
                            {request.actionPlan}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Attachments */}
              <CollapsibleSection title="📎 Attachments" open={false}>
                <div className="flex items-center justify-end mb-3">
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
                      <div key={attachment.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                    <p className="text-sm text-muted-foreground text-center">No attachments yet</p>
                  </div>
                )}
              </CollapsibleSection>
            </div>

            {/* Right Column - Actions & Discussion */}
            <div className="space-y-4">
          {/* Data Lead: Edit Priority & Deadline */}
          {isTeamLead && (
            <CollapsibleSection title="⚙️ Edit Priority & Deadline" open={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
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
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Due Date</label>
                    <Input 
                      type="date" 
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                      data-testid="input-edit-due-date"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditedPriority(request.priority);
                      setEditedDueDate(new Date(request.dueDate).toISOString().split('T')[0]);
                    }}
                    data-testid="button-cancel-edit-priority-deadline"
                  >
                    Reset
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
                </div>
              </div>
            </CollapsibleSection>
          )}

        {/* Data Lead: Accept/Reject Request */}
        {isTeamLead && request.status === "pending_review" && (
          <CollapsibleSection title="✅ Accept / Reject Request" open={true}>
            {justAccepted ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400" data-testid="text-request-accepted">Request Accepted</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The request has been accepted successfully.
                  </p>
                </div>
              </div>
            ) : justRejected ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-700">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400" data-testid="text-request-rejected">Request Rejected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The request has been rejected.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={() => acceptRequestMutation.mutate()}
                  disabled={acceptRequestMutation.isPending}
                  data-testid="button-accept-request"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-12"
                >
                  {acceptRequestMutation.isPending ? "Accepting..." : "✓ Accept Request"}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={rejectRequestMutation.isPending}
                  variant="destructive"
                  data-testid="button-reject-request"
                  className="flex-1 h-12"
                >
                  ✕ Reject Request
                </Button>
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Request Accepted Status */}
        {request.status === "accepted" && (
          <CollapsibleSection title="Status Update" open={true}>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400" data-testid="text-request-accepted">Request Accepted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This request has been accepted and is ready for assignment.
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Assignment */}
        {(request.assignedTo || isTeamLead || isAnalyst) && (
          <CollapsibleSection title="👥 Assignment & Management" open={false}>
            {/* Assigned Analyst Display */}
            {request.assignedTo && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Assigned To</p>
                <div className="border-2 border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-green-300 dark:border-green-600">
                      <AvatarImage src={request.assignedTo.profileImageUrl ?? ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {getInitials(request.assignedTo.firstName ?? undefined, request.assignedTo.lastName ?? undefined)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground" data-testid="text-assigned-analyst">
                        {request.assignedTo.firstName} {request.assignedTo.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{request.assignedTo.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Section for Data Lead */}
            {isTeamLead && (
              <div className="border-2 border-blue-200 dark:border-blue-700 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/20">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
              </div>
            )}

            {/* Mark as Complete Button - For Team Lead or Analyst when in_progress */}
            {(isTeamLead || isAnalyst) && request.status === "in_progress" && (
              <div className="border-2 border-green-200 dark:border-green-700 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/20">
                {justCompleted ? (
                  <div className="flex items-center gap-3 p-2">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400" data-testid="text-request-completed">Request Completed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The request has been marked as completed successfully.
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => completeRequestMutation.mutate()}
                    disabled={completeRequestMutation.isPending}
                    data-testid="button-mark-complete"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12"
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
              </div>
            )}

            {/* Data Analyst Response Section */}
            {isAnalyst && (
              <div className="border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4 bg-accent dark:bg-purple-900/20">
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
                      className="gradient-button-primary text-white font-semibold"
                      style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                    >
                      {updateStatusMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Request Delivery - For Team Lead or Analyst when in_progress or completed */}
        {(isTeamLead || isAnalyst) && (request.status === "in_progress" || request.status === "completed") && (
          <CollapsibleSection title="📦 Request Delivery" open={true}>
            <div className="space-y-4">
              {/* Delivery Links */}
              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Links</label>
                <div className="space-y-2">
                  {deliveryLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={link}
                        readOnly
                        className="flex-1"
                        data-testid={`delivery-link-${index}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDeliveryLink(index)}
                        data-testid={`button-remove-link-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDeliveryLink}
                      onChange={(e) => setNewDeliveryLink(e.target.value)}
                      placeholder="Enter dashboard/report link..."
                      data-testid="input-new-delivery-link"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDeliveryLink();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddDeliveryLink}
                      disabled={!newDeliveryLink.trim()}
                      data-testid="button-add-delivery-link"
                      className="gradient-button-primary text-white font-semibold whitespace-nowrap"
                      style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                    >
                      Add Link
                    </Button>
                  </div>
                </div>
              </div>

              {/* Delivery Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Notes</label>
                <Textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Add any notes about the delivery (optional)..."
                  className="min-h-[100px]"
                  data-testid="textarea-delivery-notes"
                />
              </div>

              {/* Delivery Files Upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Delivery Files</label>
                <ObjectUploader
                  maxFileSize={10485760}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleDeliveryUploadComplete}
                  buttonVariant="outline"
                  buttonSize="sm"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Upload Delivery File
                </ObjectUploader>
              </div>

              {/* Display Existing Delivery Attachments */}
              {request.attachments && request.attachments.filter(a => a.isDelivery).length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Uploaded Delivery Files</label>
                  <div className="space-y-2">
                    {request.attachments
                      .filter(attachment => attachment.isDelivery)
                      .map((attachment) => (
                        <div key={attachment.id} className="border-2 border-green-200 dark:border-green-700 rounded-lg p-3 bg-green-50 dark:bg-green-900/20 hover:shadow-md transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate" data-testid={`delivery-attachment-name-${attachment.id}`}>
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
                              data-testid={`button-download-delivery-${attachment.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Save Delivery Info Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveDelivery}
                  disabled={saveDeliveryMutation.isPending}
                  data-testid="button-save-delivery"
                  className="gradient-button-primary text-white font-semibold"
                  style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
                >
                  {saveDeliveryMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Delivery Info
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Comments & Chat */}
        <CollapsibleSection title={`💬 Comments & Discussion (${request.comments.length})`} open={true}>
          {/* Add Comment Form - At Top */}
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
        </CollapsibleSection>
          </div>
        </div>
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
