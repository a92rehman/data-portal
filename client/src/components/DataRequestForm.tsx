import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Type definitions per requirements
interface Requester {
  name: string;
  email: string;
}

interface OrgInfo {
  department: string;
  team?: string;
}

type RequestType =
  | 'newDashboard' | 'modifyDashboard' | 'adhoc' | 'extraction'
  | 'bug' | 'bqaccess' | 'tracking' | 'metricChange'
  | 'pipelineChange' | 'recurringReport' | 'other';

interface Meta {
  requestType: RequestType;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  impact: 'Program Implementation' | 'Product Improvement' | 'Strategic Decision' | 'Content Improvement' | 'Others';
  deadline: string;
}

interface Usage {
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  duration?: string;
  unit?: 'days' | 'weeks' | 'months';
}

// Department teams mapping
const DEPARTMENT_TEAMS: Record<string, string[]> = {
  Program: ["Early Years", "Primary", "Secondary", "Other"],
  "P&C": ["Recruitment", "Training", "Performance", "Other"],
  Product: ["Mobile", "Web", "Backend", "Other"],
  LP: ["Content", "Curriculum", "Assessment", "Other"],
  Training: ["Teacher Training", "Parent Training", "Other"],
  ERP: ["Finance", "HR", "Operations", "Other"],
  Finance: ["Accounting", "Planning", "Other"],
  Leadership: ["Strategy", "Operations", "Other"],
  Strategy: ["Research", "Planning", "Other"],
  Other: []
};

export default function DataRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [teamOther, setTeamOther] = useState("");
  const [requestType, setRequestType] = useState<RequestType | "">("");
  const [priority, setPriority] = useState<Meta['priority'] | "">("");
  const [impact, setImpact] = useState<Meta['impact'] | "">("");
  const [deadline, setDeadline] = useState("");
  const [frequency, setFrequency] = useState<Usage['frequency'] | "">("");
  const [duration, setDuration] = useState("");
  const [unit, setUnit] = useState<Usage['unit'] | "">("");
  
  // Type-specific fields
  const [title, setTitle] = useState("");
  const [primaryQuestion, setPrimaryQuestion] = useState("");
  const [businessProblem, setBusinessProblem] = useState("");
  const [decisionAction, setDecisionAction] = useState("");
  const [metrics, setMetrics] = useState("");
  const [purpose, setPurpose] = useState("");
  const [datasetNames, setDatasetNames] = useState("");
  const [tableNames, setTableNames] = useState("");
  
  // BigQuery fields
  const [bqEmail, setBqEmail] = useState("");
  const [bqDatasets, setBqDatasets] = useState("");
  const [bqPurpose, setBqPurpose] = useState("");
  
  // Bug fields
  const [bugDescription, setBugDescription] = useState("");
  const [bugLocation, setBugLocation] = useState("");
  
  // Tracking fields
  const [trackingEvent, setTrackingEvent] = useState("");
  const [trackingPlatform, setTrackingPlatform] = useState("");
  const [trackingDetails, setTrackingDetails] = useState("");
  
  // Metric change fields
  const [metricName, setMetricName] = useState("");
  const [metricChangeType, setMetricChangeType] = useState("");
  const [metricReason, setMetricReason] = useState("");
  
  // Pipeline change fields
  const [pipelineName, setPipelineName] = useState("");
  const [pipelineChangeType, setPipelineChangeType] = useState("");
  const [pipelineDetails, setPipelineDetails] = useState("");
  
  // Dashboard fields
  const [dashboardAudience, setDashboardAudience] = useState("");
  const [filters, setFilters] = useState("");
  const [mockups, setMockups] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Auto-fill requester info from authenticated user
  useEffect(() => {
    if (user) {
      const userData = user as any;
      const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      setName(fullName || '');
      setEmail(userData.email || '');
      if (userData.department) {
        setDepartment(userData.department);
      }
    }
  }, [user]);
  
  // Reset team when department changes
  useEffect(() => {
    setTeam("");
    setTeamOther("");
  }, [department]);
  
  // Map our request types to database enum values
  const mapRequestType = (type: RequestType): string => {
    const mapping: Record<RequestType, string> = {
      'newDashboard': 'new_dashboard',
      'modifyDashboard': 'modify_dashboard',
      'adhoc': 'adhoc_analysis',
      'extraction': 'data_extraction',
      'bug': 'data_bug',
      'bqaccess': 'bq_access',
      'tracking': 'tracking',
      'metricChange': 'metric_change',
      'pipelineChange': 'pipeline_change',
      'recurringReport': 'recurring_report',
      'other': 'other'
    };
    return mapping[type];
  };
  
  // Map priority values
  const mapPriority = (p: string): string => {
    const mapping: Record<string, string> = {
      'P0': 'p0_critical',
      'P1': 'p1_high',
      'P2': 'p2_medium',
      'P3': 'p3_low'
    };
    return mapping[p] || p;
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Always required fields
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!department) newErrors.department = "Department is required";
    if (!requestType) newErrors.requestType = "Request type is required";
    if (!priority) newErrors.priority = "Priority is required";
    if (!impact) newErrors.impact = "Impact is required";
    if (!deadline) newErrors.deadline = "Deadline is required";
    if (!title.trim()) newErrors.title = "Project name is required";
    
    // Team validation
    if (team === 'Other' && !teamOther.trim()) {
      newErrors.teamOther = "Please specify your team";
    }
    
    // Frequency validation for specific types
    if (requestType && ['newDashboard', 'recurringReport'].includes(requestType)) {
      if (!frequency) newErrors.frequency = "Frequency is required for this request type";
      if (!duration) newErrors.duration = "Duration is required for this request type";
      if (!unit) newErrors.unit = "Unit is required for this request type";
    }
    
    // Type-specific validations
    if (requestType === 'bqaccess') {
      if (!bqEmail.trim()) newErrors.bqEmail = "Email for BigQuery access is required";
      if (!bqDatasets.trim()) newErrors.bqDatasets = "Datasets are required";
      if (!bqPurpose.trim()) newErrors.bqPurpose = "Purpose is required";
    }
    
    if (requestType === 'bug') {
      if (!bugDescription.trim()) newErrors.bugDescription = "Bug description is required";
      if (!bugLocation.trim()) newErrors.bugLocation = "Bug location is required";
    }
    
    // Decision action for specific types
    if (requestType && ['newDashboard', 'adhoc', 'metricChange'].includes(requestType)) {
      if (!decisionAction.trim()) newErrors.decisionAction = "Decision action is required for this request type";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Construct payload for existing API
      const payload = {
        title: title.trim(),
        type: mapRequestType(requestType as RequestType),
        priority: mapPriority(priority as string),
        department,
        team: team === 'Other' ? teamOther : team,
        dueDate: new Date(deadline).toISOString(),
        primaryQuestion,
        businessProblem,
        decisionAction,
        impact,
        frequency: frequency || undefined,
        frequencyDuration: duration ? parseInt(duration) : undefined,
        frequencyUnit: unit || undefined,
        // Type-specific fields
        bqEmail: requestType === 'bqaccess' ? bqEmail : undefined,
        bqDatasets: requestType === 'bqaccess' ? bqDatasets : undefined,
        bqPurpose: requestType === 'bqaccess' ? bqPurpose : undefined,
        bugDescription: requestType === 'bug' ? bugDescription : undefined,
        bugLocation: requestType === 'bug' ? bugLocation : undefined,
        trackingEvent: requestType === 'tracking' ? trackingEvent : undefined,
        trackingPlatform: requestType === 'tracking' ? trackingPlatform : undefined,
        trackingDetails: requestType === 'tracking' ? trackingDetails : undefined,
        metricName: requestType === 'metricChange' ? metricName : undefined,
        metricChangeType: requestType === 'metricChange' ? metricChangeType : undefined,
        metricReason: requestType === 'metricChange' ? metricReason : undefined,
        pipelineName: requestType === 'pipelineChange' ? pipelineName : undefined,
        pipelineChangeType: requestType === 'pipelineChange' ? pipelineChangeType : undefined,
        pipelineDetails: requestType === 'pipelineChange' ? pipelineDetails : undefined,
        dashboardAudience: requestType === 'newDashboard' ? dashboardAudience : undefined,
        keyMetrics: requestType === 'newDashboard' ? metrics : undefined,
        filters: requestType === 'newDashboard' ? filters : undefined,
        mockups: requestType === 'newDashboard' ? mockups : undefined,
      };
      
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit request');
      }
      
      // Success - reset form
      setTitle("");
      setRequestType("");
      setPriority("");
      setImpact("");
      setDeadline("");
      setTeam("");
      setTeamOther("");
      setFrequency("");
      setDuration("");
      setUnit("");
      setPrimaryQuestion("");
      setBusinessProblem("");
      setDecisionAction("");
      setMetrics("");
      setPurpose("");
      setDatasetNames("");
      setTableNames("");
      setBqEmail("");
      setBqDatasets("");
      setBqPurpose("");
      setBugDescription("");
      setBugLocation("");
      setTrackingEvent("");
      setTrackingPlatform("");
      setTrackingDetails("");
      setMetricName("");
      setMetricChangeType("");
      setMetricReason("");
      setPipelineName("");
      setPipelineChangeType("");
      setPipelineDetails("");
      setDashboardAudience("");
      setFilters("");
      setMockups("");
      setErrors({});
      
      toast({
        title: "Success",
        description: "Request submitted. We'll get back to you shortly.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const showFrequency = requestType && ['newDashboard', 'recurringReport', 'modifyDashboard'].includes(requestType);
  const showDecisionAction = requestType && ['newDashboard', 'adhoc', 'metricChange'].includes(requestType);
  
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
        New Data Request
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Requester Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Requester Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                data-testid="input-name"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                data-testid="input-email"
              />
              {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
            </div>
          </div>
        </Card>
        
        {/* Organization */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Organization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="department" data-testid="select-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DEPARTMENT_TEAMS).map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="text-sm text-destructive mt-1">{errors.department}</p>}
            </div>
            {department && DEPARTMENT_TEAMS[department]?.length > 0 && (
              <div>
                <Label htmlFor="team">Team</Label>
                <Select value={team} onValueChange={setTeam}>
                  <SelectTrigger id="team" data-testid="select-team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_TEAMS[department].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {team === 'Other' && (
              <div>
                <Label htmlFor="teamOther">Specify Team *</Label>
                <Input
                  id="teamOther"
                  value={teamOther}
                  onChange={(e) => setTeamOther(e.target.value)}
                  placeholder="Enter your team name"
                  data-testid="input-team-other"
                />
                {errors.teamOther && <p className="text-sm text-destructive mt-1">{errors.teamOther}</p>}
              </div>
            )}
          </div>
        </Card>
        
        {/* Request Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Request Details</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Name *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your request"
                data-testid="input-title"
              />
              {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="requestType">Request Type *</Label>
                <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
                  <SelectTrigger id="requestType" data-testid="select-request-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newDashboard">New Dashboard/Report</SelectItem>
                    <SelectItem value="modifyDashboard">Modify Dashboard/Report</SelectItem>
                    <SelectItem value="adhoc">Ad-hoc Analysis</SelectItem>
                    <SelectItem value="extraction">Data Extraction</SelectItem>
                    <SelectItem value="bug">Data Bug</SelectItem>
                    <SelectItem value="bqaccess">BigQuery Access</SelectItem>
                    <SelectItem value="tracking">Event Tracking</SelectItem>
                    <SelectItem value="metricChange">Metric Change</SelectItem>
                    <SelectItem value="pipelineChange">Pipeline Change</SelectItem>
                    <SelectItem value="recurringReport">Recurring Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.requestType && <p className="text-sm text-destructive mt-1">{errors.requestType}</p>}
              </div>
              
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Meta['priority'])}>
                  <SelectTrigger id="priority" data-testid="select-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0 - Critical</SelectItem>
                    <SelectItem value="P1">P1 - High</SelectItem>
                    <SelectItem value="P2">P2 - Medium</SelectItem>
                    <SelectItem value="P3">P3 - Low</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-sm text-destructive mt-1">{errors.priority}</p>}
              </div>
              
              <div>
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  data-testid="input-deadline"
                />
                {errors.deadline && <p className="text-sm text-destructive mt-1">{errors.deadline}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="impact">Impact *</Label>
              <Select value={impact} onValueChange={(v) => setImpact(v as Meta['impact'])}>
                <SelectTrigger id="impact" data-testid="select-impact">
                  <SelectValue placeholder="Select impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Program Implementation">Program Implementation</SelectItem>
                  <SelectItem value="Product Improvement">Product Improvement</SelectItem>
                  <SelectItem value="Strategic Decision">Strategic Decision</SelectItem>
                  <SelectItem value="Content Improvement">Content Improvement</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              {errors.impact && <p className="text-sm text-destructive mt-1">{errors.impact}</p>}
            </div>
            
            <div>
              <Label htmlFor="primaryQuestion">Primary Question</Label>
              <Textarea
                id="primaryQuestion"
                value={primaryQuestion}
                onChange={(e) => setPrimaryQuestion(e.target.value)}
                placeholder="What is the main question you want answered?"
                data-testid="textarea-primary-question"
              />
            </div>
            
            <div>
              <Label htmlFor="businessProblem">Business Problem</Label>
              <Textarea
                id="businessProblem"
                value={businessProblem}
                onChange={(e) => setBusinessProblem(e.target.value)}
                placeholder="What business problem are you trying to solve?"
                data-testid="textarea-business-problem"
              />
            </div>
            
            {showDecisionAction && (
              <div>
                <Label htmlFor="decisionAction">Decision/Action *</Label>
                <Textarea
                  id="decisionAction"
                  value={decisionAction}
                  onChange={(e) => setDecisionAction(e.target.value)}
                  placeholder="Which action or decision will you take after receiving this dashboard or analysis?"
                  data-testid="textarea-decision-action"
                />
                {errors.decisionAction && <p className="text-sm text-destructive mt-1">{errors.decisionAction}</p>}
              </div>
            )}
          </div>
        </Card>
        
        {/* Frequency (conditional) */}
        {showFrequency && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Usage Frequency</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Usage['frequency'])}>
                  <SelectTrigger id="frequency" data-testid="select-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.frequency && <p className="text-sm text-destructive mt-1">{errors.frequency}</p>}
              </div>
              
              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 6"
                  data-testid="input-duration"
                />
                {errors.duration && <p className="text-sm text-destructive mt-1">{errors.duration}</p>}
              </div>
              
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as Usage['unit'])}>
                  <SelectTrigger id="unit" data-testid="select-unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unit && <p className="text-sm text-destructive mt-1">{errors.unit}</p>}
              </div>
            </div>
          </Card>
        )}
        
        {/* Type-specific sections */}
        {requestType === 'bqaccess' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">BigQuery Access Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bqEmail">Email for Access *</Label>
                <Input
                  id="bqEmail"
                  type="email"
                  value={bqEmail}
                  onChange={(e) => setBqEmail(e.target.value)}
                  placeholder="user@company.com"
                  data-testid="input-bq-email"
                />
                {errors.bqEmail && <p className="text-sm text-destructive mt-1">{errors.bqEmail}</p>}
              </div>
              <div>
                <Label htmlFor="bqDatasets">Datasets *</Label>
                <Textarea
                  id="bqDatasets"
                  value={bqDatasets}
                  onChange={(e) => setBqDatasets(e.target.value)}
                  placeholder="List the datasets you need access to"
                  data-testid="textarea-bq-datasets"
                />
                {errors.bqDatasets && <p className="text-sm text-destructive mt-1">{errors.bqDatasets}</p>}
              </div>
              <div>
                <Label htmlFor="bqPurpose">Purpose *</Label>
                <Textarea
                  id="bqPurpose"
                  value={bqPurpose}
                  onChange={(e) => setBqPurpose(e.target.value)}
                  placeholder="Why do you need this access?"
                  data-testid="textarea-bq-purpose"
                />
                {errors.bqPurpose && <p className="text-sm text-destructive mt-1">{errors.bqPurpose}</p>}
              </div>
            </div>
          </Card>
        )}
        
        {requestType === 'bug' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Data Bug Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bugDescription">Bug Description *</Label>
                <Textarea
                  id="bugDescription"
                  value={bugDescription}
                  onChange={(e) => setBugDescription(e.target.value)}
                  placeholder="Describe the bug in detail"
                  data-testid="textarea-bug-description"
                />
                {errors.bugDescription && <p className="text-sm text-destructive mt-1">{errors.bugDescription}</p>}
              </div>
              <div>
                <Label htmlFor="bugLocation">Bug Location *</Label>
                <Input
                  id="bugLocation"
                  value={bugLocation}
                  onChange={(e) => setBugLocation(e.target.value)}
                  placeholder="Where is the bug located? (dashboard, report, etc.)"
                  data-testid="input-bug-location"
                />
                {errors.bugLocation && <p className="text-sm text-destructive mt-1">{errors.bugLocation}</p>}
              </div>
            </div>
          </Card>
        )}
        
        {requestType === 'tracking' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Event Tracking Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="trackingEvent">Event Name</Label>
                <Input
                  id="trackingEvent"
                  value={trackingEvent}
                  onChange={(e) => setTrackingEvent(e.target.value)}
                  placeholder="Name of the event to track"
                  data-testid="input-tracking-event"
                />
              </div>
              <div>
                <Label htmlFor="trackingPlatform">Platform</Label>
                <Input
                  id="trackingPlatform"
                  value={trackingPlatform}
                  onChange={(e) => setTrackingPlatform(e.target.value)}
                  placeholder="Web, Mobile, etc."
                  data-testid="input-tracking-platform"
                />
              </div>
              <div>
                <Label htmlFor="trackingDetails">Tracking Details</Label>
                <Textarea
                  id="trackingDetails"
                  value={trackingDetails}
                  onChange={(e) => setTrackingDetails(e.target.value)}
                  placeholder="Additional details about the tracking requirement"
                  data-testid="textarea-tracking-details"
                />
              </div>
            </div>
          </Card>
        )}
        
        {requestType === 'metricChange' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Metric Change Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="metricName">Metric Name</Label>
                <Input
                  id="metricName"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="Name of the metric"
                  data-testid="input-metric-name"
                />
              </div>
              <div>
                <Label htmlFor="metricChangeType">Change Type</Label>
                <Select value={metricChangeType} onValueChange={setMetricChangeType}>
                  <SelectTrigger id="metricChangeType" data-testid="select-metric-change-type">
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Metric</SelectItem>
                    <SelectItem value="modify">Modify Existing</SelectItem>
                    <SelectItem value="remove">Remove Metric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="metricReason">Reason for Change</Label>
                <Textarea
                  id="metricReason"
                  value={metricReason}
                  onChange={(e) => setMetricReason(e.target.value)}
                  placeholder="Why is this change needed?"
                  data-testid="textarea-metric-reason"
                />
              </div>
            </div>
          </Card>
        )}
        
        {requestType === 'pipelineChange' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Pipeline Change Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="pipelineName">Pipeline Name</Label>
                <Input
                  id="pipelineName"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  placeholder="Name of the pipeline"
                  data-testid="input-pipeline-name"
                />
              </div>
              <div>
                <Label htmlFor="pipelineChangeType">Change Type</Label>
                <Select value={pipelineChangeType} onValueChange={setPipelineChangeType}>
                  <SelectTrigger id="pipelineChangeType" data-testid="select-pipeline-change-type">
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Pipeline</SelectItem>
                    <SelectItem value="modify">Modify Existing</SelectItem>
                    <SelectItem value="fix">Fix Pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pipelineDetails">Change Details</Label>
                <Textarea
                  id="pipelineDetails"
                  value={pipelineDetails}
                  onChange={(e) => setPipelineDetails(e.target.value)}
                  placeholder="Describe the pipeline change"
                  data-testid="textarea-pipeline-details"
                />
              </div>
            </div>
          </Card>
        )}
        
        {requestType === 'newDashboard' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Dashboard Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dashboardAudience">Target Audience</Label>
                <Input
                  id="dashboardAudience"
                  value={dashboardAudience}
                  onChange={(e) => setDashboardAudience(e.target.value)}
                  placeholder="Who will use this dashboard?"
                  data-testid="input-dashboard-audience"
                />
              </div>
              <div>
                <Label htmlFor="metrics">Key Metrics</Label>
                <Textarea
                  id="metrics"
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                  placeholder="What metrics should be displayed?"
                  data-testid="textarea-metrics"
                />
              </div>
              <div>
                <Label htmlFor="filters">Filters</Label>
                <Textarea
                  id="filters"
                  value={filters}
                  onChange={(e) => setFilters(e.target.value)}
                  placeholder="What filters are needed?"
                  data-testid="textarea-filters"
                />
              </div>
              <div>
                <Label htmlFor="mockups">Mockups/Wireframes</Label>
                <Textarea
                  id="mockups"
                  value={mockups}
                  onChange={(e) => setMockups(e.target.value)}
                  placeholder="Describe or link to mockups"
                  data-testid="textarea-mockups"
                />
              </div>
            </div>
          </Card>
        )}
        
        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            data-testid="button-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
