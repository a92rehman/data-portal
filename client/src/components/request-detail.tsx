import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  X, 
  Save, 
  Send, 
  CheckCircle, 
  Eye, 
  Settings, 
  Clock,
  CircleAlert,
  Target,
  Info,
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
  Users,
  PlayCircle
} from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { calculateUrgency } from "@/lib/urgency";
import { formatRequestType } from "@/lib/formatters";

interface RequestDetailProps {
  request: DataRequestWithDetails;
  onClose: () => void;
  onUpdate: (updatedRequest?: DataRequestWithDetails) => void;
}

export default function RequestDetail({ request, onClose, onUpdate }: RequestDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
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
  const [newTaskStatus, setNewTaskStatus] = useState("to_do");
  const [timeEstimation, setTimeEstimation] = useState({
    baseHours: null as number | null,
    complexity: 'medium' as 'simple' | 'medium' | 'complex',
    confidence: 'medium' as 'high' | 'medium' | 'low'
  });
  
  const { sendTyping, typingUsers } = useWebSocket((user as User)?.id);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // PERT calculation function
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
      optimistic: base,
      mostLikely: base + (range * 0.5),                   // Add half the range
      pessimistic: base + (range * confidenceMultiplier)  // Add full adjusted range
    };
  };
  
  const pertValues = calculatePertValues();
  const expectedTime = (pertValues.optimistic + 4 * pertValues.mostLikely + pertValues.pessimistic) / 6;
  const HOURS_PER_DAY = 6;
  const hoursToDays = (hours: number): number => {
    return Math.ceil(hours / HOURS_PER_DAY);
  };
  const expectedDays = hoursToDays(expectedTime);
  const displayExpectedTime = expectedTime >= 6
    ? `${Math.round(expectedTime / 6 * 2) / 2} day${Math.round(expectedTime / 6 * 2) / 2 > 1 ? 's' : ''}`
    : `${expectedTime.toFixed(1)}h`;
  
  // Handler to navigate to tasks page with specific task
  const handleTaskClick = (taskId: string) => {
    onClose(); // Close the request detail dialog
    setLocation(`/tasks?taskId=${taskId}`); // Navigate to tasks page with task ID
  };

  // Auto-fill task title and due date when dialog opens
  useEffect(() => {
    if (showCreateTaskDialog) {
      const autoTitle = `${formatRequestType(request.type)} - ${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
      setNewTaskTitle(autoTitle);
      setNewTaskDueDate(new Date(request.dueDate).toISOString().split('T')[0]);
    }
  }, [showCreateTaskDialog, request]);

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
      setNewTaskDueDate("");
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
    onSuccess: (updatedRequest) => {
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
      onUpdate(updatedRequest as DataRequestWithDetails);
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
    // Validate that at least one task exists
    if (!requestTasks || requestTasks.length === 0) {
      toast({
        title: "Cannot Deliver",
        description: "Please create at least one task before delivering this request.",
        variant: "destructive",
      });
      return;
    }

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
              {/* Accept/Reject Buttons - Data Lead can manage request status */}
              {isTeamLead && request.status !== "completed" && request.status !== "cancelled" && (
                <>
                  {/* Show Accept button for pending_review OR rejected status */}
                  {(request.status === "pending_review" || request.status === "rejected") && (
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
                  {/* Show Reject button for any non-rejected, non-completed, non-cancelled request */}
                  {request.status !== "rejected" && (
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
            <div className="flex items-center justify-center gap-4 relative px-6 ml-[80px] mr-[80px]">
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

              {/* Status Badges on the Right - Absolutely positioned */}
              <div className="absolute right-0 flex gap-2 items-center">
                {/* Task Created Badge */}
                {requestTasks && requestTasks.length > 0 && (
                  <Badge className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-semibold" data-testid="badge-task-created">
                    <ListChecks className="w-4 h-4 mr-1.5" />
                    Task Created
                  </Badge>
                )}
                
                {/* Show "Request Completed" badge for completed requests */}
                {request.status === "completed" && !request.rejectionReason && (
                  <Badge className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 font-semibold" data-testid="badge-request-completed">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Request Completed
                  </Badge>
                )}

                {/* Show "Request Accepted & In Progress" badge for in_progress status with work started info */}
                {request.status === "in_progress" && request.workStartedAt && !request.rejectionReason && (
                  <Badge className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold" data-testid="badge-request-in-progress">
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Request Accepted & In Progress
                  </Badge>
                )}
                
                {/* Show "Request Accepted" badge for other accepted statuses (accepted, assigned, blocked) */}
                {(request.status === "accepted" || request.status === "assigned" || request.status === "blocked") && !request.rejectionReason && (
                  <Badge className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-semibold" data-testid="badge-request-accepted">
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
        {/* Rejection Reason Alert - Shown prominently when request is rejected */}
        {request.rejectionReason && (
          <div className="mx-6 mt-4 mb-4">
            <div className="bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 dark:border-rose-600 p-4 rounded-r-lg shadow-sm" data-testid="rejection-reason-alert">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300 mb-1">
                    Request Rejected
                  </h3>
                  <p className="text-sm text-rose-700 dark:text-rose-400 leading-relaxed" data-testid="text-rejection-reason">
                    {request.rejectionReason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards Grid - Moved to top for better visibility */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 px-6 py-4 mt-4 border-b bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-blue-950/20">
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

        {/* Status History Timeline - Horizontal */}
        {(request.reviewedAt || request.workStartedAt || request.deliveredAt) && (
          <div className="mx-6 mt-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="relative pt-6 pb-2">
                  {/* Horizontal line */}
                  <div className="absolute top-6 left-8 right-8 h-0.5 bg-gradient-to-r from-blue-200 via-emerald-200 via-purple-200 to-green-200 dark:from-blue-800 dark:via-emerald-800 dark:via-purple-800 dark:to-green-800" />
                  
                  <div className="flex justify-between items-start px-4">
                    {/* Submitted */}
                    <div className="relative flex-1 text-center" data-testid="timeline-submitted">
                      <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-4 h-4 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-900" />
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Submitted</p>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {request.createdAt ? new Date(request.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : 'N/A'}
                        </Badge>
                      </div>
                    </div>

                    {/* Accepted */}
                    <div className={`relative flex-1 text-center ${!request.reviewedAt && 'opacity-40'}`} data-testid="timeline-accepted">
                      <div className={`absolute left-1/2 -translate-x-1/2 -top-3 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${request.reviewedAt ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <div className="mt-3">
                        <p className={`text-xs font-semibold mb-1 ${request.reviewedAt ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>Accepted</p>
                        {request.reviewedAt && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {new Date(request.reviewedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Work Started */}
                    <div className={`relative flex-1 text-center ${!request.workStartedAt && 'opacity-40'}`} data-testid="timeline-work-started">
                      <div className={`absolute left-1/2 -translate-x-1/2 -top-3 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${request.workStartedAt ? 'bg-purple-500 dark:bg-purple-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <div className="mt-3">
                        <p className={`text-xs font-semibold mb-1 ${request.workStartedAt ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground'}`}>Work Started</p>
                        {request.workStartedAt && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {new Date(request.workStartedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Delivered/Completed */}
                    <div className={`relative flex-1 text-center ${!request.deliveredAt && 'opacity-40'}`} data-testid="timeline-completed">
                      <div className={`absolute left-1/2 -translate-x-1/2 -top-3 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${request.deliveredAt ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <div className="mt-3">
                        <p className={`text-xs font-semibold mb-1 ${request.deliveredAt ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>Completed</p>
                        {request.deliveredAt && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {new Date(request.deliveredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 px-6 py-4">
          {/* Left Column - Request Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Common fields for most request types */}
                {(request.primaryQuestion || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change', 'user_investigation', 'training', 'experimentation'].includes(request.type)) && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Primary Question</p>
                    <p className="text-sm" data-testid="text-primary-question">
                      {request.primaryQuestion || 'N/A'}
                    </p>
                  </div>
                )}

                {(request.businessProblem || !['data_bug', 'bq_access', 'tracking', 'metric_change', 'pipeline_change', 'user_investigation', 'training', 'experimentation'].includes(request.type)) && (
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

                {/* User Investigation fields */}
                {(request as any).investigationPurpose && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Investigation Purpose</p>
                    <p className="text-sm" data-testid="text-investigation-purpose">
                      {(request as any).investigationPurpose}
                    </p>
                  </div>
                )}

                {(request as any).userName && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">User/Teacher Name</p>
                    <p className="text-sm" data-testid="text-user-name">
                      {(request as any).userName}
                    </p>
                  </div>
                )}

                {(request as any).userMobile && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Mobile Number</p>
                    <p className="text-sm" data-testid="text-user-mobile">
                      {(request as any).userMobile}
                    </p>
                  </div>
                )}

                {(request as any).userProfileId && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">User Profile ID</p>
                    <p className="text-sm" data-testid="text-user-profile-id">
                      {(request as any).userProfileId}
                    </p>
                  </div>
                )}

                {(request as any).userId && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">User ID</p>
                    <p className="text-sm" data-testid="text-user-id">
                      {(request as any).userId}
                    </p>
                  </div>
                )}

                {(request as any).schoolEmisCode && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">School EMIS Code</p>
                    <p className="text-sm" data-testid="text-school-emis-code">
                      {(request as any).schoolEmisCode}
                    </p>
                  </div>
                )}

                {/* Training fields */}
                {(request as any).trainingTopic && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Training Topic</p>
                    <p className="text-sm" data-testid="text-training-topic">
                      {(request as any).trainingTopic}
                    </p>
                  </div>
                )}

                {(request as any).trainingHours && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Training Hours</p>
                    <p className="text-sm" data-testid="text-training-hours">
                      {(request as any).trainingHours} hours
                    </p>
                  </div>
                )}

                {/* Experimentation fields */}
                {(request as any).experimentSubType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Experiment Type</p>
                    <p className="text-sm" data-testid="text-experiment-sub-type">
                      {(request as any).experimentSubType === 'design_new' && 'Support in Designing a New Experiment'}
                      {(request as any).experimentSubType === 'review' && 'Review an Existing Experiment'}
                      {(request as any).experimentSubType === 'analysis' && 'Analyze Experiment Results'}
                      {(request as any).experimentSubType === 'implementation' && 'Help with Experiment Implementation'}
                      {(request as any).experimentSubType === 'other' && 'Other Experimentation Support'}
                    </p>
                  </div>
                )}

                {(request as any).experimentProblem && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Problem Statement</p>
                    <p className="text-sm" data-testid="text-experiment-problem">
                      {(request as any).experimentProblem}
                    </p>
                  </div>
                )}

                {(request as any).experimentFileLink && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Experiment File Link</p>
                    <p className="text-sm" data-testid="text-experiment-file-link">
                      <a href={(request as any).experimentFileLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {(request as any).experimentFileLink}
                      </a>
                    </p>
                  </div>
                )}

                {(request as any).experimentAnalysisType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Analysis Type</p>
                    <p className="text-sm" data-testid="text-experiment-analysis-type">
                      {(request as any).experimentAnalysisType}
                    </p>
                  </div>
                )}

                {(request as any).experimentDatasetLink && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Dataset Link</p>
                    <p className="text-sm" data-testid="text-experiment-dataset-link">
                      <a href={(request as any).experimentDatasetLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {(request as any).experimentDatasetLink}
                      </a>
                    </p>
                  </div>
                )}

                {(request as any).experimentImplementationType && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Implementation Type</p>
                    <p className="text-sm" data-testid="text-experiment-implementation-type">
                      {(request as any).experimentImplementationType}
                    </p>
                  </div>
                )}

                {(request as any).experimentOtherDetails && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1.5">Other Details</p>
                    <p className="text-sm" data-testid="text-experiment-other-details">
                      {(request as any).experimentOtherDetails}
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
                {/* Delivery Status Panel - For Analyst or Team Lead when assigned */}
                {(isAnalyst || (isTeamLead && isAssignedToMe)) && !request.deliveredAt && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Mark as Delivered</p>
                    
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
                          <SelectItem value="text">Text</SelectItem>
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

                    {deliveryType === "text" && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                          Delivery Content
                        </label>
                        <Textarea
                          value={deliveryContent}
                          onChange={(e) => setDeliveryContent(e.target.value)}
                          placeholder="Enter delivery content or notes..."
                          rows={4}
                          data-testid="textarea-delivery-content"
                        />
                      </div>
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
                          Mark as Delivered
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Delivered Content Display - For everyone when delivered */}
                {request.deliveredAt && (
                  <div className="space-y-3 border-t pt-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Delivered Content</p>
                    
                    {/* Delivery Type Badge */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivery Type
                      </label>
                      <Badge variant="outline" data-testid="badge-delivery-type">
                        {request.deliveryType === "attachment" ? "📎 Attachment" : 
                         request.deliveryType === "link" ? "🔗 Link" : 
                         "📝 Text"}
                      </Badge>
                    </div>

                    {/* Delivery Content Based on Type */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Content
                      </label>
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

                    {/* Delivered On */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivered On
                      </label>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-400" data-testid="text-delivered-date">
                          {new Date(request.deliveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Status */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                        Delivery Status
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
                  </div>
                )}

                {/* Pending Delivery View - For Requester or Team Lead when NOT assigned and NOT delivered */}
                {(isRequester || (isTeamLead && !isAssignedToMe)) && !request.deliveredAt && (
                  <div className="space-y-3 border-t pt-4">
                    {/* No Delivery Message */}
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        No delivery yet
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground uppercase font-semibold">Delivery Status</p>

                    {/* 1. Delivery Type - Pending */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Delivery Type
                        </label>
                      </div>
                      <Badge variant="outline" className="ml-6 bg-gray-50 dark:bg-gray-900 text-muted-foreground">
                        Pending
                      </Badge>
                    </div>

                    {/* 2. Content - Pending */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Content
                        </label>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        Awaiting delivery from analyst
                      </p>
                    </div>

                    {/* 3. Delivered On - Pending */}
                    <div className="pb-3 border-b">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Delivered On
                        </label>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">
                        Not delivered yet
                      </p>
                    </div>

                    {/* 4. Timeline Status */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Timeline Status
                        </label>
                      </div>
                      <div className={`ml-6 flex items-center gap-2 p-2 rounded-lg ${isOnTime() ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
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
              {/* Comments List - Compact Table Layout */}
              <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                {request.comments.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {request.comments.map((comment, index) => {
                      // Determine background color based on commenter
                      const prevComment = index > 0 ? request.comments[index - 1] : null;
                      const isDifferentCommenter = !prevComment || prevComment.userId !== comment.userId;
                      
                      // Color rotation for different users
                      const userColors = [
                        'bg-blue-50/50 dark:bg-blue-950/20',
                        'bg-purple-50/50 dark:bg-purple-950/20',
                        'bg-green-50/50 dark:bg-green-950/20',
                        'bg-amber-50/50 dark:bg-amber-950/20',
                      ];
                      
                      const colorIndex = request.comments
                        .slice(0, index)
                        .filter((c, i) => {
                          const prev = i > 0 ? request.comments[i - 1] : null;
                          return !prev || prev.userId !== c.userId;
                        })
                        .filter(c => c.userId !== comment.userId).length % userColors.length;
                      
                      const bgColor = userColors[colorIndex];
                      
                      return (
                        <div 
                          key={comment.id} 
                          className={`p-1.5 ${bgColor} hover:brightness-95 dark:hover:brightness-110 transition-all`}
                        >
                          <div className="flex items-start gap-1.5">
                            <Avatar className="w-6 h-6 flex-shrink-0">
                              <AvatarImage src={comment.user.profileImageUrl ?? ""} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {getInitials(comment.user.firstName ?? undefined, comment.user.lastName ?? undefined)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-1.5">
                                <span className="text-xs font-semibold" data-testid={`comment-author-${comment.id}`}>
                                  {comment.user.firstName} {comment.user.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground" data-testid={`comment-date-${comment.id}`}>
                                  {comment.createdAt ? formatDate(comment.createdAt.toString()) : ''}
                                </span>
                              </div>
                              <p className="text-sm break-words leading-snug" data-testid={`comment-content-${comment.id}`}>
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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

              {/* Add Comment Form - Compact with inline send button */}
              <form onSubmit={onCommentSubmit} className="pt-2">
                <div className="relative">
                  <Textarea
                    value={newComment}
                    onChange={handleCommentChange}
                    placeholder="Write a comment..."
                    className="min-h-[60px] pr-12 resize-none"
                    data-testid="input-new-comment"
                  />
                  <Button 
                    type="submit" 
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                  >
                    {addCommentMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* 6. Tasks Section - Full Width with Collapsible Groups */}
        <div className="px-6 py-4 border-t">
          <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTodo className="w-5 h-5" />
                    Linked Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'in_progress').length} In Progress
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'to_do').length} Pending
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'completed').length} Completed
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {requestTasks.filter((t: any) => !t.parentTaskId).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No tasks created yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create tasks to organize the work for this request</p>
                  </div>
                ) : (
                  <Accordion type="multiple" defaultValue={["in_progress", "to_do"]} className="w-full">
                    {/* In Progress Tasks */}
                    {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'in_progress').length > 0 && (
                      <AccordionItem value="in_progress" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-blue-50 dark:hover:bg-blue-950/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-sm font-semibold">In Progress</span>
                            <Badge variant="secondary" className="text-xs">
                              {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'in_progress').length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <div className="max-h-[300px] overflow-y-auto">
                            {requestTasks
                              .filter((t: any) => !t.parentTaskId && t.status === 'in_progress')
                              .map((task: any) => {
                                const subTasks = requestTasks.filter((t: any) => t.parentTaskId === task.id);
                                return (
                                  <div key={task.id} className="border-t p-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                          <ListTodo className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 
                                          onClick={() => handleTaskClick(task.id)}
                                          className="font-medium text-sm truncate cursor-pointer text-blue-700 dark:text-blue-400 hover:underline" 
                                          data-testid={`task-link-${task.id}`}
                                        >
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                          {task.assignedTo && (
                                            <span className="flex items-center gap-1">
                                              <User2 className="w-3 h-3" />
                                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                                            </span>
                                          )}
                                          {subTasks.length > 0 && (
                                            <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30">
                                              {subTasks.filter((st: any) => st.status === 'completed').length}/{subTasks.length} subtasks
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleTaskClick(task.id)}
                                        data-testid={`button-view-task-${task.id}`}
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                      </Button>
                                    </div>
                                    {subTasks.length > 0 && (
                                      <div className="mt-2 ml-9 space-y-1 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                                        {subTasks.map((subTask: any) => (
                                          <div key={subTask.id} className="flex items-center gap-1.5 text-xs">
                                            <div className={`w-1.5 h-1.5 rounded-full ${subTask.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="truncate">{subTask.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Pending Tasks */}
                    {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'to_do').length > 0 && (
                      <AccordionItem value="to_do" className="border rounded-lg mb-2">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-amber-50 dark:hover:bg-amber-950/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            <span className="text-sm font-semibold">Pending</span>
                            <Badge variant="secondary" className="text-xs">
                              {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'to_do').length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <div className="max-h-[300px] overflow-y-auto">
                            {requestTasks
                              .filter((t: any) => !t.parentTaskId && t.status === 'to_do')
                              .map((task: any) => {
                                const subTasks = requestTasks.filter((t: any) => t.parentTaskId === task.id);
                                return (
                                  <div key={task.id} className="border-t p-2 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 
                                          onClick={() => handleTaskClick(task.id)}
                                          className="font-medium text-sm truncate cursor-pointer text-amber-700 dark:text-amber-400 hover:underline" 
                                          data-testid={`task-link-${task.id}`}
                                        >
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                          {task.assignedTo && (
                                            <span className="flex items-center gap-1">
                                              <User2 className="w-3 h-3" />
                                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                                            </span>
                                          )}
                                          {subTasks.length > 0 && (
                                            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/30">
                                              {subTasks.filter((st: any) => st.status === 'completed').length}/{subTasks.length} subtasks
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleTaskClick(task.id)}
                                        data-testid={`button-view-task-${task.id}`}
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                      </Button>
                                    </div>
                                    {subTasks.length > 0 && (
                                      <div className="mt-2 ml-9 space-y-1 border-l-2 border-amber-200 dark:border-amber-800 pl-2">
                                        {subTasks.map((subTask: any) => (
                                          <div key={subTask.id} className="flex items-center gap-1.5 text-xs">
                                            <div className={`w-1.5 h-1.5 rounded-full ${subTask.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="truncate">{subTask.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Completed Tasks */}
                    {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'completed').length > 0 && (
                      <AccordionItem value="completed" className="border rounded-lg">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-green-50 dark:hover:bg-green-950/20">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-sm font-semibold">Completed</span>
                            <Badge variant="secondary" className="text-xs">
                              {requestTasks.filter((t: any) => !t.parentTaskId && t.status === 'completed').length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <div className="max-h-[300px] overflow-y-auto">
                            {requestTasks
                              .filter((t: any) => !t.parentTaskId && t.status === 'completed')
                              .map((task: any) => {
                                const subTasks = requestTasks.filter((t: any) => t.parentTaskId === task.id);
                                return (
                                  <div key={task.id} className="border-t p-2 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 mt-0.5">
                                        <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                          <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 
                                          onClick={() => handleTaskClick(task.id)}
                                          className="font-medium text-sm truncate cursor-pointer text-green-700 dark:text-green-400 hover:underline line-through" 
                                          data-testid={`task-link-${task.id}`}
                                        >
                                          {task.title}
                                        </h4>
                                        {task.description && (
                                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                          {task.assignedTo && (
                                            <span className="flex items-center gap-1">
                                              <User2 className="w-3 h-3" />
                                              {task.assignedTo.firstName} {task.assignedTo.lastName}
                                            </span>
                                          )}
                                          {subTasks.length > 0 && (
                                            <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30">
                                              {subTasks.filter((st: any) => st.status === 'completed').length}/{subTasks.length} subtasks
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleTaskClick(task.id)}
                                        data-testid={`button-view-task-${task.id}`}
                                      >
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                      </Button>
                                    </div>
                                    {subTasks.length > 0 && (
                                      <div className="mt-2 ml-9 space-y-1 border-l-2 border-green-200 dark:border-green-800 pl-2">
                                        {subTasks.map((subTask: any) => (
                                          <div key={subTask.id} className="flex items-center gap-1.5 text-xs">
                                            <div className={`w-1.5 h-1.5 rounded-full ${subTask.status === 'completed' ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            <span className="truncate line-through text-muted-foreground">{subTask.title}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
      </ScrollArea>

      {/* Create Task Dialog - Compact */}
      <Dialog 
        open={showCreateTaskDialog} 
        onOpenChange={(open) => {
          setShowCreateTaskDialog(open);
          if (open) {
            // Auto-fill title and due date when opening dialog
            const autoTitle = `${formatRequestType(request.type)} - ${request.requestedBy.firstName} ${request.requestedBy.lastName}`;
            setNewTaskTitle(autoTitle);
            setNewTaskDueDate(new Date(request.dueDate).toISOString().split('T')[0]);
          }
        }}
      >
        <DialogContent className="max-w-2xl" data-testid="dialog-create-task">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Create New Task
            </DialogTitle>
            <DialogDescription className="text-sm">
              Track work for this request
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Task Info */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Task Title *</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="mt-1"
                  data-testid="input-task-title"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add details..."
                  className="mt-1 min-h-[80px] resize-none"
                  data-testid="textarea-task-description"
                />
              </div>
            </div>
            
            {/* Time Estimation Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Time Estimation</h3>
                <Badge variant="outline" className="text-xs">
                  {displayExpectedTime}
                </Badge>
              </div>
              
              {/* Complexity, Confidence, and Custom Input Row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
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
                    <div className="flex items-center justify-between p-1.5 bg-green-50 dark:bg-green-950/20 rounded">
                      <div className="text-green-600 font-medium text-sm">Optimistic</div>
                      <div className="text-base font-bold">{pertValues.optimistic.toFixed(1)}h</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <div className="text-blue-600 font-medium text-sm">Most Likely</div>
                      <div className="text-base font-bold">{pertValues.mostLikely.toFixed(1)}h</div>
                    </div>
                    
                    <div className="flex items-center justify-between p-1.5 bg-orange-50 dark:bg-orange-950/20 rounded">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="mt-1"
                  data-testid="input-due-date"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={newTaskStatus} onValueChange={setNewTaskStatus}>
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateTaskDialog(false);
                setNewTaskTitle("");
                setNewTaskDescription("");
                setNewTaskDueDate("");
                setTimeEstimation({ baseHours: null, complexity: 'medium', confidence: 'medium' });
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
                  status: newTaskStatus,
                  requestId: request.id,
                  dueDate: newTaskDueDate || undefined,
                  optimisticTime: pertValues.optimistic,
                  mostLikelyTime: pertValues.mostLikely,
                  pessimisticTime: pertValues.pessimistic,
                };

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
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 disabled:text-white"
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
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 disabled:text-white"
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
                <SelectItem value="user_investigation">👤 User Investigation - Verify user data, check activity logs</SelectItem>
                <SelectItem value="data_extraction">📊 One-time Data Request - Export data as CSV/Excel</SelectItem>
                <SelectItem value="bq_access">🔐 BigQuery/Tool Access - Request database or tool access</SelectItem>
                <SelectItem value="data_bug">🐛 Data Bug/Data Quality Issue - Report data inconsistencies</SelectItem>
                <SelectItem value="adhoc_analysis">📈 Ad-hoc Analysis - Deep-dive analysis on specific question</SelectItem>
                <SelectItem value="modify_dashboard">✏️ Modification to Existing Dashboard - Update existing reports</SelectItem>
                <SelectItem value="new_dashboard">📋 New Dashboard - Create new reports or visualizations</SelectItem>
                <SelectItem value="training">🎓 Training (Capacity Building) - Learn data tools and skills</SelectItem>
                <SelectItem value="experimentation">🔬 Experimentation - Design, review, or analyze experiments</SelectItem>
                <SelectItem value="other">📝 Other - Any other data-related request</SelectItem>
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
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 disabled:text-white"
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
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300 disabled:text-white"
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
