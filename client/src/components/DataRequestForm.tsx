import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { DEPARTMENTS, TEAM_OPTIONS } from '@shared/constants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, Circle, HelpCircle, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Section({ 
  title, 
  children, 
  isOpen, 
  isCompleted = false,
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode; 
  isOpen: boolean;
  isCompleted?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`mb-6 border-2 rounded-xl shadow-sm transition-all ${
      isCompleted 
        ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-700' 
        : isOpen
        ? 'border-purple-300 bg-white dark:bg-gray-800 dark:border-purple-600'
        : 'border-gray-200 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700'
    }`}>
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors rounded-t-xl" 
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
          <h3 className={`font-semibold ${
            isCompleted 
              ? 'text-green-700 dark:text-green-400'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'
          }`}>{title}</h3>
        </div>
        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">{isOpen ? '▼ Hide' : '▶ Show'}</span>
      </div>
      {isOpen && <div className="px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

export default function DataRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [requestType, setRequestType] = useState('');
  const [department, setDepartment] = useState('');
  const [team, setTeam] = useState('');
  const [teamOther, setTeamOther] = useState('');
  const [requester, setRequester] = useState({ name: '', email: '', department: '' });
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [unit, setUnit] = useState('');
  const [priority, setPriority] = useState('');
  const [impact, setImpact] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Section visibility states - only ONE section open at a time
  const [section1Open, setSection1Open] = useState(true);
  const [section2Open, setSection2Open] = useState(false);
  
  // Track if user is manually editing (to prevent auto-jump)
  const [isManualEdit, setIsManualEdit] = useState(false);
  
  // Success dialog state
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  
  // Track section completion states
  const [section1Complete, setSection1Complete] = useState(false);
  const [section2Complete, setSection2Complete] = useState(false);
  
  // Track if user has interacted with frequency fields
  const [frequencyInteracted, setFrequencyInteracted] = useState(false);

  // State for all type-specific fields
  const [businessQuestion, setBusinessQuestion] = useState('');
  const [keyMetrics, setKeyMetrics] = useState('');
  const [dashboardAudience, setDashboardAudience] = useState('');
  const [decisionAction, setDecisionAction] = useState('');
  const [dashboardModification, setDashboardModification] = useState('');
  const [exactChanges, setExactChanges] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [datasets, setDatasets] = useState('');
  const [dataExtraction, setDataExtraction] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugLocation, setBugLocation] = useState('');
  const [bqEmail, setBqEmail] = useState('');
  const [bqDatasets, setBqDatasets] = useState('');
  const [bqPurpose, setBqPurpose] = useState('');
  const [trackingFeature, setTrackingFeature] = useState('');
  const [trackingTrigger, setTrackingTrigger] = useState('');
  const [metricName, setMetricName] = useState('');
  const [currentDefinition, setCurrentDefinition] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [pipelineDataset, setPipelineDataset] = useState('');
  const [pipelineModification, setPipelineModification] = useState('');
  const [reportMetrics, setReportMetrics] = useState('');
  const [otherDescription, setOtherDescription] = useState('');
  const [experimentDescription, setExperimentDescription] = useState('');
  const [experimentDocLink, setExperimentDocLink] = useState('');
  
  // User Investigation fields
  const [investigationPurpose, setInvestigationPurpose] = useState('');
  const [userName, setUserName] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [userProfileId, setUserProfileId] = useState('');
  const [userId, setUserId] = useState('');
  const [schoolEmisCode, setSchoolEmisCode] = useState('');
  
  // Training fields
  const [trainingTopic, setTrainingTopic] = useState('');
  const [trainingHours, setTrainingHours] = useState('');
  
  // Experimentation fields
  const [experimentSubType, setExperimentSubType] = useState('');
  const [experimentProblem, setExperimentProblem] = useState('');
  const [experimentFileLink, setExperimentFileLink] = useState('');
  const [experimentAnalysisType, setExperimentAnalysisType] = useState('');
  const [experimentDatasetLink, setExperimentDatasetLink] = useState('');
  const [experimentImplementationType, setExperimentImplementationType] = useState('');
  const [experimentOtherDetails, setExperimentOtherDetails] = useState('');


  useEffect(() => {
    try {
      // Get from authenticated user first
      const userData = user as any;
      if (userData) {
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        setRequester({
          name: fullName || '',
          email: userData.email || '',
          department: userData.department || ''
        });
        if (userData.department) setDepartment(userData.department);
      } else {
        // Fallback to localStorage and window objects
        const stored = JSON.parse(localStorage.getItem('requesterInfo') || '{}');
        const appUser: any = (window as any)?.REPLIT?.user || (window as any)?.APP_USER || {};
        const inferred = {
          name: appUser.name || appUser.fullName || stored.name || '',
          email: appUser.email || stored.email || '',
          department: stored.department || ''
        };
        setRequester(inferred);
        if (stored.department) setDepartment(stored.department);
      }
    } catch (_) {}
  }, [user]);

  useEffect(() => {
    localStorage.setItem('requesterInfo', JSON.stringify({ ...requester, department }));
  }, [requester, department]);

  useEffect(() => {
    setTeam('');
    setTeamOther('');
  }, [department]);

  // Reset frequency interaction when request type changes
  useEffect(() => {
    setFrequencyInteracted(false);
  }, [requestType]);

  // Auto-expand/collapse sections based on completion - only when NOT manually editing
  useEffect(() => {
    // Check if section 1 is complete
    const isSection1Complete = !!(requester.name && requester.email && department && requestType && deadline && priority && impact);
    setSection1Complete(isSection1Complete);
    
    // Skip auto-progression if user is manually editing
    if (isManualEdit) return;
    
    if (isSection1Complete) {
      // Auto-collapse section 1 and auto-open section 2
      setSection1Open(false);
      setSection2Open(true);
    } else {
      // Keep section 1 open if not complete
      setSection1Open(true);
      setSection2Open(false);
    }
  }, [requester.name, requester.email, department, requestType, deadline, priority, impact, isManualEdit]);

  // Check if section 2 (type-specific fields) is complete
  useEffect(() => {
    if (!requestType) {
      setSection2Complete(false);
      return;
    }
    
    let isSection2Complete = false;
    
    switch (requestType) {
      case 'newDashboard':
        // For newDashboard, check if frequency fields have been interacted with
        isSection2Complete = !!(businessQuestion && keyMetrics && dashboardAudience && decisionAction && frequencyInteracted);
        break;
      case 'modifyDashboard':
        isSection2Complete = !!(dashboardModification && exactChanges && decisionAction);
        break;
      case 'adhoc':
        isSection2Complete = !!(hypothesis && datasets && decisionAction);
        break;
      case 'extraction':
        isSection2Complete = !!(dataExtraction && fileFormat);
        break;
      case 'bug':
        isSection2Complete = !!(bugDescription && bugLocation);
        break;
      case 'bqaccess':
        isSection2Complete = !!(bqEmail && bqDatasets && bqPurpose);
        break;
      case 'tracking':
        isSection2Complete = !!(trackingFeature && trackingTrigger);
        break;
      case 'metricChange':
        isSection2Complete = !!(metricName && currentDefinition && newDefinition && decisionAction);
        break;
      case 'pipelineChange':
        isSection2Complete = !!(pipelineDataset && pipelineModification);
        break;
      case 'recurringReport':
        // For recurringReport, check if frequency fields have been interacted with
        isSection2Complete = !!(reportMetrics && decisionAction && frequencyInteracted);
        break;
      case 'userInvestigation':
        isSection2Complete = !!(investigationPurpose && userName && userMobile && schoolEmisCode);
        break;
      case 'training':
        isSection2Complete = !!(trainingTopic && trainingHours);
        break;
      case 'experimentation':
        isSection2Complete = !!(experimentSubType && (
          (experimentSubType === 'design_new' && experimentProblem) ||
          (experimentSubType === 'review' && experimentFileLink) ||
          (experimentSubType === 'analysis' && experimentAnalysisType && experimentDatasetLink) ||
          (experimentSubType === 'implementation' && experimentImplementationType) ||
          (experimentSubType === 'other' && experimentOtherDetails)
        ));
        break;
      case 'other':
        isSection2Complete = !!otherDescription;
        break;
    }
    
    setSection2Complete(isSection2Complete);
    
    // Note: Section 2 no longer auto-collapses to avoid interrupting users while typing
    // Users can manually collapse sections as needed
  }, [
    requestType, businessQuestion, keyMetrics, dashboardAudience, decisionAction,
    dashboardModification, exactChanges, hypothesis, datasets, dataExtraction,
    fileFormat, bugDescription, bugLocation, bqEmail, bqDatasets, bqPurpose,
    trackingFeature, trackingTrigger, metricName, currentDefinition, newDefinition,
    pipelineDataset, pipelineModification, reportMetrics, otherDescription, isManualEdit,
    frequencyInteracted, experimentDescription, experimentDocLink,
    investigationPurpose, userName, userMobile, schoolEmisCode,
    trainingTopic, trainingHours,
    experimentSubType, experimentProblem, experimentFileLink, experimentAnalysisType,
    experimentDatasetLink, experimentImplementationType, experimentOtherDetails
  ]);


  // Map request types to database enum
  const mapRequestType = (type: string): string => {
    const mapping: Record<string, string> = {
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
      'userInvestigation': 'user_investigation',
      'training': 'training',
      'experimentation': 'experimentation',
      'other': 'other'
    };
    return mapping[type] || type;
  };

  const mapPriority = (p: string): string => {
    const mapping: Record<string, string> = {
      'P0': 'p0_critical',
      'P1': 'p1_high',
      'P2': 'p2_medium',
      'P3': 'p3_low'
    };
    return mapping[p] || p;
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!requester.name || !requester.email || !department || !requestType || !priority || !impact || !deadline) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (name, email, department, request type, priority, impact, deadline)",
        variant: "destructive",
      });
      return;
    }

    if (team === 'Other' && !teamOther) {
      toast({
        title: "Validation Error",
        description: "Please specify your team name",
        variant: "destructive",
      });
      return;
    }

    // Type-specific validation
    let missingFields: string[] = [];
    
    switch (requestType) {
      case 'newDashboard':
        if (!businessQuestion) missingFields.push("business question");
        if (!keyMetrics) missingFields.push("key metrics");
        if (!dashboardAudience) missingFields.push("dashboard audience");
        if (!decisionAction) missingFields.push("decision/action");
        if (frequency && (!duration || !unit)) missingFields.push("frequency duration and unit");
        break;
      case 'modifyDashboard':
        if (!dashboardModification) missingFields.push("dashboard modification details");
        if (!exactChanges) missingFields.push("exact changes required");
        if (!decisionAction) missingFields.push("decision/action");
        break;
      case 'adhoc':
        if (!hypothesis) missingFields.push("hypothesis/question");
        if (!datasets) missingFields.push("datasets/dimensions");
        if (!decisionAction) missingFields.push("decision/action");
        break;
      case 'extraction':
        if (!dataExtraction) missingFields.push("data extraction details");
        if (!fileFormat) missingFields.push("file format");
        break;
      case 'bug':
        if (!bugDescription) missingFields.push("bug description");
        if (!bugLocation) missingFields.push("bug location");
        break;
      case 'bqaccess':
        if (!bqEmail) missingFields.push("BigQuery email");
        if (!bqDatasets) missingFields.push("datasets/tables");
        if (!bqPurpose) missingFields.push("purpose of access");
        break;
      case 'tracking':
        if (!trackingFeature) missingFields.push("feature/event to track");
        if (!trackingTrigger) missingFields.push("tracking trigger");
        break;
      case 'metricChange':
        if (!metricName) missingFields.push("metric name");
        if (!currentDefinition) missingFields.push("current definition");
        if (!newDefinition) missingFields.push("new definition");
        if (!decisionAction) missingFields.push("decision/action");
        break;
      case 'pipelineChange':
        if (!pipelineDataset) missingFields.push("dataset/table");
        if (!pipelineModification) missingFields.push("modification details");
        break;
      case 'recurringReport':
        if (!reportMetrics) missingFields.push("report metrics");
        if (!decisionAction) missingFields.push("decision/action");
        if (frequency && (!duration || !unit)) missingFields.push("frequency duration and unit");
        break;
      case 'userInvestigation':
        if (!investigationPurpose) missingFields.push("investigation purpose");
        if (!userName) missingFields.push("user/teacher name");
        if (!userMobile) missingFields.push("mobile number");
        if (!schoolEmisCode) missingFields.push("school EMIS code");
        break;
      case 'training':
        if (!trainingTopic) missingFields.push("training topic");
        if (!trainingHours) missingFields.push("training hours");
        break;
      case 'experimentation':
        if (!experimentSubType) missingFields.push("experimentation type");
        if (experimentSubType === 'design_new' && !experimentProblem) missingFields.push("problem description");
        if (experimentSubType === 'review' && !experimentFileLink) missingFields.push("experiment file/link");
        if (experimentSubType === 'analysis' && !experimentAnalysisType) missingFields.push("analysis type");
        if (experimentSubType === 'analysis' && !experimentDatasetLink) missingFields.push("dataset link");
        if (experimentSubType === 'implementation' && !experimentImplementationType) missingFields.push("implementation type");
        if (experimentSubType === 'other' && !experimentOtherDetails) missingFields.push("request details");
        break;
      case 'other':
        if (!otherDescription) missingFields.push("request description");
        break;
    }

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build payload for backend
      const payload: any = {
        title: `${requestType} - ${requester.name}`,
        type: mapRequestType(requestType),
        priority: mapPriority(priority),
        department,
        team: team === 'Other' ? teamOther : team,
        dueDate: new Date(deadline).toISOString(),
        impact,
        frequency: frequency || undefined,
        frequencyDuration: duration ? parseInt(duration) : undefined,
        frequencyUnit: unit || undefined,
      };

      // Add type-specific fields
      switch (requestType) {
        case 'newDashboard':
          payload.primaryQuestion = businessQuestion;
          payload.keyMetrics = keyMetrics;
          payload.dashboardAudience = dashboardAudience;
          payload.decisionAction = decisionAction;
          break;
        case 'modifyDashboard':
          payload.primaryQuestion = dashboardModification;
          payload.businessProblem = exactChanges;
          payload.decisionAction = decisionAction;
          break;
        case 'adhoc':
          payload.primaryQuestion = hypothesis;
          payload.businessProblem = datasets;
          payload.decisionAction = decisionAction;
          break;
        case 'extraction':
          payload.primaryQuestion = dataExtraction;
          payload.businessProblem = fileFormat;
          break;
        case 'bug':
          payload.bugDescription = bugDescription;
          payload.bugLocation = bugLocation;
          break;
        case 'bqaccess':
          payload.bqEmail = bqEmail;
          payload.bqDatasets = bqDatasets;
          payload.bqPurpose = bqPurpose;
          break;
        case 'tracking':
          payload.trackingEvent = trackingFeature;
          payload.trackingDetails = trackingTrigger;
          break;
        case 'metricChange':
          payload.metricName = metricName;
          payload.businessProblem = currentDefinition;
          payload.primaryQuestion = newDefinition;
          payload.decisionAction = decisionAction;
          break;
        case 'pipelineChange':
          payload.pipelineName = pipelineDataset;
          payload.pipelineDetails = pipelineModification;
          break;
        case 'recurringReport':
          payload.primaryQuestion = reportMetrics;
          payload.decisionAction = decisionAction;
          break;
        case 'userInvestigation':
          payload.investigationPurpose = investigationPurpose;
          payload.userName = userName;
          payload.userMobile = userMobile;
          payload.userProfileId = userProfileId || undefined;
          payload.userId = userId || undefined;
          payload.schoolEmisCode = schoolEmisCode;
          break;
        case 'training':
          payload.trainingTopic = trainingTopic;
          payload.trainingHours = trainingHours ? parseFloat(trainingHours) : undefined;
          break;
        case 'experimentation':
          payload.experimentSubType = experimentSubType;
          if (experimentSubType === 'design_new') {
            payload.experimentDetails = JSON.stringify({
              problem: experimentProblem,
              successMetrics: experimentSuccessMetrics,
              timeline: experimentTimeline
            });
          } else if (experimentSubType === 'review') {
            payload.experimentDetails = JSON.stringify({
              fileLink: experimentFileLink,
              reviewFocus: experimentReviewFocus
            });
          } else if (experimentSubType === 'analysis') {
            payload.experimentDetails = JSON.stringify({
              analysisType: experimentAnalysisType,
              datasetLink: experimentDatasetLink,
              hypothesis: experimentHypothesis
            });
          } else if (experimentSubType === 'implementation') {
            payload.experimentDetails = JSON.stringify({
              implementationType: experimentImplementationType,
              platform: experimentPlatform
            });
          } else if (experimentSubType === 'other') {
            payload.experimentDetails = JSON.stringify({
              details: experimentOtherDetails
            });
          }
          break;
        case 'other':
          payload.primaryQuestion = otherDescription;
          break;
      }

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

      // Success - show the success dialog with "What's Next" content
      setShowSuccessDialog(true);

      // Reset all fields and sections
      setRequestType('');
      setTeam('');
      setTeamOther('');
      setFrequency('');
      setDuration('');
      setUnit('');
      setPriority('');
      setImpact('');
      setDeadline('');
      setBusinessQuestion('');
      setKeyMetrics('');
      setDashboardAudience('');
      setDecisionAction('');
      setDashboardModification('');
      setExactChanges('');
      setHypothesis('');
      setDatasets('');
      setDataExtraction('');
      setFileFormat('');
      setBugDescription('');
      setBugLocation('');
      setBqEmail('');
      setBqDatasets('');
      setBqPurpose('');
      setTrackingFeature('');
      setTrackingTrigger('');
      setMetricName('');
      setCurrentDefinition('');
      setNewDefinition('');
      setPipelineDataset('');
      setPipelineModification('');
      setReportMetrics('');
      setOtherDescription('');
      setExperimentDescription('');
      setExperimentDocLink('');
      setInvestigationPurpose('');
      setUserName('');
      setUserMobile('');
      setUserProfileId('');
      setUserId('');
      setSchoolEmisCode('');
      setTrainingTopic('');
      setTrainingHours('');
      setExperimentSubType('');
      setExperimentProblem('');
      setExperimentSuccessMetrics('');
      setExperimentTimeline('');
      setExperimentFileLink('');
      setExperimentReviewFocus('');
      setExperimentAnalysisType('');
      setExperimentDatasetLink('');
      setExperimentHypothesis('');
      setExperimentImplementationType('');
      setExperimentPlatform('');
      setExperimentOtherDetails('');
      
      // Reset section visibility, manual edit mode, and frequency interaction
      setSection1Open(true);
      setSection2Open(false);
      setIsManualEdit(false);
      setFrequencyInteracted(false);
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

  const renderFrequencyFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
      <div>
        <label className="text-sm">Frequency *</label>
        <select 
          className="w-full mt-1 border rounded-md p-2" 
          value={frequency} 
          onChange={(e) => {
            setFrequency(e.target.value);
            setFrequencyInteracted(true);
          }}
          onFocus={() => setFrequencyInteracted(true)}
        >
          <option value="">Select Frequency</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </select>
      </div>
      <div>
        <label className="text-sm">Duration *</label>
        <Input placeholder="2" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label className="text-sm">Unit *</label>
        <select className="w-full mt-1 border rounded-md p-2" value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="">Unit</option>
          <option value="days">Days</option>
          <option value="weeks">Weeks</option>
          <option value="months">Months</option>
        </select>
      </div>
    </div>
  );

  const renderCommonDecisionField = () => (
    <div className="mb-3">
      <label className="text-sm font-medium">Decision/Action *</label>
      <Textarea 
        placeholder="Which action or decision will you take after receiving this dashboard or analysis?" 
        className="mt-1" 
        value={decisionAction}
        onChange={(e) => setDecisionAction(e.target.value)}
      />
    </div>
  );

  const renderByType = () => {
    switch (requestType) {
      case 'newDashboard':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Business Question *</label>
              <Textarea placeholder="What business question or goal will this dashboard address?" className="mt-1" value={businessQuestion} onChange={(e) => setBusinessQuestion(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Key Metrics *</label>
              <Textarea placeholder="What key metrics or visuals do you want to track?" className="mt-1" value={keyMetrics} onChange={(e) => setKeyMetrics(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Dashboard Audience *</label>
              <Textarea placeholder="Who will be using this dashboard and how often?" className="mt-1" value={dashboardAudience} onChange={(e) => setDashboardAudience(e.target.value)} />
            </div>
            {renderCommonDecisionField()}
            {renderFrequencyFields()}
          </>
        );
      case 'modifyDashboard':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Dashboard Modification *</label>
              <Textarea placeholder="Which dashboard needs modification and why?" className="mt-1" value={dashboardModification} onChange={(e) => setDashboardModification(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Exact Changes Required *</label>
              <Textarea placeholder="What exact changes are required (filters, visuals, new metrics)?" className="mt-1" value={exactChanges} onChange={(e) => setExactChanges(e.target.value)} />
            </div>
            {renderCommonDecisionField()}
          </>
        );
      case 'adhoc':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Hypothesis/Question *</label>
              <Textarea placeholder="What is the main hypothesis or question this analysis should answer?" className="mt-1" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Datasets/Dimensions *</label>
              <Textarea placeholder="What datasets or dimensions should be included?" className="mt-1" value={datasets} onChange={(e) => setDatasets(e.target.value)} />
            </div>
            {renderCommonDecisionField()}
          </>
        );
      case 'extraction':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Data Extraction Details *</label>
              <Textarea placeholder="What specific data do you need extracted? (e.g., teacher list, school visits)" className="mt-1" value={dataExtraction} onChange={(e) => setDataExtraction(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">File Format *</label>
              <select className="w-full mt-1 border rounded-md p-2" value={fileFormat} onChange={(e) => setFileFormat(e.target.value)}>
                <option value="">Select format</option>
                <option value="CSV">CSV</option>
                <option value="Excel">Excel</option>
                <option value="JSON">JSON</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
          </>
        );
      case 'bug':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Bug Description *</label>
              <Textarea placeholder="Describe the issue or incorrect data you found" className="mt-1" value={bugDescription} onChange={(e) => setBugDescription(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Bug Location *</label>
              <Textarea placeholder="Where did you notice this issue? (Dashboard name or table)" className="mt-1" value={bugLocation} onChange={(e) => setBugLocation(e.target.value)} />
            </div>
          </>
        );
      case 'bqaccess':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">BigQuery Email *</label>
              <Input placeholder="BigQuery email to grant access" className="mt-1" value={bqEmail} onChange={(e) => setBqEmail(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Datasets/Tables *</label>
              <Textarea placeholder="Which datasets/tables do you need access to?" className="mt-1" value={bqDatasets} onChange={(e) => setBqDatasets(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Purpose of Access *</label>
              <Textarea placeholder="Purpose of access (e.g., analysis, QA)" className="mt-1" value={bqPurpose} onChange={(e) => setBqPurpose(e.target.value)} />
            </div>
          </>
        );
      case 'tracking':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Feature/Event to Track *</label>
              <Textarea placeholder="Which feature or event do you want to track?" className="mt-1" value={trackingFeature} onChange={(e) => setTrackingFeature(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium">Tracking Trigger *</label>
              <Textarea placeholder="What should trigger the tracking event?" className="mt-1" value={trackingTrigger} onChange={(e) => setTrackingTrigger(e.target.value)} />
            </div>
          </>
        );
      case 'userInvestigation':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">What is the purpose of this investigation? *</label>
              <Textarea placeholder="Example: verify attendance data, check missing visit logs, confirm the teacher's appearance and activity" className="mt-1" rows={3} value={investigationPurpose} onChange={(e) => setInvestigationPurpose(e.target.value)} />
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Please provide identification details:</p>
              <div>
                <label className="text-sm font-medium">User/Teacher Name *</label>
                <Input placeholder="Full name of the user" className="mt-1" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Mobile Number *</label>
                <Input placeholder="e.g., +92 300 1234567" className="mt-1" value={userMobile} onChange={(e) => setUserMobile(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Profile ID (Optional)</label>
                  <Input placeholder="Profile ID" className="mt-1" value={userProfileId} onChange={(e) => setUserProfileId(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">User ID (Optional)</label>
                  <Input placeholder="User ID" className="mt-1" value={userId} onChange={(e) => setUserId(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">School EMIS Code *</label>
                <Input placeholder="School EMIS Code" className="mt-1" value={schoolEmisCode} onChange={(e) => setSchoolEmisCode(e.target.value)} />
              </div>
            </div>
          </>
        );
      case 'training':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">What skill or topic do you want to learn or strengthen? *</label>
              <Textarea placeholder="Example: Using dashboards, extracting data from BigQuery, interpreting engagement metrics" className="mt-1" rows={3} value={trainingTopic} onChange={(e) => setTrainingTopic(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">How many hours of basic training do you require? *</label>
              <Input type="number" step="0.5" min="0.5" placeholder="Example: 1 hour for using dashboards, 2 hours for running queries in BQ" className="mt-1" value={trainingHours} onChange={(e) => setTrainingHours(e.target.value)} />
            </div>
          </>
        );
      case 'experimentation':
        return (
          <>
            <div className="mb-3">
              <label className="text-sm font-medium">Type of Experimentation Support *</label>
              <select className="w-full mt-1 border rounded-md p-2 dark:bg-gray-800 dark:border-gray-600" value={experimentSubType} onChange={(e) => setExperimentSubType(e.target.value)}>
                <option value="">-- Select type --</option>
                <option value="design_new">Support in Designing a New Experiment</option>
                <option value="review">Review the Experiment</option>
                <option value="analysis">Support in Analysis</option>
                <option value="implementation">Support in Implementation</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {experimentSubType === 'design_new' && (
              <div className="mb-3">
                <label className="text-sm font-medium">Explain the problem you are trying to solve and its expected impact *</label>
                <Textarea placeholder="Describe the problem, hypothesis, and expected impact..." className="mt-1" rows={4} value={experimentProblem} onChange={(e) => setExperimentProblem(e.target.value)} />
              </div>
            )}
            
            {experimentSubType === 'review' && (
              <div className="mb-3">
                <label className="text-sm font-medium">Attach the experiment file or link for review *</label>
                <Input placeholder="Paste link to Google Doc, Notion page, or file" className="mt-1" value={experimentFileLink} onChange={(e) => setExperimentFileLink(e.target.value)} />
              </div>
            )}
            
            {experimentSubType === 'analysis' && (
              <>
                <div className="mb-3">
                  <label className="text-sm font-medium">What kind of analysis support do you require? *</label>
                  <Textarea placeholder="Example: cleaning data, running comparisons, visualization, interpreting results" className="mt-1" rows={3} value={experimentAnalysisType} onChange={(e) => setExperimentAnalysisType(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="text-sm font-medium">Attach the dataset and include a short note explaining the variables *</label>
                  <Textarea placeholder="Paste link to dataset and explain the key variables..." className="mt-1" rows={3} value={experimentDatasetLink} onChange={(e) => setExperimentDatasetLink(e.target.value)} />
                </div>
              </>
            )}
            
            {experimentSubType === 'implementation' && (
              <div className="mb-3">
                <label className="text-sm font-medium">What type of implementation support do you require and why? *</label>
                <Textarea placeholder="Example: help with randomization, monitoring rollout, data tracking setup, etc." className="mt-1" rows={4} value={experimentImplementationType} onChange={(e) => setExperimentImplementationType(e.target.value)} />
              </div>
            )}
            
            {experimentSubType === 'other' && (
              <div className="mb-3">
                <label className="text-sm font-medium">Explain your request briefly *</label>
                <Textarea placeholder="Describe what you need help with..." className="mt-1" rows={4} value={experimentOtherDetails} onChange={(e) => setExperimentOtherDetails(e.target.value)} />
              </div>
            )}
          </>
        );
      case 'other':
        return (
          <div className="mb-3">
            <label className="text-sm font-medium">Request Description *</label>
            <Textarea placeholder="Describe your request in detail" className="mt-1" value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} />
          </div>
        );
      default:
        return <p className="text-sm text-gray-600">Select a request type above to see the relevant fields.</p>;
    }
  };

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 flex justify-center min-h-screen">
        <Card className="w-full max-w-3xl shadow-xl border-2 border-purple-200 dark:border-purple-700">
          <CardContent className="p-4 md:p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">Data Request Form</h2>
            
            {/* Progress Indicator */}
            <div className="mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  {section1Complete ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-xs md:text-sm ${section1Complete ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Basic Info
                  </span>
                </div>
                <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1" />
                <div className="flex items-center gap-2 flex-1">
                  {section2Complete ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-xs md:text-sm ${section2Complete ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    Request Details
                  </span>
                </div>
              </div>
            </div>
            
            <Section 
              title="1) Requester Info & Request Type" 
              isOpen={section1Open}
              isCompleted={section1Complete}
            onToggle={() => {
              const newState = !section1Open;
              setSection1Open(newState);
              if (newState) {
                // User manually opened section 1 - enable manual edit mode and close others
                setIsManualEdit(true);
                setSection2Open(false);
              } else {
                // User closed section 1 - disable manual edit mode
                setIsManualEdit(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input 
                  placeholder="Your Name" 
                  value={requester.name} 
                  onChange={(e) => setRequester({ ...requester, name: e.target.value })} 
                  className="mt-1 bg-gray-100 dark:bg-gray-800" 
                  disabled 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input 
                  placeholder="you@org.org" 
                  value={requester.email} 
                  onChange={(e) => setRequester({ ...requester, email: e.target.value })} 
                  className="mt-1 bg-gray-100 dark:bg-gray-800" 
                  disabled 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Department *</label>
                <select className="w-full mt-1 border rounded-md p-2" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">-- Select department --</option>
                  {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              {department && TEAM_OPTIONS[department] && (
                <div>
                  <label className="text-sm font-medium">Team</label>
                  <select className="w-full mt-1 border rounded-md p-2" value={team} onChange={(e) => setTeam(e.target.value)}>
                    <option value="">-- Select team --</option>
                    {TEAM_OPTIONS[department].map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
              )}
              {team === 'Other' && (
                <div>
                  <label className="text-sm font-medium">Specify Team *</label>
                  <Input placeholder="Team name" value={teamOther} onChange={(e) => setTeamOther(e.target.value)} className="mt-1" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Request Type *</label>
                <select className="w-full mt-1 border rounded-md p-2 dark:bg-gray-800 dark:border-gray-600" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  <option value="">-- Choose Type --</option>
                  <option value="userInvestigation">👤 User Investigation - Verify user data, check activity logs</option>
                  <option value="extraction">📊 One-time Data Request - Export data as CSV/Excel</option>
                  <option value="bqaccess">🔐 BigQuery/Tool Access - Request database or tool access</option>
                  <option value="bug">🐛 Data Bug/Data Quality Issue - Report data inconsistencies</option>
                  <option value="adhoc">📈 Ad-hoc Analysis - Deep-dive analysis on specific question</option>
                  <option value="modifyDashboard">✏️ Modification to Existing Dashboard - Update existing reports</option>
                  <option value="newDashboard">📋 New Dashboard - Create new reports or visualizations</option>
                  <option value="training">🎓 Training (Capacity Building) - Learn data tools and skills</option>
                  <option value="experimentation">🔬 Experimentation - Design, review, or analyze experiments</option>
                  <option value="other">📝 Other - Any other data-related request</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Deadline *</label>
                <Input type="date" placeholder="DD/MM/YYYY" className="mt-1" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Priority Level *</label>
                  <select className="w-full mt-1 border rounded-md p-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="">Select priority...</option>
                    <option value="P0">P0 - Critical (Imminent business decision/launch)</option>
                    <option value="P1">P1 - High (Key business decisions)</option>
                    <option value="P2">P2 - Medium (Important for planning)</option>
                    <option value="P3">P3 - Low (General curiosity, future planning)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Impact *</label>
                  <select className="w-full mt-1 border rounded-md p-2" value={impact} onChange={(e) => setImpact(e.target.value)}>
                    <option value="">Select impact...</option>
                    <option value="Program Implementation">Program Implementation</option>
                    <option value="Product Improvement">Product Improvement</option>
                    <option value="Strategic Decision">Strategic Decision</option>
                    <option value="Content Improvement">Content Improvement</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section 
            title="2) Request Details" 
            isOpen={section2Open}
            isCompleted={section2Complete}
            onToggle={() => {
              const newState = !section2Open;
              setSection2Open(newState);
              if (newState) {
                // User manually opened section 2 - enable manual edit mode and close others
                setIsManualEdit(true);
                setSection1Open(false);
              } else {
                // User closed section 2 - disable manual edit mode
                setIsManualEdit(false);
              }
            }}
          >
            {renderByType()}
          </Section>

          {/* Action Buttons - Always Visible */}
          <div className="mt-6 pt-5 border-t-2 border-purple-100 dark:border-purple-900/30">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button 
                className="sm:flex-initial px-8 py-3 gradient-button-primary text-white font-semibold rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleSubmit} 
                disabled={isSubmitting || !section1Complete || !section2Complete}
                data-testid="button-submit-request"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button 
                variant="outline" 
                className="sm:flex-initial px-8 py-3 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 font-medium rounded-lg transition-all" 
                onClick={() => setRequestType('')}
                data-testid="button-reset-form"
              >
                Reset Form
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Success Dialog with What's Next */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Request Submitted Successfully! 🎉
              </DialogTitle>
              <DialogDescription>
                Your data request has been submitted successfully. Follow the steps below to understand what happens next.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Review by Data Lead</h4>
                  <p className="text-sm text-muted-foreground">Your request will be reviewed by the Data Lead team. They will assess priority, feasibility, and assign it to the right analyst.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Assignment to Analyst</h4>
                  <p className="text-sm text-muted-foreground">Once approved, your request will be assigned to a data analyst who will begin working on it.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Collaboration & Updates</h4>
                  <p className="text-sm text-muted-foreground">You'll receive notifications and can track progress in your dashboard. Feel free to add comments or ask questions anytime.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="mt-1 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">4</div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Delivery</h4>
                  <p className="text-sm text-muted-foreground">The analyst will deliver the results according to your requirements. You'll be notified once your request is completed.</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              className="w-full gradient-button-primary text-white font-semibold"
              onClick={() => {
                setShowSuccessDialog(false);
                setLocation('/');
              }}
              data-testid="button-ok-return-dashboard"
            >
              OK - Return to Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
