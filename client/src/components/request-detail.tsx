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
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    enabled: (user as any)?.role === "data_analyst",
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

  const isAnalyst = (user as any)?.role === "data_analyst";

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-semibold" data-testid="text-request-id">
              {request.id.slice(0, 12)}...
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-request-title">
              {request.title}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-detail">
            <X className="w-4 h-4" />
          </Button>
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
              {isAnalyst && isEditingPriorityDeadline ? (
                <Select value={editedPriority} onValueChange={(value) => setEditedPriority(value as "low" | "medium" | "high")} data-testid="select-edit-priority">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1" data-testid="priority-display">
                  {getPriorityIcon(request.priority)}
                  <span className="text-sm font-medium capitalize">{request.priority}</span>
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
              {isAnalyst && isEditingPriorityDeadline ? (
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

        {/* Edit Priority and Deadline buttons for Analysts */}
        {isAnalyst && (
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

        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          <Card className="border-2 border-purple-200 shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-foreground" data-testid="text-description">
                {request.description}
              </p>
            </CardContent>
          </Card>
        </div>

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

        {/* Assignment Section for Analysts */}
        {isAnalyst && (
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
                >
                  {assignMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
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
                size="sm" 
                disabled={!newComment.trim() || addCommentMutation.isPending}
                data-testid="button-add-comment"
              >
                {addCommentMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
