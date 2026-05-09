import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Inbox, Clock, CheckCircle, BarChart3, Plus, Eye, CircleAlert, MinusCircle, InfoIcon, Search, Trash2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { DEPARTMENTS } from "@shared/constants";
import { format } from "date-fns";
import { calculateUrgency } from "@/lib/urgency";

const TEST_EMAILS = ["ar09info@gmail.com", "ar92info@gmail.com"];

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { connectionStatus } = useWebSocketContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    department: "",
    priority: "",
    type: "",
    assignedToId: "",
    dateFilter: "",
    startDate: "",
    endDate: "",
  });
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<DataRequestWithDetails | null>(null);

  // Fetch analysts for filter (only for team leads and analysts)
  const { data: analysts = [] } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
    enabled: isAuthenticated && ((user as any)?.role === "team_lead" || (user as any)?.role === "analyst"),
  });

  // Handle authenticated users without a role (reliable, not dependent on localStorage)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !(user as any)?.role) {
      const selectedRole = localStorage.getItem("selected_role");
      const email = (user as any)?.email || "";
      
      // If they have a selected role from landing page, process it
      if (selectedRole) {
        const applyRoleSelection = async () => {
          // If requester, redirect to signup form to collect additional info
          if (selectedRole === "requester") {
            setLocation("/requester-signup");
            return;
          }
          
          // For other roles (analyst, team_lead), apply role directly
          try {
            await apiRequest("PATCH", "/api/auth/user/role", { role: selectedRole });
            localStorage.removeItem("selected_role");
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          } catch (error) {
            console.error("Error applying role:", error);
            localStorage.removeItem("selected_role");
          }
        };
        applyRoleSelection();
      } else {
        // No selected_role in localStorage (cleared, new device, etc.)
        // Default to requester signup
        localStorage.setItem("selected_role", "requester");
        setLocation("/requester-signup");
      }
    } else if (isAuthenticated && user && (user as any)?.role) {
      // User already has a role, clear any lingering selected_role from localStorage
      const selectedRole = localStorage.getItem("selected_role");
      if (selectedRole) {
        localStorage.removeItem("selected_role");
      }
    }
  }, [isAuthenticated, isLoading, user, queryClient, setLocation, toast]);

  // Redirect to profile setup if team lead without department
  useEffect(() => {
    if (isAuthenticated && user && (user as any)?.role === "team_lead" && !(user as any)?.department) {
      window.location.href = "/profile-setup";
    }
  }, [isAuthenticated, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch requests
  const { data: requests = [], isLoading: isRequestsLoading } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests", filters],
    enabled: isAuthenticated,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // Auto-update selectedRequest when requests data changes (for real-time updates)
  useEffect(() => {
    if (selectedRequest && requests.length > 0) {
      const updatedRequest = requests.find(r => r.id === selectedRequest.id);
      if (updatedRequest) {
        setSelectedRequest(updatedRequest);
      }
    }
  }, [requests, selectedRequest]);

  // Check for requestId URL param and fetch specific request
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const requestId = urlParams.get('requestId');
    
    if (requestId) {
      // Fetch the specific request directly to bypass any filters
      fetch(`/api/requests/${requestId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch request: ${res.status}`);
          }
          return res.json();
        })
        .then(request => {
          if (request && request.id) {
            setSelectedRequest(request);
          }
          // Clear the URL param
          setLocation(location);
        })
        .catch(err => {
          console.error('Failed to fetch request:', err);
          // Clear the URL param
          setLocation(location);
        });
    }
  }, [searchString, location, setLocation]); // Re-run whenever search string changes


  // Delete request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest("DELETE", `/api/requests/${requestId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setSelectedRequest(null);
      setRequestToDelete(null);
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to delete request",
        variant: "destructive",
      });
    },
  });

  // Handle date filter changes
  const handleDateFilterChange = (value: string) => {
    const now = new Date();
    let startDate = "";
    let endDate = "";

    if (value === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.toISOString();
      endDate = new Date().toISOString();
    } else if (value === "this_week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      startDate = weekStart.toISOString();
      endDate = new Date().toISOString();
    } else if (value === "this_month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      startDate = monthStart.toISOString();
      endDate = new Date().toISOString();
    } else if (value === "custom") {
      // For custom, dates will be set via the date picker
      setFilters({ ...filters, dateFilter: value, startDate: "", endDate: "" });
      return;
    } else {
      // "all" - clear date filters
      setFilters({ ...filters, dateFilter: "", startDate: "", endDate: "" });
      setDateRange({ from: undefined, to: undefined });
      return;
    }

    setFilters({ ...filters, dateFilter: value, startDate, endDate });
  };

  // Handle custom date range selection
  useEffect(() => {
    if (filters.dateFilter === "custom" && dateRange.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = dateRange.to ? new Date(dateRange.to) : new Date();
      to.setHours(23, 59, 59, 999);
      
      setFilters({
        ...filters,
        startDate: from.toISOString(),
        endDate: to.toISOString(),
      });
    }
  }, [dateRange]);

  // Filter requests based on search query
  const filteredRequests = (requests || []).filter((request: DataRequestWithDetails) =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (request.primaryQuestion?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (request.businessProblem?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Calculate dynamic stats from filteredRequests (so they match the visible table)
  const dynamicStats = {
    totalRequests: filteredRequests.length,
    inProgress: filteredRequests.filter(r => r.status === 'in_progress').length,
    completed: filteredRequests.filter(r => r.status === 'completed').length,
    atRisk: filteredRequests.filter(r => {
      if (!r.dueDate || r.status === 'completed') return false;
      const now = new Date();
      const dueDate = new Date(r.dueDate);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours < 24; // Less than 1 day
    }).length,
    rejected: filteredRequests.filter(r => r.status === 'rejected').length,
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
    switch (priority) {
      case "p0_critical":
        return <CircleAlert className="w-4 h-4" style={{color: 'hsl(0, 84%, 60%)'}} />;
      case "p1_high":
        return <CircleAlert className="w-4 h-4 text-destructive" />;
      case "p2_medium":
        return <MinusCircle className="w-4 h-4 text-warning" />;
      case "p3_low":
        return <InfoIcon className="w-4 h-4 text-info" />;
      default:
        return <InfoIcon className="w-4 h-4 text-info" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRequestType = (type: string) => {
    switch (type) {
      case "new_dashboard":
        return "New Dashboard";
      case "modify_dashboard":
        return "Modify Dashboard";
      case "adhoc_analysis":
        return "Ad-hoc Analysis";
      case "data_extraction":
        return "Data Extraction";
      case "data_bug":
        return "Data Bug";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getDeliveryStatus = (request: DataRequestWithDetails) => {
    // If delivered, check if on time or late
    if (request.deliveredAt) {
      const dueDate = new Date(request.dueDate);
      const deliveredDate = new Date(request.deliveredAt);
      
      // Compare only dates, not time - if delivered on same day or before, it's on time
      dueDate.setHours(23, 59, 59, 999);
      const isOnTime = deliveredDate <= dueDate;
      return { status: 'delivered', isOnTime };
    }
    
    // Not delivered yet
    return { status: 'not_yet' };
  };

  // Sort requests by workflow order
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const statusOrder = {
      'pending_review': 1,
      'accepted': 2,
      'in_progress': 3,
      'blocked': 4,
      'completed': 5,
      'rejected': 6,
    };
    
    const orderA = statusOrder[a.status as keyof typeof statusOrder] || 999;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] || 999;
    
    // Primary sort: by status
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Secondary sort: by urgency (within same status)
    const urgencyA = calculateUrgency(a);
    const urgencyB = calculateUrgency(b);
    
    const urgencyOrder = {
      'urgent': 1,
      'high': 2,
      'medium': 3,
      'low': 4,
    };
    
    const urgencyOrderA = urgencyOrder[urgencyA.level as keyof typeof urgencyOrder] || 5;
    const urgencyOrderB = urgencyOrder[urgencyB.level as keyof typeof urgencyOrder] || 5;
    
    if (urgencyOrderA !== urgencyOrderB) {
      return urgencyOrderA - urgencyOrderB;
    }
    
    // Tertiary sort: by creation date (newest first)
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user as any} />
      
      <div>
        <Sidebar onNewRequest={() => setLocation("/requests/new")} user={user as any} />
        
        <main className="md:ml-64 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="border-2 border-border bg-card shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md mb-3" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                      <Inbox className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Total Requests</p>
                    <p className="text-3xl font-bold text-foreground">{dynamicStats.totalRequests}</p>
                    <p className="text-xs mt-1 text-muted-foreground">Filtered</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border bg-card shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md mb-3" style={{background: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(48, 92%, 55%) 100%)'}}>
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">In Progress</p>
                    <p className="text-3xl font-bold text-foreground">{dynamicStats.inProgress}</p>
                    <p className="text-xs mt-1 text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border bg-card shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md mb-3" style={{background: 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 71%, 50%) 100%)'}}>
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Completed</p>
                    <p className="text-3xl font-bold text-foreground">{dynamicStats.completed}</p>
                    <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                      {dynamicStats.totalRequests ? Math.round((dynamicStats.completed / dynamicStats.totalRequests) * 100) : 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-orange-500 to-orange-600 mb-3">
                      <CircleAlert className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">At Risk</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{dynamicStats.atRisk}</p>
                    <p className="text-xs mt-1 text-orange-600 dark:text-orange-400">Due &lt; 1 day</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-5">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-yellow-500 to-yellow-600 mb-3">
                      <MinusCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-1">Rejected</p>
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{dynamicStats.rejected}</p>
                    <p className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">Declined</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-4 border-2 border-border bg-card shadow-md sticky top-[73px] z-20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="input-search"
                    />
                  </div>

                  <Select value={filters.status || "all"} onValueChange={(value) => setFilters({...filters, status: value === "all" ? "" : value})}>
                    <SelectTrigger className="w-40" data-testid="select-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.department || "all"} onValueChange={(value) => setFilters({...filters, department: value === "all" ? "" : value})}>
                    <SelectTrigger className="w-40" data-testid="select-department">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filters.priority || "all"} onValueChange={(value) => setFilters({...filters, priority: value === "all" ? "" : value})}>
                    <SelectTrigger className="w-40" data-testid="select-priority">
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                      <SelectItem value="p1_high">P1 - High</SelectItem>
                      <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                      <SelectItem value="p3_low">P3 - Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.type || "all"} onValueChange={(value) => setFilters({...filters, type: value === "all" ? "" : value})}>
                    <SelectTrigger className="w-40" data-testid="select-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="new_dashboard">New Dashboard/Report</SelectItem>
                      <SelectItem value="modify_dashboard">Modify Dashboard/Report</SelectItem>
                      <SelectItem value="adhoc_analysis">Ad-hoc Analysis</SelectItem>
                      <SelectItem value="data_extraction">Data Extraction</SelectItem>
                      <SelectItem value="data_bug">Data Bug</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  {((user as any)?.role === "team_lead" || (user as any)?.role === "analyst") && (
                    <Select value={filters.assignedToId || "all"} onValueChange={(value) => setFilters({...filters, assignedToId: value === "all" ? "" : value})}>
                      <SelectTrigger className="w-40" data-testid="select-assigned">
                        <SelectValue placeholder="All Analysts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Analysts</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {analysts.map((analyst) => (
                          <SelectItem key={analyst.id} value={analyst.id}>
                            {analyst.firstName} {analyst.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {(user as any)?.role === "team_lead" && (
                    <>
                      <Select value={filters.dateFilter || "all"} onValueChange={handleDateFilterChange}>
                        <SelectTrigger className="w-40" data-testid="select-date-filter">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="this_week">This Week</SelectItem>
                          <SelectItem value="this_month">This Month</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>

                      {filters.dateFilter === "custom" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-60" data-testid="button-custom-date">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.from ? (
                                dateRange.to ? (
                                  <>
                                    {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                                  </>
                                ) : (
                                  format(dateRange.from, "MMM dd, yyyy")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange.from}
                              selected={dateRange}
                              onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </>
                  )}
                </div>

                {((user as any)?.role === "requester" || (user as any)?.role === "team_lead") && (
                  <Button 
                    onClick={() => setLocation("/requests/new")} 
                    data-testid="button-new-request"
                    className="gradient-button-primary text-white font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Data Request
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="border-2 border-border bg-card shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Request Status</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : sortedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No requests found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRequests.map((request: DataRequestWithDetails) => (
                      <TableRow 
                        key={request.id} 
                        className="table-row"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`row-request-${request.id}`}
                      >
                        <TableCell className="font-medium">
                          {(() => {
                            const urgency = calculateUrgency(request);
                            if (!urgency.label) {
                              return <span className="text-xs text-muted-foreground">—</span>;
                            }
                            return (
                              <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${urgency.colorClass}`}>
                                {urgency.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {request.requestedBy ? (
                            <span className="text-sm">
                              {request.requestedBy.firstName} {request.requestedBy.lastName}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{request.department}</TableCell>
                        <TableCell>{formatRequestType(request.type)}</TableCell>
                        <TableCell>
                          <Badge className={`status-badge ${getStatusBadge(request.status)}`}>
                            {formatStatus(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const deliveryStatus = getDeliveryStatus(request);
                            
                            // Not Yet delivered
                            if (deliveryStatus.status === 'not_yet') {
                              return (
                                <Badge 
                                  className="px-2 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                                  data-testid={`delivery-status-${request.id}`}
                                >
                                  Not Yet
                                </Badge>
                              );
                            }
                            
                            // Delivered state (on time or late)
                            return (
                              <Badge 
                                className={`px-2 py-1 text-xs font-semibold ${
                                  deliveryStatus.isOnTime 
                                    ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' 
                                    : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
                                }`}
                                data-testid={`delivery-status-${request.id}`}
                              >
                                {deliveryStatus.isOnTime ? 'On Time' : 'Late'}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {request.assignedTo ? (
                            <span className="text-sm" data-testid={`assigned-${request.id}`}>
                              {request.assignedTo.firstName} {request.assignedTo.lastName}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {request.createdAt ? formatDate(request.createdAt.toString()) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const dueDate = new Date(request.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            dueDate.setHours(0, 0, 0, 0);
                            const isOverdue = dueDate < today && !request.deliveredAt;
                            
                            return (
                              <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                                {formatDate(request.dueDate.toString())}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(request);
                              }}
                              data-testid={`button-view-${request.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(user as any)?.role === "team_lead" && (user as any)?.email === "ar92info@gmail.com" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRequestToDelete(request);
                                }}
                                data-testid={`button-delete-${request.id}`}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete Request (Admin Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>
      </div>


      {/* Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
          {selectedRequest && (
            <RequestDetail 
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={(updatedRequest) => {
                if (updatedRequest) {
                  setSelectedRequest(updatedRequest);
                }
                queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="bg-background text-foreground">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
              <AlertDialogTitle className="text-xl">Delete Request</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-4 text-base">
              Are you sure you want to delete this request? This action cannot be undone.
              {requestToDelete && (
                <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                  <p className="font-semibold text-foreground">{requestToDelete.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Requested by: {requestToDelete.requestedBy?.firstName} {requestToDelete.requestedBy?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Type: {requestToDelete.type}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setRequestToDelete(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (requestToDelete) {
                  deleteRequestMutation.mutate(requestToDelete.id);
                }
              }}
              disabled={deleteRequestMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteRequestMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete Request"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
