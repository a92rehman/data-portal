import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import notify from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  BarChart3, Search, Plus, Edit, Trash2, Users, Target, HelpCircle, Lightbulb,
  TrendingUp, CheckCircle2, Info, X, FileText
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import type { DataRequestWithDetails, TaskWithDetails } from "@shared/schema";

const metricTypeSchema = z.object({
  name: z.string().min(1, "Type name is required"),
  whatAreThey: z.string().min(1, "What are they is required"),
  focus: z.string().min(1, "Focus is required"),
  whyTheyMatter: z.string().min(1, "Why they matter is required"),
  keyQuestion: z.string().min(1, "Key question is required"),
  primaryAudience: z.string().min(1, "Primary audience is required"),
});

const metricSchema = z.object({
  metricTypeId: z.string().min(1, "Metric type is required"),
  name: z.string().min(1, "Metric name is required"),
  definition: z.string().min(1, "Definition is required"),
  threshold: z.string().optional(),
  detailBody: z.string().optional(),
});

const metricFeatureSchema = z.object({
  metricId: z.string().min(1, "Metric is required"),
  name: z.string().min(1, "Feature name is required"),
  threshold: z.string().min(1, "Threshold is required"),
});

type MetricTypeFormData = z.infer<typeof metricTypeSchema>;
type MetricFormData = z.infer<typeof metricSchema>;
type MetricFeatureFormData = z.infer<typeof metricFeatureSchema>;

type MetricFeature = {
  id: string;
  metricId: string;
  name: string;
  threshold: string;
};

type MetricTypeWithMetrics = {
  id: string;
  name: string;
  whatAreThey: string;
  focus: string;
  whyTheyMatter: string;
  keyQuestion: string;
  primaryAudience: string;
  metrics: Array<{
    id: string;
    name: string;
    definition: string;
    threshold?: string | null;
    detailBody?: string | null;
    features?: MetricFeature[];
  }>;
};

type Metric = MetricTypeWithMetrics["metrics"][number];

export default function MetricDefinitions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAudience, setSelectedAudience] = useState<string>("all");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isMetricDialogOpen, setIsMetricDialogOpen] = useState(false);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MetricTypeWithMetrics | null>(null);
  const [editingMetric, setEditingMetric] = useState<any>(null);
  const [editingFeature, setEditingFeature] = useState<MetricFeature | null>(null);
  const [selectedTypeForMetric, setSelectedTypeForMetric] = useState<string>("");
  const [selectedMetricForFeature, setSelectedMetricForFeature] = useState<string>("");
  const [selectedMetricDetail, setSelectedMetricDetail] = useState<{
    type: MetricTypeWithMetrics;
    metric: Metric;
  } | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [detailDraft, setDetailDraft] = useState("");
  const detailEditorRef = useRef<HTMLDivElement | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);

  // Fetch metric definitions (public endpoint)
  const { data: metricTypes = [], isLoading } = useQuery<MetricTypeWithMetrics[]>({
    queryKey: ["/api/metric-definitions"],
  });

  const typeForm = useForm<MetricTypeFormData>({
    resolver: zodResolver(metricTypeSchema),
    defaultValues: {
      name: "",
      whatAreThey: "",
      focus: "",
      whyTheyMatter: "",
      keyQuestion: "",
      primaryAudience: "",
    },
  });

  const metricForm = useForm<MetricFormData>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      metricTypeId: "",
      name: "",
      definition: "",
      threshold: "",
      detailBody: "",
    },
  });

  const featureForm = useForm<MetricFeatureFormData>({
    resolver: zodResolver(metricFeatureSchema),
    defaultValues: {
      metricId: "",
      name: "",
      threshold: "",
    },
  });

  // Get unique audiences
  const audiences = useMemo(() => {
    return Array.from(new Set(metricTypes.map((t) => t.primaryAudience).filter(Boolean)));
  }, [metricTypes]);

  // Filter metric types
  const filteredTypes = useMemo(() => {
    return metricTypes.filter((type) => {
      const matchesSearch = 
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.whatAreThey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.focus.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.primaryAudience.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.metrics.some(m => 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.definition.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesAudience = selectedAudience === "all" || type.primaryAudience === selectedAudience;
      return matchesSearch && matchesAudience;
    });
  }, [metricTypes, searchQuery, selectedAudience]);

  const createTypeMutation = useMutation({
    mutationFn: async (data: MetricTypeFormData) => {
      return await apiRequest("POST", "/api/metric-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric type created successfully");
      setIsTypeDialogOpen(false);
      typeForm.reset();
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to create metric type");
    },
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MetricTypeFormData }) => {
      return await apiRequest("PATCH", `/api/metric-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric type updated successfully");
      setIsTypeDialogOpen(false);
      setEditingType(null);
      typeForm.reset();
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to update metric type");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/metric-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric type deleted successfully");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete metric type");
    },
  });

  const createMetricMutation = useMutation({
    mutationFn: async (data: MetricFormData) => {
      return await apiRequest("POST", "/api/metrics", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric created successfully");
      setIsMetricDialogOpen(false);
      metricForm.reset();
      setSelectedTypeForMetric("");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to create metric");
    },
  });

  const updateMetricMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MetricFormData }) => {
      return await apiRequest("PATCH", `/api/metrics/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric updated successfully");
      setIsMetricDialogOpen(false);
      setEditingMetric(null);
      metricForm.reset();
      setSelectedTypeForMetric("");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to update metric");
    },
  });

  const deleteMetricMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/metrics/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Metric deleted successfully");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete metric");
    },
  });

  const createFeatureMutation = useMutation({
    mutationFn: async (data: MetricFeatureFormData) => {
      return await apiRequest("POST", "/api/metric-features", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Feature created successfully");
      setIsFeatureDialogOpen(false);
      featureForm.reset();
      setSelectedMetricForFeature("");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to create feature");
    },
  });

  const updateFeatureMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MetricFeatureFormData }) => {
      return await apiRequest("PATCH", `/api/metric-features/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Feature updated successfully");
      setIsFeatureDialogOpen(false);
      setEditingFeature(null);
      featureForm.reset();
      setSelectedMetricForFeature("");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to update feature");
    },
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/metric-features/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      notify.success("Feature deleted successfully");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete feature");
    },
  });

  const isTeamLead = user && (user as any)?.role === "team_lead";
  const updateDetailMutation = useMutation({
    mutationFn: async ({ id, detailBody }: { id: string; detailBody: string }) => {
      return await apiRequest("PATCH", `/api/metrics/${id}`, { detailBody });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/metric-definitions"] });
      setIsEditingDetail(false);
      setSelectedMetricDetail((prev) => {
        if (!prev || prev.metric.id !== variables.id) return prev;
        return {
          ...prev,
          metric: {
            ...prev.metric,
            detailBody: variables.detailBody,
          },
        };
      });
      notify.success("Metric detail saved");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to save metric detail");
    },
  });
  
  useEffect(() => {
    if (selectedMetricDetail) {
      setDetailDraft(selectedMetricDetail.metric.detailBody || "");
      setIsEditingDetail(false);
    }
  }, [selectedMetricDetail?.metric.id]);

  useEffect(() => {
    if (isEditingDetail && detailEditorRef.current) {
      detailEditorRef.current.innerHTML = detailDraft || "";
      detailEditorRef.current.focus();
    }
  }, [isEditingDetail]);

  const handleEditType = (type: MetricTypeWithMetrics) => {
    setEditingType(type);
    typeForm.reset({
      name: type.name,
      whatAreThey: type.whatAreThey,
      focus: type.focus,
      whyTheyMatter: type.whyTheyMatter,
      keyQuestion: type.keyQuestion,
      primaryAudience: type.primaryAudience,
    });
    setIsTypeDialogOpen(true);
  };

  const handleCreateType = () => {
    setEditingType(null);
    typeForm.reset();
    setIsTypeDialogOpen(true);
  };

  const handleEditMetric = (metric: any, typeId: string) => {
    setEditingMetric(metric);
    metricForm.reset({
      metricTypeId: typeId,
      name: metric.name,
      definition: metric.definition,
      threshold: metric.threshold || "",
      detailBody: metric.detailBody || "",
    });
    setSelectedTypeForMetric(typeId);
    setIsMetricDialogOpen(true);
  };

  const handleCreateMetric = (typeId: string) => {
    setEditingMetric(null);
    metricForm.reset({
      metricTypeId: typeId,
      name: "",
      definition: "",
      threshold: "",
      detailBody: "",
    });
    setSelectedTypeForMetric(typeId);
    setIsMetricDialogOpen(true);
  };

  const handleEditFeature = (feature: MetricFeature, metricId: string) => {
    setEditingFeature(feature);
    featureForm.reset({
      metricId: metricId,
      name: feature.name,
      threshold: feature.threshold,
    });
    setSelectedMetricForFeature(metricId);
    setIsFeatureDialogOpen(true);
  };

  const handleCreateFeature = (metricId: string) => {
    setEditingFeature(null);
    featureForm.reset({
      metricId: metricId,
      name: "",
      threshold: "",
    });
    setSelectedMetricForFeature(metricId);
    setIsFeatureDialogOpen(true);
  };

  const handleBeginDetailEdit = () => {
    if (!selectedMetricDetail) return;
    setDetailDraft(selectedMetricDetail.metric.detailBody || "");
    setIsEditingDetail(true);
  };

  const handleCancelDetailEdit = () => {
    if (!selectedMetricDetail) return;
    setDetailDraft(selectedMetricDetail.metric.detailBody || "");
    setIsEditingDetail(false);
  };

  const handleDetailEditorInput = (event: React.FormEvent<HTMLDivElement>) => {
    setDetailDraft(event.currentTarget.innerHTML);
  };

  const handleSaveDetail = () => {
    if (!selectedMetricDetail || updateDetailMutation.isPending) return;
    updateDetailMutation.mutate({
      id: selectedMetricDetail.metric.id,
      detailBody: detailDraft || "",
    });
  };

  const onSubmitFeature = (data: MetricFeatureFormData) => {
    if (editingFeature) {
      updateFeatureMutation.mutate({ id: editingFeature.id, data });
    } else {
      createFeatureMutation.mutate(data);
    }
  };

  const onSubmitType = (data: MetricTypeFormData) => {
    if (editingType) {
      updateTypeMutation.mutate({ id: editingType.id, data });
    } else {
      createTypeMutation.mutate(data);
    }
  };

  const onSubmitMetric = (data: MetricFormData) => {
    if (editingMetric) {
      updateMetricMutation.mutate({ id: editingMetric.id, data });
    } else {
      createMetricMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-purple-950 dark:via-blue-950 dark:to-pink-950">
      <Header user={user as any} />
      
      <div>
        {user && (
          <Sidebar onNewRequest={() => {}} user={user as any} />
        )}
        
        <main className={`${user ? 'md:ml-64' : ''} p-6 pt-20`}>
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
                  Metric Definitions
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Comprehensive guide to metric types, definitions, and thresholds
              </p>
            </div>

            {/* Search and Filter Section */}
            <Card className="mb-6 shadow-lg border-2">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search metric types, metrics, definitions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-2"
                    />
                  </div>
                <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                  <SelectTrigger className="w-full sm:w-[250px] border-2">
                    <SelectValue placeholder="All Audiences" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Audiences</SelectItem>
                    {audiences.map((audience) => (
                      <SelectItem key={audience} value={audience}>{audience}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isTeamLead && (
                  <Button onClick={handleCreateType} className="gradient-button-primary text-white shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Metric Type
                  </Button>
                )}
                </div>
              </CardContent>
            </Card>

              {/* Metric Types List */}
            {isLoading ? (
              <div className="text-center py-12">Loading metric definitions...</div>
            ) : filteredTypes.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No metric types match your search." : "No metric types available yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {filteredTypes.map((type) => (
                <AccordionItem
                  key={type.id}
                  value={type.id}
                  className="border-2 rounded-xl bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-950/20 dark:hover:to-blue-950/20 transition-all">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="text-left">
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {type.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.metrics.length} metric{type.metrics.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {isTeamLead && (
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditType(type);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-100 dark:hover:bg-red-900/30"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${type.name}" and all its metrics?`)) {
                                deleteTypeMutation.mutate(type.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                    {/* Type Details Cards - Enhanced Design */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* What are they? - Purple */}
                      <Card className="border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                            <div className="w-8 h-8 rounded-lg bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
                              <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            What are they?
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {type.whatAreThey}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Focus - Blue */}
                      <Card className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <div className="w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            Focus
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {type.focus}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Why they matter - Green */}
                      <Card className="border-2 border-green-300 dark:border-green-700 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                            <div className="w-8 h-8 rounded-lg bg-green-200 dark:bg-green-800 flex items-center justify-center">
                              <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            Why they matter
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {type.whyTheyMatter}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Key Question - Orange */}
                      <Card className="border-2 border-orange-300 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                            <div className="w-8 h-8 rounded-lg bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
                              <HelpCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            Key Question It Answers
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap italic text-gray-700 dark:text-gray-300">
                            "{type.keyQuestion}"
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Primary Audience - Pink, Full Width */}
                    <Card className="mb-6 border-2 border-pink-300 dark:border-pink-700 bg-gradient-to-r from-pink-50 to-pink-100/50 dark:from-pink-950/30 dark:to-pink-900/20 shadow-md hover:shadow-lg transition-all duration-300">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-pink-700 dark:text-pink-300">
                          <div className="w-8 h-8 rounded-lg bg-pink-200 dark:bg-pink-800 flex items-center justify-center">
                            <Users className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                          </div>
                          Primary Audience
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {type.primaryAudience.split(',').map((audience, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary" 
                              className="text-sm px-3 py-1 bg-pink-200 dark:bg-pink-800 text-pink-800 dark:text-pink-200 border border-pink-300 dark:border-pink-700"
                            >
                              {audience.trim()}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Metrics Section - Enhanced */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          <TrendingUp className="w-6 h-6 text-purple-600" />
                          Metrics ({type.metrics.length})
                        </h3>
                        {isTeamLead && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 shadow-sm"
                            onClick={() => handleCreateMetric(type.id)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Metric
                          </Button>
                        )}
                      </div>

                      {type.metrics.length === 0 ? (
                        <Card className="border-2 border-dashed shadow-sm">
                          <CardContent className="py-12 text-center text-muted-foreground">
                            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No metrics defined yet.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <Accordion type="multiple" className="space-y-3">
                          {type.metrics.map((metric, index) => (
                            <AccordionItem
                              key={metric.id}
                              value={metric.id}
                              className="border-2 rounded-lg bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border-purple-200 dark:border-purple-800"
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-950/20 dark:hover:to-blue-950/20 transition-all">
                                <div className="flex items-center justify-between w-full mr-4">
                                  <div className="flex items-center gap-3 text-left">
                                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400 min-w-[2rem]">
                                      {index + 1}
                                    </span>
                                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                      {metric.name}
                                    </CardTitle>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-purple-200 dark:border-purple-700 text-xs sm:text-sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMetricDetail({ type, metric });
                                      }}
                                    >
                                      <Info className="w-3 h-3 mr-1" />
                                      More detail
                                    </Button>
                                    {isTeamLead && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="hover:bg-purple-100 dark:hover:bg-purple-900/30"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditMetric(metric, type.id);
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="hover:bg-red-100 dark:hover:bg-red-900/30"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Delete \"${metric.name}\"?`)) {
                                              deleteMetricMutation.mutate(metric.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                                <div className="space-y-4 pt-2">
                                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                      <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                      Definition
                                    </h4>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 ml-6">
                                      {metric.definition}
                                    </p>
                                  </div>
                                  
                                  {/* Features Section */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                                      <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        Features & Thresholds
                                      </h4>
                                      {isTeamLead && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCreateFeature(metric.id)}
                                          className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs"
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          Add Feature
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {metric.features && metric.features.length > 0 ? (
                                      <div className="space-y-2">
                                        {metric.features.map((feature, idx) => (
                                          <Card key={feature.id} className="border-l-2 border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
                                            <CardContent className="p-3">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 min-w-[1.5rem]">
                                                      {idx + 1}.
                                                    </span>
                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                      {feature.name}
                                                    </h5>
                                                  </div>
                                                  <p className="text-xs text-gray-700 dark:text-gray-300 ml-6 whitespace-pre-wrap">
                                                    {feature.threshold}
                                                  </p>
                                                </div>
                                                {isTeamLead && (
                                                  <div className="flex gap-1">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                      onClick={() => handleEditFeature(feature, metric.id)}
                                                    >
                                                      <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                                                      onClick={() => {
                                                        if (confirm(`Delete "${feature.name}"?`)) {
                                                          deleteFeatureMutation.mutate(feature.id);
                                                        }
                                                      }}
                                                    >
                                                      <Trash2 className="w-3 h-3 text-destructive" />
                                                    </Button>
                                                  </div>
                                                )}
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    ) : (
                                      <Card className="border-dashed border-2">
                                        <CardContent className="py-6 text-center text-xs text-muted-foreground">
                                          No features defined yet. {isTeamLead && "Click 'Add Feature' to add one."}
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                  
                                  {/* Keep the old threshold display for backward compatibility if no features exist */}
                                  {(!metric.features || metric.features.length === 0) && metric.threshold && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
                                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        Threshold
                                      </h4>
                                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 ml-6">
                                        {metric.threshold}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            )}

            <Sheet
              open={!!selectedMetricDetail}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedMetricDetail(null);
                }
              }}
            >
              <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
                {selectedMetricDetail && (
                  <div className="space-y-6">
                    <SheetHeader className="text-left">
                      <SheetTitle className="text-3xl font-semibold text-purple-600 dark:text-purple-300 break-words">
                        {selectedMetricDetail.metric.name}
                      </SheetTitle>
                      <CardDescription className="text-base text-muted-foreground">
                        {selectedMetricDetail.type.name}
                      </CardDescription>
                    </SheetHeader>

                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-200">
                        {selectedMetricDetail.type.primaryAudience}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        {selectedMetricDetail.metric.features?.length || 0} feature
                        {(selectedMetricDetail.metric.features?.length || 0) !== 1 ? "s" : ""}
                      </Badge>
                      {selectedMetricDetail.metric.threshold && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                          Threshold defined
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Use this canvas to describe calculation logic, context, and paste charts or screenshots.
                      </p>
                      {isTeamLead && (
                        <div className="flex items-center gap-2">
                          {isEditingDetail ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelDetailEdit}
                                disabled={updateDetailMutation.isPending}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSaveDetail}
                                disabled={updateDetailMutation.isPending}
                                className="text-white gradient-button-primary"
                              >
                                {updateDetailMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleBeginDetailEdit}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Details
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border-2 border-purple-100 dark:border-purple-900 bg-white dark:bg-gray-950 shadow-inner">
                      {isEditingDetail ? (
                        <div
                          ref={detailEditorRef}
                          contentEditable
                          onInput={handleDetailEditorInput}
                          className="min-h-[420px] max-h-[65vh] overflow-y-auto p-6 text-base leading-relaxed prose prose-slate dark:prose-invert focus:outline-none rounded-2xl [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]"
                          data-placeholder="Start typing your metric narrative..."
                          aria-label="Metric detail editor"
                          suppressContentEditableWarning
                        />
                      ) : selectedMetricDetail.metric.detailBody ? (
                        <article
                          className="p-6 text-base leading-relaxed prose prose-slate dark:prose-invert"
                          dangerouslySetInnerHTML={{ __html: selectedMetricDetail.metric.detailBody }}
                        />
                      ) : (
                        <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                          <FileText className="w-10 h-10 opacity-60" />
                          <p>
                            {isTeamLead
                              ? "No metric detail has been captured yet. Click “Edit Details” to start documenting."
                              : "No additional detail has been published for this metric yet."}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditingDetail && (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMetricDetail(null)}
                          className="text-muted-foreground"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* Create/Edit Metric Type Dialog */}
            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? "Edit Metric Type" : "Create New Metric Type"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingType ? "Update the metric type information" : "Add a new metric type to the definitions"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...typeForm}>
                  <form onSubmit={typeForm.handleSubmit(onSubmitType)} className="space-y-4">
                    <FormField
                      control={typeForm.control}
                      name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Program Delivery & Implementation Metrics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="whatAreThey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are they? *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what these metrics are..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="focus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What is the primary focus area?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="whyTheyMatter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why they matter *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain why these metrics are important..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="keyQuestion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Question It Answers *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What key question does this metric type answer?"
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={typeForm.control}
                  name="primaryAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Audience *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Program Coordinator, Product team" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsTypeDialogOpen(false);
                      setEditingType(null);
                      typeForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-button-primary text-white"
                    disabled={createTypeMutation.isPending || updateTypeMutation.isPending}
                  >
                    {editingType ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
              </DialogContent>
            </Dialog>

            {/* Create/Edit Metric Dialog */}
            <Dialog open={isMetricDialogOpen} onOpenChange={setIsMetricDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMetric ? "Edit Metric" : "Create New Metric"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMetric ? "Update the metric information" : "Add a new metric to this type"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...metricForm}>
                  <form onSubmit={metricForm.handleSubmit(onSubmitMetric)} className="space-y-4">
                    <FormField
                      control={metricForm.control}
                      name="metricTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!selectedTypeForMetric}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select metric type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {metricTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={metricForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Metric Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Successful Coach Visit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={metricForm.control}
                  name="definition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Definition *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide a clear definition..."
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={metricForm.control}
                  name="threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Threshold</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Optional: Define threshold values or targets..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Optional threshold or target value for this metric</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsMetricDialogOpen(false);
                      setEditingMetric(null);
                      metricForm.reset();
                      setSelectedTypeForMetric("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-button-primary text-white"
                    disabled={createMetricMutation.isPending || updateMetricMutation.isPending}
                  >
                    {editingMetric ? "Update" : "Create"}
                  </Button>
                </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Create/Edit Metric Feature Dialog */}
            <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFeature ? "Edit Metric Feature" : "Create New Metric Feature"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingFeature ? "Update the feature information" : "Add a new feature to this metric"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...featureForm}>
                  <form onSubmit={featureForm.handleSubmit(onSubmitFeature)} className="space-y-4">
                    <FormField
                      control={featureForm.control}
                      name="metricId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Metric *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!!selectedMetricForFeature}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select metric..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {metricTypes.flatMap(type => 
                                type.metrics.map(metric => (
                                  <SelectItem key={metric.id} value={metric.id}>{metric.name}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={featureForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feature Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Lesson Plan engagement" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={featureForm.control}
                      name="threshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Threshold *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Define threshold values or targets for this feature..."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Threshold or target value for this feature</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsFeatureDialogOpen(false);
                          setEditingFeature(null);
                          featureForm.reset();
                          setSelectedMetricForFeature("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="gradient-button-primary text-white"
                        disabled={createFeatureMutation.isPending || updateFeatureMutation.isPending}
                      >
                        {editingFeature ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Request Detail Dialog */}
            {selectedRequest && (
              <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
                  <RequestDetail 
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={() => {
                      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}

            {/* Task Detail Dialog - Navigate to tasks page for full functionality */}
            {selectedTask && (
              <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
                <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
                  <div className="p-6">
                    <p className="text-lg font-semibold mb-4">{selectedTask.title}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      For full task details and management, please visit the Tasks page.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedTask(null);
                        setLocation(`/tasks?taskId=${selectedTask.id}`);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Open in Tasks Page
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

