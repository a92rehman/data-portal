import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertDataRequestSchema, type DataRequestWithDetails, type User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Send, User as UserIcon, Info, ChevronDown, ChevronRight, ListTodo, Plus, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { showNotification } from "@/lib/notifications";
import { z } from "zod";

const formSchema = insertDataRequestSchema.extend({
  title: z.string().min(1, "Project name is required"),
  dueDate: z.string().min(1, "Deadline is required"),
  assignedToId: z.string().optional(),
}).superRefine((data, ctx) => {
  // BigQuery access validation
  if (data.type === "bq_access") {
    if (!data.bqEmail || data.bqEmail.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email for BQ Access is required",
        path: ["bqEmail"],
      });
    }
    if (!data.bqDatasets || data.bqDatasets.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Datasets/Tables are required",
        path: ["bqDatasets"],
      });
    }
    if (!data.bqPurpose || data.bqPurpose.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Purpose of access is required",
        path: ["bqPurpose"],
      });
    }
  }

  // Data bug validation
  if (data.type === "data_bug") {
    if (!data.bugDescription || data.bugDescription.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bug description is required",
        path: ["bugDescription"],
      });
    }
    if (!data.bugLocation || data.bugLocation.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bug location is required",
        path: ["bugLocation"],
      });
    }
  }

  // User Investigation validation
  if (data.type === "user_investigation") {
    if (!data.investigationPurpose || data.investigationPurpose.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Investigation purpose is required",
        path: ["investigationPurpose"],
      });
    }
    if (!data.userName || data.userName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "User/Teacher Name is required",
        path: ["userName"],
      });
    }
    if (!data.userMobile || data.userMobile.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mobile Number is required",
        path: ["userMobile"],
      });
    }
    if (!data.schoolEmisCode || data.schoolEmisCode.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "School EMIS Code is required",
        path: ["schoolEmisCode"],
      });
    }
  }

  // Training validation
  if (data.type === "training") {
    if (!data.trainingTopic || data.trainingTopic.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Training topic is required",
        path: ["trainingTopic"],
      });
    }
    if (!data.trainingHours || data.trainingHours <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Training hours must be greater than 0",
        path: ["trainingHours"],
      });
    }
  }

  // Experimentation validation
  if (data.type === "experimentation") {
    if (!data.experimentSubType || data.experimentSubType.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Experimentation sub-type is required",
        path: ["experimentSubType"],
      });
    }
    
    // Sub-type specific validation
    if (data.experimentSubType === "design_new") {
      if (!data.experimentProblem || data.experimentProblem.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Problem description is required",
          path: ["experimentProblem"],
        });
      }
    }
    if (data.experimentSubType === "review") {
      if (!data.experimentFileLink || data.experimentFileLink.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Experiment file/link is required",
          path: ["experimentFileLink"],
        });
      }
    }
    if (data.experimentSubType === "analysis") {
      if (!data.experimentAnalysisType || data.experimentAnalysisType.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Analysis type is required",
          path: ["experimentAnalysisType"],
        });
      }
      if (!data.experimentDatasetLink || data.experimentDatasetLink.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Dataset link is required",
          path: ["experimentDatasetLink"],
        });
      }
    }
    if (data.experimentSubType === "implementation") {
      if (!data.experimentImplementationType || data.experimentImplementationType.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Implementation type is required",
          path: ["experimentImplementationType"],
        });
      }
    }
    if (data.experimentSubType === "other") {
      if (!data.experimentOtherDetails || data.experimentOtherDetails.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Request details are required",
          path: ["experimentOtherDetails"],
        });
      }
    }
  }
});

type FormData = z.infer<typeof formSchema>;

interface CommentWithUser {
  id: string;
  requestId: string;
  userId: string;
  content: string;
  createdAt: Date | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export default function RequestWorkspace() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/requests/:id");
  const requestId = params?.id;
  const isNewRequest = requestId === "new";
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  
  // Collapsible section states (all open by default)
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(true);
  const [section3Open, setSection3Open] = useState(true);
  const [section4Open, setSection4Open] = useState(true);
  const [section5Open, setSection5Open] = useState(true);

  // Fetch existing request if editing
  const { data: request, isLoading: isLoadingRequest } = useQuery<DataRequestWithDetails>({
    queryKey: ["/api/requests", requestId],
    enabled: !isNewRequest && !!requestId,
  });

  // Fetch analysts for assignment (team leads only)
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: (user as any)?.role === "team_lead",
  });

  // Fetch tasks for this request
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks", { requestId }],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?requestId=${requestId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !isNewRequest && !!requestId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { title: string; description?: string; requestId: string }) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      showNotification("success", "Task created successfully");
    },
    onError: (error: Error) => {
      showNotification("error", error.message || "Failed to create task");
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      priority: undefined,
      department: "",
      team: "",
      dueDate: "",
      assignedToId: undefined,
      primaryQuestion: "",
      businessProblem: "",
      decisionAction: "",
      impact: undefined,
      frequency: undefined,
      frequencyDuration: 0,
      frequencyUnit: "",
      dashboardAudience: "",
      dashboardRefreshFrequency: "",
      keyMetrics: "",
      filters: "",
      mockups: "",
      actionPlan: "",
      bqEmail: "",
      bqDatasets: "",
      bqPurpose: "",
      bugDescription: "",
      bugLocation: "",
      trackingEvent: "",
      trackingPlatform: "",
      trackingDetails: "",
      metricName: "",
      metricChangeType: "",
      metricReason: "",
      pipelineName: "",
      pipelineChangeType: "",
      pipelineDetails: "",
      investigationPurpose: "",
      userName: "",
      userMobile: "",
      userProfileId: "",
      userId: "",
      schoolEmisCode: "",
      trainingTopic: "",
      trainingHours: "",
      experimentSubType: "",
      experimentProblem: "",
      experimentSuccessMetrics: "",
      experimentTimeline: "",
      experimentFileLink: "",
      experimentReviewFocus: "",
      experimentAnalysisType: "",
      experimentDatasetLink: "",
      experimentHypothesis: "",
      experimentImplementationType: "",
      experimentPlatform: "",
      experimentOtherDetails: "",
    },
  });

  // Load request data into form when editing
  useEffect(() => {
    if (request && !isNewRequest) {
      form.reset({
        title: request.title || "",
        type: request.type || undefined,
        priority: request.priority || undefined,
        department: request.department || "",
        team: request.team || "",
        dueDate: request.dueDate ? new Date(request.dueDate).toISOString().split('T')[0] : "",
        assignedToId: request.assignedToId || undefined,
        primaryQuestion: request.primaryQuestion || "",
        businessProblem: request.businessProblem || "",
        decisionAction: request.decisionAction || "",
        impact: request.impact || undefined,
        frequency: request.frequency || undefined,
        frequencyDuration: request.frequencyDuration || 0,
        frequencyUnit: request.frequencyUnit || "",
        dashboardAudience: request.dashboardAudience || "",
        dashboardRefreshFrequency: request.dashboardRefreshFrequency || "",
        keyMetrics: request.keyMetrics || "",
        filters: request.filters || "",
        mockups: request.mockups || "",
        actionPlan: request.actionPlan || "",
        bqEmail: request.bqEmail || "",
        bqDatasets: request.bqDatasets || "",
        bqPurpose: request.bqPurpose || "",
        bugDescription: request.bugDescription || "",
        bugLocation: request.bugLocation || "",
        trackingEvent: request.trackingEvent || "",
        trackingPlatform: request.trackingPlatform || "",
        trackingDetails: request.trackingDetails || "",
        metricName: request.metricName || "",
        metricChangeType: request.metricChangeType || "",
        metricReason: request.metricReason || "",
        pipelineName: request.pipelineName || "",
        pipelineChangeType: request.pipelineChangeType || "",
        pipelineDetails: request.pipelineDetails || "",
        investigationPurpose: (request as any).investigationPurpose || "",
        userName: (request as any).userName || "",
        userMobile: (request as any).userMobile || "",
        userProfileId: (request as any).userProfileId || "",
        userId: (request as any).userId || "",
        schoolEmisCode: (request as any).schoolEmisCode || "",
        trainingTopic: (request as any).trainingTopic || "",
        trainingHours: (request as any).trainingHours || "",
        experimentSubType: (request as any).experimentSubType || "",
        experimentProblem: (request as any).experimentProblem || "",
        experimentSuccessMetrics: (request as any).experimentSuccessMetrics || "",
        experimentTimeline: (request as any).experimentTimeline || "",
        experimentFileLink: (request as any).experimentFileLink || "",
        experimentReviewFocus: (request as any).experimentReviewFocus || "",
        experimentAnalysisType: (request as any).experimentAnalysisType || "",
        experimentDatasetLink: (request as any).experimentDatasetLink || "",
        experimentHypothesis: (request as any).experimentHypothesis || "",
        experimentImplementationType: (request as any).experimentImplementationType || "",
        experimentPlatform: (request as any).experimentPlatform || "",
        experimentOtherDetails: (request as any).experimentOtherDetails || "",
      });
      setSelectedType(request.type || "");
    }
  }, [request, isNewRequest]);

  // Auto-populate department from user profile for new requests
  useEffect(() => {
    if (isNewRequest && user && (user as any)?.department) {
      form.setValue("department", (user as any).department);
    }
  }, [isNewRequest, user, form]);

  const createRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      };
      
      // Evaluate requestId at mutation time, not at component mount
      const effectiveRequestId = params?.id;
      const isNew = !effectiveRequestId || effectiveRequestId === "new";
      
      if (isNew) {
        return await apiRequest("POST", "/api/requests", formattedData);
      } else {
        return await apiRequest("PATCH", `/api/requests/${effectiveRequestId}`, formattedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      showNotification("success", isNewRequest ? "Request submitted successfully" : "Request updated successfully");
      navigate("/");
    },
    onError: (error: Error) => {
      showNotification("error", error.message || "Failed to submit request");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/requests/${requestId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      setCommentText("");
      showNotification("success", "Comment added");
    },
    onError: (error: Error) => {
      showNotification("error", error.message || "Failed to add comment");
    },
  });

  const onSubmit = (data: FormData) => {
    createRequestMutation.mutate(data);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText);
  };

  const isDashboardRequest = selectedType === "new_dashboard" || selectedType === "modify_dashboard";

  if (!isNewRequest && isLoadingRequest) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading request...</p>
        </div>
      </div>
    );
  }

  const requester = !isNewRequest && request ? {
    name: (request as any).requester?.firstName && (request as any).requester?.lastName
      ? `${(request as any).requester.firstName} ${(request as any).requester.lastName}`
      : (request as any).requester?.email || "Unknown",
    email: (request as any).requester?.email || "",
    department: request.department || "Not specified",
  } : {
    name: (user as any)?.firstName && (user as any)?.lastName ? `${(user as any).firstName} ${(user as any).lastName}` : (user as any)?.email || "You",
    email: (user as any)?.email || "",
    department: form.watch("department") || "Not specified",
  };

  const assignee = !isNewRequest && request?.assignedTo ? {
    name: request.assignedTo.firstName && request.assignedTo.lastName
      ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
      : request.assignedTo.email,
    email: request.assignedTo.email,
  } : null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-bold">
            {isNewRequest ? "New Data Request" : `Edit Request: ${request?.title}`}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Form (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
              
              {/* Section 1: Requester & Project Information */}
              <Collapsible open={section1Open} onOpenChange={setSection1Open}>
                <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(260, 100%, 97%) 0%, hsl(220, 100%, 98%) 100%)'}}>
                  <CollapsibleTrigger asChild>
                    <button 
                      type="button"
                      className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Section 1: Requester & Project Information
                      </h3>
                      {section1Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-4 px-5 pb-5">
                      <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Weekly Student Engagement Pulse"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-department">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Program">Program</SelectItem>
                          <SelectItem value="P&C">P&C</SelectItem>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="LP">LP</SelectItem>
                          <SelectItem value="Training">Training</SelectItem>
                          <SelectItem value="ERP">ERP</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                          <SelectItem value="Strategy">Strategy</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your team name if applicable..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-team"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(user as any)?.role === "team_lead" && (
                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Analyst (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-assignee">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select analyst..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {analysts?.map((analyst) => (
                              <SelectItem key={analyst.id} value={analyst.id}>
                                {analyst.firstName && analyst.lastName
                                  ? `${analyst.firstName} ${analyst.lastName} (${analyst.email})`
                                  : analyst.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Section 2: Request Details & Business Impact */}
              <Collapsible open={section2Open} onOpenChange={setSection2Open}>
                <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(200, 100%, 97%) 0%, hsl(180, 100%, 98%) 100%)'}}>
                  <CollapsibleTrigger asChild>
                    <button 
                      type="button"
                      className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <h3 className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Section 2: Request Details & Business Impact
                      </h3>
                      {section2Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-4 px-5 pb-5">
                      <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Request <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedType(value);
                        }} 
                        value={field.value} 
                        disabled={!isNewRequest}
                        data-testid="select-type"
                      >
                        <FormControl>
                          <SelectTrigger className={!isNewRequest ? "opacity-60" : ""}>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[400px]">
                          <SelectItem value="user_investigation">
                            <div className="flex flex-col">
                              <span className="font-medium">User Investigation</span>
                              <span className="text-xs text-muted-foreground">Verify user data, check activity logs</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="data_extraction">
                            <div className="flex flex-col">
                              <span className="font-medium">One-time Data Request</span>
                              <span className="text-xs text-muted-foreground">Export data as CSV/Excel</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="bq_access">
                            <div className="flex flex-col">
                              <span className="font-medium">BigQuery/Tool Access</span>
                              <span className="text-xs text-muted-foreground">Request database or tool access</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="data_bug">
                            <div className="flex flex-col">
                              <span className="font-medium">Data Bug/Data Quality Issue</span>
                              <span className="text-xs text-muted-foreground">Report data inconsistencies or errors</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="adhoc_analysis">
                            <div className="flex flex-col">
                              <span className="font-medium">Ad-hoc Analysis</span>
                              <span className="text-xs text-muted-foreground">Deep-dive analysis on specific question</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="modify_dashboard">
                            <div className="flex flex-col">
                              <span className="font-medium">Modification to Existing Dashboard</span>
                              <span className="text-xs text-muted-foreground">Update or enhance existing reports</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="new_dashboard">
                            <div className="flex flex-col">
                              <span className="font-medium">New Dashboard</span>
                              <span className="text-xs text-muted-foreground">Create new reports or visualizations</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="training">
                            <div className="flex flex-col">
                              <span className="font-medium">Training (Capacity Building)</span>
                              <span className="text-xs text-muted-foreground">Learn data tools and analytics skills</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="experimentation">
                            <div className="flex flex-col">
                              <span className="font-medium">Experimentation</span>
                              <span className="text-xs text-muted-foreground">Design, review, or analyze experiments</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex flex-col">
                              <span className="font-medium">Other</span>
                              <span className="text-xs text-muted-foreground">Any other data-related request</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {!isNewRequest && (
                        <p className="text-xs text-muted-foreground">Type cannot be changed after creation</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryQuestion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Question <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What is the primary question you are trying to answer through this request? Be specific about the metric and time window..."
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-primary-question"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessProblem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Problem or Goal <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the program or operational problem this request solves, and the outcome you're aiming for..."
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-business-problem"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decisionAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision or Action <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What specific decision or action will you take once you have this data/analysis/dashboard?"
                          rows={3}
                          {...field}
                          value={field.value || ""}
                          data-testid="input-decision-action"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-priority">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="p0_critical">P0 - Critical (Imminent business decision/launch)</SelectItem>
                            <SelectItem value="p1_high">P1 - High (Key business decisions)</SelectItem>
                            <SelectItem value="p2_medium">P2 - Medium (Important for planning)</SelectItem>
                            <SelectItem value="p3_low">P3 - Low (General curiosity, future planning)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="impact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impact <span className="text-red-500">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-impact">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select impact..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Program Implementation">Program Implementation</SelectItem>
                            <SelectItem value="Product Improvement">Product Improvement</SelectItem>
                            <SelectItem value="Strategic Decision">Strategic Decision</SelectItem>
                            <SelectItem value="Content Improvement">Content Improvement</SelectItem>
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Section 3: Data Frequency */}
              <Collapsible open={section3Open} onOpenChange={setSection3Open}>
                <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(280, 100%, 97%) 0%, hsl(300, 100%, 98%) 100%)'}}>
                  <CollapsibleTrigger asChild>
                    <button 
                      type="button"
                      className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Section 3: Data Frequency
                      </h3>
                      {section3Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="space-y-4 px-5 pb-5">
                      <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>At which frequency will you see this data? <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-frequency">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="One Time">One Time</SelectItem>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("frequency") && form.watch("frequency") !== "One Time" && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="frequencyDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>For how long?</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="e.g., 3"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              data-testid="input-frequency-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="frequencyUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-frequency-unit">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                              <SelectItem value="quarters">Quarters</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              {/* Dashboard-Specific Information */}
              {isDashboardRequest && (
                <>
                  <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                    <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(140, 100%, 97%) 0%, hsl(160, 100%, 98%) 100%)'}}>
                      <CollapsibleTrigger asChild>
                        <button 
                          type="button"
                          className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                        >
                          <h3 className="font-semibold text-sm bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                            Dashboard-Specific Information
                          </h3>
                          {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="space-y-4 px-5 pb-5">
                          <FormField
                      control={form.control}
                      name="dashboardAudience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Who are the primary audience/users?</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., PMs, Coaches, PAFM, RMs, AEOs, Principals..."
                              {...field}
                              value={field.value || ""}
                              data-testid="input-audience"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dashboardRefreshFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intended Refresh Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-dashboard-refresh">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select refresh frequency..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Real-time">Real-time / Live</SelectItem>
                              <SelectItem value="Daily">Daily</SelectItem>
                              <SelectItem value="Weekly">Weekly</SelectItem>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Quarterly">Quarterly</SelectItem>
                              <SelectItem value="On-demand">On-demand (Manual Refresh)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="keyMetrics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key Metrics/KPIs Needed</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please list the specific metrics. Example: Daily Active Users, Course Completion Rate, etc."
                              rows={3}
                              {...field}
                              value={field.value || ""}
                              data-testid="input-key-metrics"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="filters"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Filters</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="How do you want to slice the data? Example: By date range, by geographic region, by school, by user type..."
                              rows={3}
                              {...field}
                              value={field.value || ""}
                              data-testid="input-filters"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mockups"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mock-ups, Examples, or Links</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please provide links or descriptions of similar reports/dashboards..."
                              rows={2}
                              {...field}
                              value={field.value || ""}
                              data-testid="input-mockups"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  <Collapsible open={section5Open} onOpenChange={setSection5Open}>
                    <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(40, 100%, 97%) 0%, hsl(20, 100%, 98%) 100%)'}}>
                      <CollapsibleTrigger asChild>
                        <button 
                          type="button"
                          className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                        >
                          <h3 className="font-semibold text-sm bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            Section 4: Actions
                          </h3>
                          {section5Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="space-y-4 px-5 pb-5">
                          <FormField
                      control={form.control}
                      name="actionPlan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action Plan</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="How will you and your team act on the insights from this analysis/dashboard?"
                              rows={3}
                              {...field}
                              value={field.value || ""}
                              data-testid="input-action-plan"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </>
              )}

              {/* BigQuery Access Request Fields */}
              {selectedType === "bq_access" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(280, 100%, 97%) 0%, hsl(260, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          BigQuery Access Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="bqEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email for BQ Access <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="email"
                                  placeholder="user@taleemabad.com"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bq-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bqDatasets"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Datasets/Tables Needed <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="List the specific datasets and tables you need access to..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bq-datasets"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bqPurpose"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purpose of Access <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Explain why you need this data access and how it will be used..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bq-purpose"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Data Bug Fields */}
              {selectedType === "data_bug" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(0, 100%, 97%) 0%, hsl(20, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                          Bug Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="bugDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bug Description <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the data bug or quality issue in detail..."
                                  rows={4}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bug-description"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bugLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location/Dashboard/Report <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Where did you observe this issue? (Dashboard name, report, table, etc.)"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bug-location"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Tracking Request Fields */}
              {selectedType === "tracking" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(120, 100%, 97%) 0%, hsl(140, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          Event Tracking Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="trackingEvent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., button_click, page_view, video_complete"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-tracking-event"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trackingPlatform"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Platform/App</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Web App, Mobile App, Dashboard"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-tracking-platform"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trackingDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Details</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe what should be tracked, when it fires, and what properties to capture..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-tracking-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Metric Change Fields */}
              {selectedType === "metric_change" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(200, 100%, 97%) 0%, hsl(220, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                          Metric Change Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="metricName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Metric Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Active Users, Completion Rate"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-metric-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="metricChangeType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type of Change</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-metric-change-type">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select change type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="definition">Change Definition</SelectItem>
                                  <SelectItem value="calculation">Change Calculation Method</SelectItem>
                                  <SelectItem value="rename">Rename Metric</SelectItem>
                                  <SelectItem value="deprecate">Deprecate/Remove Metric</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="metricReason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason for Change</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Explain why this metric needs to be changed..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-metric-reason"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Pipeline Change Fields */}
              {selectedType === "pipeline_change" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(40, 100%, 97%) 0%, hsl(60, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                          Pipeline Change Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="pipelineName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pipeline/ETL Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., student_data_sync, daily_aggregation"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-pipeline-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pipelineChangeType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type of Change</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-pipeline-change-type">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select change type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="new_column">Add New Column/Field</SelectItem>
                                  <SelectItem value="modify_transformation">Modify Transformation Logic</SelectItem>
                                  <SelectItem value="schedule">Change Schedule/Frequency</SelectItem>
                                  <SelectItem value="source">Change Data Source</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pipelineDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Change Details</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe the pipeline change in detail..."
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-pipeline-details"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* User Investigation Fields */}
              {selectedType === "user_investigation" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(280, 100%, 97%) 0%, hsl(300, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          User Investigation Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="investigationPurpose"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What is the purpose of this investigation? <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Example: verify attendance data, check missing visit logs, confirm teacher's activity"
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-investigation-purpose"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Please provide identification details:</p>
                          
                          <FormField
                            control={form.control}
                            name="userName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>User/Teacher Name <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Full name of the user"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-user-name"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="userMobile"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Mobile Number <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g., +92 300 1234567"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-user-mobile"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="userProfileId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Profile ID (Optional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Profile ID"
                                      {...field}
                                      value={field.value || ""}
                                      data-testid="input-user-profile-id"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="userId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>User ID (Optional)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="User ID"
                                      {...field}
                                      value={field.value || ""}
                                      data-testid="input-user-id"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="schoolEmisCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>School EMIS Code <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="School EMIS Code"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-school-emis-code"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Training (Capacity Building) Fields */}
              {selectedType === "training" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(160, 100%, 97%) 0%, hsl(180, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                          Training (Capacity Building) Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="trainingTopic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>What skill or topic do you want to learn or strengthen? <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Example: Using dashboards, extracting data from BigQuery, interpreting engagement metrics"
                                  rows={3}
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-training-topic"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="trainingHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How many hours of basic training do you require? <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  placeholder="Example: 1 hour for using dashboards, 2 hours for running queries in BQ"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                  data-testid="input-training-hours"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Experimentation Fields */}
              {selectedType === "experimentation" && (
                <Collapsible open={section4Open} onOpenChange={setSection4Open}>
                  <div className="rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(260, 100%, 97%) 0%, hsl(280, 100%, 98%) 100%)'}}>
                    <CollapsibleTrigger asChild>
                      <button 
                        type="button"
                        className="w-full px-5 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                      >
                        <h3 className="font-semibold text-sm bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                          Experimentation Details
                        </h3>
                        {section4Open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="space-y-4 px-5 pb-5">
                        <FormField
                          control={form.control}
                          name="experimentSubType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type of Experimentation Support <span className="text-red-500">*</span></FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined} data-testid="select-experiment-subtype">
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="design_new">Support in Designing a New Experiment</SelectItem>
                                  <SelectItem value="review">Review the Experiment</SelectItem>
                                  <SelectItem value="analysis">Support in Analysis</SelectItem>
                                  <SelectItem value="implementation">Support in Implementation</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {form.watch("experimentSubType") === "design_new" && (
                          <FormField
                            control={form.control}
                            name="experimentProblem"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Explain the problem you are trying to solve and its expected impact <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the problem, hypothesis, and expected impact..."
                                    rows={4}
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-experiment-problem"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch("experimentSubType") === "review" && (
                          <FormField
                            control={form.control}
                            name="experimentFileLink"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Attach the experiment file or link for review <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Paste link to Google Doc, Notion page, or file"
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-experiment-file-link"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch("experimentSubType") === "analysis" && (
                          <>
                            <FormField
                              control={form.control}
                              name="experimentAnalysisType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>What kind of analysis support do you require? <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Example: cleaning data, running comparisons, visualization, interpreting results"
                                      rows={3}
                                      {...field}
                                      value={field.value || ""}
                                      data-testid="input-experiment-analysis-type"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="experimentDatasetLink"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Attach the dataset and include a short note explaining the variables <span className="text-red-500">*</span></FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Paste link to dataset and explain the key variables..."
                                      rows={3}
                                      {...field}
                                      value={field.value || ""}
                                      data-testid="input-experiment-dataset-link"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {form.watch("experimentSubType") === "implementation" && (
                          <FormField
                            control={form.control}
                            name="experimentImplementationType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>What type of implementation support do you require and why? <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Example: help with randomization, monitoring rollout, data tracking setup, etc."
                                    rows={4}
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-experiment-implementation-type"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch("experimentSubType") === "other" && (
                          <FormField
                            control={form.control}
                            name="experimentOtherDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Explain your request briefly <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe what you need help with..."
                                    rows={4}
                                    {...field}
                                    value={field.value || ""}
                                    data-testid="input-experiment-other-details"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}

              {/* Info Card */}
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">What happens next?</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Your request will be reviewed by the Data & Impact team</li>
                        <li>You'll receive an estimated completion time within 24 hours</li>
                        <li>Track progress and communicate through the request detail page</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRequestMutation.isPending}
                  data-testid="button-submit"
                  className="gradient-button-primary text-white font-semibold"
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {isNewRequest ? "Submitting..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {isNewRequest ? "Submit Request" : "Save Changes"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        {/* Right Side - Info & Comments */}
        <div className="w-80 border-l border-border bg-muted/30 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Requester Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Requester
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-purple-600 text-white">
                      {requester.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{requester.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{requester.email}</p>
                  </div>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Department: </span>
                  <span className="font-medium">{requester.department}</span>
                </div>
              </CardContent>
            </Card>

            {/* Assignee Info */}
            {assignee && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    Assigned To
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{assignee.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{assignee.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isNewRequest && assignee === null && (
              <Card>
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  Not assigned yet
                </CardContent>
              </Card>
            )}

            {/* Tasks Section */}
            {!isNewRequest && (user as any)?.role !== "requester" && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Tasks ({tasks.length})
                    </CardTitle>
                    <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs" data-testid="button-add-task">
                          <Plus className="w-3 h-3 mr-1" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Task for Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Task Title</label>
                            <Input
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title..."
                              data-testid="input-task-title"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                            <Textarea
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description..."
                              rows={3}
                              data-testid="input-task-description"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Task will be automatically assigned to you. Data Lead can reassign it later if needed.
                          </p>
                          <Button
                            onClick={() => {
                              if (!newTaskTitle.trim()) return;
                              createTaskMutation.mutate({
                                title: newTaskTitle,
                                description: newTaskDescription || undefined,
                                requestId: requestId!,
                              });
                            }}
                            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                            className="w-full"
                            data-testid="button-create-task"
                          >
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.length > 0 ? (
                    tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-2 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate("/tasks")}
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            {task.expectedTime && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{task.expectedTime.toFixed(1)}h</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {task.status === "completed" ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${
                                task.status === "in_progress" ? "bg-blue-500" :
                                task.status === "blocked" ? "bg-red-500" :
                                "bg-gray-400"
                              }`} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-muted-foreground py-4">No tasks yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comments Section - Bottom */}
          {!isNewRequest && (
            <div className="border-t border-border flex flex-col" style={{ height: "40%" }}>
              <div className="px-4 py-3 bg-background">
                <h3 className="text-sm font-semibold">Comments</h3>
              </div>
              
              {/* Comments List - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {request?.comments && request.comments.length > 0 ? (
                  request.comments.map((comment: CommentWithUser) => (
                    <Card key={comment.id} className="bg-background">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-gray-600 text-white text-xs">
                              {comment.user?.firstName?.charAt(0) || comment.user?.email?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <p className="text-xs font-medium">
                                {comment.user?.firstName && comment.user?.lastName
                                  ? `${comment.user.firstName} ${comment.user.lastName}`
                                  : comment.user?.email || "Unknown"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                              </p>
                            </div>
                            <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-xs text-center text-muted-foreground py-8">No comments yet</p>
                )}
              </div>

              {/* Add Comment */}
              <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="flex-1 text-sm resize-none"
                    data-testid="input-comment"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="gradient-button-primary text-white"
                    data-testid="button-send-comment"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
