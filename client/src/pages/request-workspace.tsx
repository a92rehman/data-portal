import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDataRequestSchema, type User, type DataRequestWithDetails } from "@shared/schema";

interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date | null;
  userId: string;
  requestId: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import notify from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, RotateCcw, Save, User as UserIcon, UserCheck, MessageSquare } from "lucide-react";
import { z } from "zod";

const formSchema = insertDataRequestSchema.extend({
  title: z.string().min(1, "Project name is required"),
  dueDate: z.string().min(1, "Deadline is required"),
  assignedToId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function RequestWorkspace() {
  const [_, setLocation] = useLocation();
  const [match, params] = useRoute("/requests/:id");
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");

  const requestId = params?.id;
  const isEditMode = !!requestId;

  // Fetch request details if editing
  const { data: request, isLoading } = useQuery<DataRequestWithDetails>({
    queryKey: ["/api/requests", requestId],
    queryFn: async () => {
      const response = await fetch(`/api/requests/${requestId}`);
      if (!response.ok) throw new Error("Failed to fetch request");
      return response.json();
    },
    enabled: isEditMode,
  });

  // Fetch analysts for data lead
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: (user as any)?.role === "team_lead",
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      priority: undefined,
      department: (user as any)?.department || "",
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
    },
  });

  // Update form when request data loads
  useEffect(() => {
    if (request) {
      form.reset({
        title: request.title,
        type: request.type,
        priority: request.priority,
        department: request.department || "",
        dueDate: new Date(request.dueDate).toISOString().split('T')[0],
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
      });
      setSelectedType(request.type);
    }
  }, [request]);

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      };
      
      if (isEditMode) {
        return await apiRequest("PATCH", `/api/requests/${requestId}`, formattedData);
      } else {
        return await apiRequest("POST", "/api/requests", formattedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      notify.success(isEditMode ? "Request updated successfully" : "Request submitted successfully");
      setLocation("/");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to save request");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/requests/${requestId}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/requests", requestId] });
      notify.success("Comment added successfully");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to add comment");
    },
  });

  const onSubmit = (data: FormData) => {
    createOrUpdateMutation.mutate(data);
  };

  const handleReset = () => {
    form.reset();
    setSelectedType("");
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleAddComment = () => {
    if (newComment.trim() && requestId) {
      addCommentMutation.mutate(newComment);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const isDashboardRequest = selectedType === "new_dashboard" || selectedType === "modify_dashboard";

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header with Back Button */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-purple-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="hover:bg-purple-100 dark:hover:bg-gray-700"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
              {isEditMode ? "Edit Data Request" : "New Data Request"}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Project Name */}
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
                              data-testid="input-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Type and Priority */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              data-testid="select-type"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="new_dashboard">New Dashboard/Report</SelectItem>
                                <SelectItem value="modify_dashboard">Modification to Existing Dashboard/Report</SelectItem>
                                <SelectItem value="adhoc_analysis">Ad-hoc Data Analysis</SelectItem>
                                <SelectItem value="data_extraction">One-time Data Extraction (CSV/Excel)</SelectItem>
                                <SelectItem value="data_bug">Data Bug / Data Quality Issue</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                                <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                                <SelectItem value="p1_high">P1 - High</SelectItem>
                                <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                                <SelectItem value="p3_low">P3 - Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Deadline */}
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deadline <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Primary Question */}
                    <FormField
                      control={form.control}
                      name="primaryQuestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Question <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What specific question are you trying to answer?"
                              {...field}
                              value={field.value || ""}
                              rows={3}
                              data-testid="input-primary-question"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Business Problem */}
                    <FormField
                      control={form.control}
                      name="businessProblem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Problem/Context <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What business problem are you trying to solve?"
                              {...field}
                              value={field.value || ""}
                              rows={3}
                              data-testid="input-business-problem"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Decision/Action */}
                    <FormField
                      control={form.control}
                      name="decisionAction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Decision/Action <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What decision or action will you take based on this data?"
                              {...field}
                              value={field.value || ""}
                              rows={3}
                              data-testid="input-decision-action"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dashboard-specific fields */}
                    {isDashboardRequest && (
                      <>
                        <FormField
                          control={form.control}
                          name="keyMetrics"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Key Metrics/KPIs</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="List the key metrics you need to track..."
                                  {...field}
                                  value={field.value || ""}
                                  rows={3}
                                  data-testid="input-key-metrics"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dashboardAudience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Audience</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Who will use this dashboard?"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-audience"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1"
                        data-testid="button-reset"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                      <Button
                        type="submit"
                        disabled={createOrUpdateMutation.isPending}
                        className="flex-1 gradient-button-primary text-white"
                        data-testid="button-submit"
                      >
                        {createOrUpdateMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {isEditMode ? "Save Changes" : "Submit Request"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Comments Section - Below Form */}
            {isEditMode && request && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments & Collaboration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      data-testid="input-comment"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="gradient-button-primary text-white"
                      data-testid="button-add-comment"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  <Separator />

                  {/* Comments List */}
                  <div className="space-y-3">
                    {request.comments && request.comments.length > 0 ? (
                      request.comments.map((comment: CommentWithUser) => (
                        <Card key={comment.id} className="bg-gray-50 dark:bg-gray-800">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={comment.user.profileImageUrl ?? ""} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xs">
                                  {getInitials(comment.user.firstName ?? undefined, comment.user.lastName ?? undefined)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-semibold">
                                    {comment.user.firstName} {comment.user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ""}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN - Info Panels */}
          <div className="space-y-6">
            {/* Requester Information */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserIcon className="w-5 h-5" />
                  Requester
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={(user as any)?.profileImageUrl ?? ""} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white font-semibold">
                      {getInitials((user as any)?.firstName, (user as any)?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">
                      {(user as any)?.firstName} {(user as any)?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{(user as any)?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {(user as any)?.department || "Not specified"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignee Information */}
            {isEditMode && request?.assignedTo && (
              <Card className="shadow-lg border-2 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserCheck className="w-5 h-5 text-green-600" />
                    Assigned To
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.assignedTo.profileImageUrl ?? ""} />
                      <AvatarFallback className="bg-gradient-to-br from-green-600 to-emerald-600 text-white font-semibold">
                        {getInitials(request.assignedTo.firstName ?? undefined, request.assignedTo.lastName ?? undefined)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {request.assignedTo.firstName} {request.assignedTo.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{request.assignedTo.email}</p>
                      <p className="text-xs text-green-600 font-medium">Data Analyst</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Badge */}
            {isEditMode && request && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                      request.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                      request.status === "in_progress" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                      request.status === "under_review" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {request.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
