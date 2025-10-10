import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div className="mb-6 border rounded-xl bg-white">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm opacity-70">{isOpen ? 'Hide' : 'Show'}</span>
      </div>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function DataRequestForm() {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const DEPARTMENTS = [
    'Learning Engineering',
    'Program',
    'People and Culture',
    'Admin',
    'Business Development',
    'Fundraising',
    'Strategy'
  ];

  const TEAM_OPTIONS: Record<string, string[]> = {
    'Learning Engineering': ['Lesson Plan', 'Training', 'FICO', 'ERP', 'Other'],
    Program: ['FDS', 'Data & Impact', 'Other']
  };

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
    // Validation
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

      // Success - reset form
      toast({
        title: "Success",
        description: "Request submitted. We'll get back to you shortly.",
      });

      // Reset all fields
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
        <select className="w-full mt-1 border rounded-md p-2" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
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
    <Textarea 
      placeholder="Which action or decision will you take after receiving this dashboard or analysis?" 
      className="mb-3" 
      value={decisionAction}
      onChange={(e) => setDecisionAction(e.target.value)}
    />
  );

  const renderByType = () => {
    switch (requestType) {
      case 'newDashboard':
        return (
          <>
            <Textarea placeholder="What business question or goal will this dashboard address?" className="mb-3" value={businessQuestion} onChange={(e) => setBusinessQuestion(e.target.value)} />
            <Textarea placeholder="What key metrics or visuals do you want to track?" className="mb-3" value={keyMetrics} onChange={(e) => setKeyMetrics(e.target.value)} />
            <Textarea placeholder="Who will be using this dashboard and how often?" className="mb-3" value={dashboardAudience} onChange={(e) => setDashboardAudience(e.target.value)} />
            {renderCommonDecisionField()}
            {renderFrequencyFields()}
          </>
        );
      case 'modifyDashboard':
        return (
          <>
            <Textarea placeholder="Which dashboard needs modification and why?" className="mb-3" value={dashboardModification} onChange={(e) => setDashboardModification(e.target.value)} />
            <Textarea placeholder="What exact changes are required (filters, visuals, new metrics)?" className="mb-3" value={exactChanges} onChange={(e) => setExactChanges(e.target.value)} />
            {renderCommonDecisionField()}
          </>
        );
      case 'adhoc':
        return (
          <>
            <Textarea placeholder="What is the main hypothesis or question this analysis should answer?" className="mb-3" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
            <Textarea placeholder="What datasets or dimensions should be included?" className="mb-3" value={datasets} onChange={(e) => setDatasets(e.target.value)} />
            {renderCommonDecisionField()}
          </>
        );
      case 'extraction':
        return (
          <>
            <Textarea placeholder="What specific data do you need extracted? (e.g., teacher list, school visits)" className="mb-3" value={dataExtraction} onChange={(e) => setDataExtraction(e.target.value)} />
            <Input placeholder="File format (CSV/Excel)" className="mb-3" value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} />
          </>
        );
      case 'bug':
        return (
          <>
            <Textarea placeholder="Describe the issue or incorrect data you found" className="mb-3" value={bugDescription} onChange={(e) => setBugDescription(e.target.value)} />
            <Textarea placeholder="Where did you notice this issue? (Dashboard name or table)" className="mb-3" value={bugLocation} onChange={(e) => setBugLocation(e.target.value)} />
          </>
        );
      case 'bqaccess':
        return (
          <>
            <Input placeholder="BigQuery email to grant access" className="mb-3" value={bqEmail} onChange={(e) => setBqEmail(e.target.value)} />
            <Textarea placeholder="Which datasets/tables do you need access to?" className="mb-3" value={bqDatasets} onChange={(e) => setBqDatasets(e.target.value)} />
            <Textarea placeholder="Purpose of access (e.g., analysis, QA)" className="mb-3" value={bqPurpose} onChange={(e) => setBqPurpose(e.target.value)} />
          </>
        );
      case 'tracking':
        return (
          <>
            <Textarea placeholder="Which feature or event do you want to track?" className="mb-3" value={trackingFeature} onChange={(e) => setTrackingFeature(e.target.value)} />
            <Textarea placeholder="What should trigger the tracking event?" className="mb-3" value={trackingTrigger} onChange={(e) => setTrackingTrigger(e.target.value)} />
          </>
        );
      case 'metricChange':
        return (
          <>
            <Input placeholder="Metric name (e.g., LP Engagement)" className="mb-3" value={metricName} onChange={(e) => setMetricName(e.target.value)} />
            <Textarea placeholder="What is the current definition?" className="mb-3" value={currentDefinition} onChange={(e) => setCurrentDefinition(e.target.value)} />
            <Textarea placeholder="What should the new definition be?" className="mb-3" value={newDefinition} onChange={(e) => setNewDefinition(e.target.value)} />
            {renderCommonDecisionField()}
          </>
        );
      case 'pipelineChange':
        return (
          <>
            <Textarea placeholder="Which dataset/table requires change?" className="mb-3" value={pipelineDataset} onChange={(e) => setPipelineDataset(e.target.value)} />
            <Textarea placeholder="Describe the modification (schema, logic, backfill)" className="mb-3" value={pipelineModification} onChange={(e) => setPipelineModification(e.target.value)} />
          </>
        );
      case 'recurringReport':
        return (
          <>
            <Textarea placeholder="What data or metrics should this report include?" className="mb-3" value={reportMetrics} onChange={(e) => setReportMetrics(e.target.value)} />
            {renderCommonDecisionField()}
            {renderFrequencyFields()}
          </>
        );
      case 'other':
        return <Textarea placeholder="Describe your request in detail" className="mb-3" value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} />;
      default:
        return <p className="text-sm text-gray-600">Select a request type above to see the relevant fields.</p>;
    }
  };

  return (
    <div className="p-8 flex justify-center bg-gray-50 dark:bg-gray-900 min-h-screen">
      <Card className="w-full max-w-3xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">Dynamic Data Request Form</h2>

          <Section title="1) Requester Info & Request Type" open>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Name (auto-filled)</label>
                <Input placeholder="Your Name" value={requester.name} onChange={(e) => setRequester({ ...requester, name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm">Email (auto-filled)</label>
                <Input placeholder="you@org.org" value={requester.email} onChange={(e) => setRequester({ ...requester, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <label className="text-sm">Department</label>
                <select className="w-full mt-1 border rounded-md p-2" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">-- Select department --</option>
                  {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              {department && TEAM_OPTIONS[department] && (
                <div>
                  <label className="text-sm">Team</label>
                  <select className="w-full mt-1 border rounded-md p-2" value={team} onChange={(e) => setTeam(e.target.value)}>
                    <option value="">-- Select team --</option>
                    {TEAM_OPTIONS[department].map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
              )}
              {team === 'Other' && (
                <div>
                  <label className="text-sm">Specify Team</label>
                  <Input placeholder="Team name" value={teamOther} onChange={(e) => setTeamOther(e.target.value)} className="mt-1" />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-sm">Request Type</label>
                <select className="w-full mt-1 border rounded-md p-2" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
                  <option value="">-- Choose Type --</option>
                  <option value="newDashboard">New Dashboard/Report</option>
                  <option value="modifyDashboard">Modification to Existing Dashboard/Report</option>
                  <option value="adhoc">Ad-hoc Data Analysis</option>
                  <option value="extraction">One-time Data Extraction (CSV/Excel)</option>
                  <option value="bug">Data Bug / Data Quality Issue</option>
                  <option value="bqaccess">BigQuery Access Request</option>
                  <option value="tracking">Event Tracking / Instrumentation</option>
                  <option value="metricChange">Metric Definition / Business Rule Change</option>
                  <option value="pipelineChange">Data Pipeline / Table Change</option>
                  <option value="recurringReport">Scheduled / Recurring Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">Deadline</label>
                <Input type="date" placeholder="DD/MM/YYYY" className="mt-1" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Priority Level *</label>
                  <select className="w-full mt-1 border rounded-md p-2" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="">Select priority...</option>
                    <option value="P0">P0 - Critical (Imminent business decision/launch)</option>
                    <option value="P1">P1 - High (Key business decisions)</option>
                    <option value="P2">P2 - Medium (Important for planning)</option>
                    <option value="P3">P3 - Low (General curiosity, future planning)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Impact *</label>
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

          <Section title="2) Request Details" open={!!requestType}>
            {renderByType()}
          </Section>

          <Section title="3) Submit" open={!!requestType}>
            <div className="flex items-center gap-3">
              <Button className="px-6" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button variant="outline" className="px-6" onClick={() => setRequestType('')}>Reset</Button>
            </div>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
