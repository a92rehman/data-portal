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
import { ArrowLeft, Send, User as UserIcon, Info, ChevronDown, ChevronRight } from "lucide-react";
import { showNotification } from "@/lib/notifications";
import { z } from "zod";

const formSchema = insertDataRequestSchema.extend({
  title: z.string().min(1, "Project name is required"),
  dueDate: z.string().min(1, "Deadline is required"),
  assignedToId: z.string().optional(),
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      priority: undefined,
      department: "",
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

  // Load request data into form when editing
  useEffect(() => {
    if (request && !isNewRequest) {
      form.reset({
        title: request.title || "",
        type: request.type || undefined,
        priority: request.priority || undefined,
        department: request.department || "",
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
      });
      setSelectedType(request.type || "");
    }
  }, [request, isNewRequest]);

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
                      <FormLabel>Department/Team <span className="text-red-500">*</span></FormLabel>
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
              <div className="space-y-4 p-5 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(200, 100%, 97%) 0%, hsl(180, 100%, 98%) 100%)'}}>
                <h3 className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Section 2: Request Details & Business Impact</h3>
                
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
                        <SelectContent>
                          <SelectItem value="new_dashboard">New Dashboard/Report</SelectItem>
                          <SelectItem value="modify_dashboard">Modification to Existing Dashboard/Report</SelectItem>
                          <SelectItem value="adhoc_analysis">Ad-hoc Data Analysis</SelectItem>
                          <SelectItem value="data_extraction">One-time Data Extraction (CSV/Excel)</SelectItem>
                          <SelectItem value="data_bug">Data Bug / Data Quality Issue</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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

              {/* Section 3: Data Frequency */}
              <div className="space-y-4 p-5 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(280, 100%, 97%) 0%, hsl(300, 100%, 98%) 100%)'}}>
                <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Section 3: Data Frequency</h3>
                
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

              {/* Dashboard-Specific Information */}
              {isDashboardRequest && (
                <>
                  <div className="space-y-4 p-5 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(140, 100%, 97%) 0%, hsl(160, 100%, 98%) 100%)'}}>
                    <h3 className="font-semibold text-sm bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">Dashboard-Specific Information</h3>
                  
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

                  <div className="space-y-4 p-5 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(40, 100%, 97%) 0%, hsl(20, 100%, 98%) 100%)'}}>
                    <h3 className="font-semibold text-sm bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Section 4: Actions</h3>
                    
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
                </>
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
