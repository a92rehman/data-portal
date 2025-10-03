import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDataRequestSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { X, Send, Info } from "lucide-react";
import { z } from "zod";

const formSchema = insertDataRequestSchema.extend({
  title: z.string().min(1, "Project name is required"),
  dueDate: z.string().min(1, "Deadline is required"),
});

type FormData = z.infer<typeof formSchema>;

interface RequestFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function RequestForm({ onClose, onSuccess }: RequestFormProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("");
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      type: undefined,
      priority: undefined,
      department: "",
      dueDate: "",
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

  const createRequestMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formattedData = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      };
      return await apiRequest("POST", "/api/requests", formattedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      toast({
        title: "Success",
        description: "Request submitted successfully",
      });
      onSuccess();
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
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createRequestMutation.mutate(data);
  };

  const isDashboardRequest = selectedType === "new_dashboard" || selectedType === "modify_dashboard";

  return (
    <div className="flex flex-col h-[calc(85vh-100px)]">
      <DialogHeader className="flex-shrink-0 pb-4 border-b border-border">
        <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">New Data Request</DialogTitle>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto pr-2 mt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
          
          <div className="space-y-4 p-4 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(260, 100%, 97%) 0%, hsl(220, 100%, 98%) 100%)'}}>
            <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Section 1: Requester & Project Information</h3>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Weekly Student Engagement Pulse"
                      {...field}
                      data-testid="input-form-title"
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
                  <FormLabel>Department/Team <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-department">
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
                  <FormLabel>Deadline Date <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      type="date"
                      {...field}
                      data-testid="input-form-due-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 p-4 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(200, 100%, 97%) 0%, hsl(180, 100%, 98%) 100%)'}}>
            <h3 className="font-semibold text-sm bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Section 2: Request Details & Business Impact</h3>
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Request <span className="text-destructive">*</span></FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedType(value);
                    }} 
                    value={field.value} 
                    data-testid="select-form-type"
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
              name="primaryQuestion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Question <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What is the primary question you are trying to answer through this request? Be specific about the metric and time window..."
                      rows={3}
                      {...field}
                      data-testid="textarea-form-primary-question"
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
                  <FormLabel>Business Problem or Goal <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the program or operational problem this request solves, and the outcome you're aiming for..."
                      rows={3}
                      {...field}
                      data-testid="textarea-form-business-problem"
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
                  <FormLabel>Decision or Action <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What specific decision or action will you take once you have this data/analysis/dashboard?"
                      rows={3}
                      {...field}
                      data-testid="textarea-form-decision-action"
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
                    <FormLabel>Priority Level <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-priority">
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
                    <FormLabel>Impact <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-impact">
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

          <div className="space-y-4 p-4 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(280, 100%, 97%) 0%, hsl(300, 100%, 98%) 100%)'}}>
            <h3 className="font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Section 3: Data Frequency</h3>
            
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>At which frequency will you see this data? <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-frequency">
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
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          data-testid="input-form-frequency-duration"
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
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-frequency-unit">
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

          {isDashboardRequest && (
            <>
              <div className="space-y-4 p-4 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(140, 100%, 97%) 0%, hsl(160, 100%, 98%) 100%)'}}>
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
                        data-testid="input-form-dashboard-audience"
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
                    <Select onValueChange={field.onChange} value={field.value} data-testid="select-form-dashboard-refresh">
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
                        data-testid="textarea-form-key-metrics"
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
                        data-testid="textarea-form-filters"
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
                        data-testid="textarea-form-mockups"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 rounded-lg border border-border" style={{background: 'linear-gradient(135deg, hsl(40, 100%, 97%) 0%, hsl(20, 100%, 98%) 100%)'}}>
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
                        data-testid="textarea-form-action-plan"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </>
          )}

          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-info mt-0.5" />
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRequestMutation.isPending}
              data-testid="button-submit-form"
              className="gradient-button-primary text-white font-semibold"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            >
              {createRequestMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
}
