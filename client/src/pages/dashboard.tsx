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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Inbox, Clock, CheckCircle, BarChart3, Plus, Eye, CircleAlert, MinusCircle, InfoIcon, Search, Trash2, Calendar as CalendarIcon } from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
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
      const emailLower = email.toLowerCase();
      const isCompanyEmail = email.endsWith("@taleemabad.com") || email.endsWith("@niete.edu.pk");
      const isTestEmail = TEST_EMAILS.includes(emailLower);
      
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
        // Automatically redirect based on email domain or test email
        if (isCompanyEmail || isTestEmail) {
          // Company email or test email → likely a requester, send to signup
          localStorage.setItem("selected_role", "requester");
          setLocation("/requester-signup");
        } else {
          // Non-company email → must be added by admin
          toast({
            title: "Access Restricted",
            description: "Please contact your Data Lead to get access. Only team leads with company emails can self-register.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/api/logout";
          }, 3000);
        }
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

  // Fetch stats
  const { data: stats } = useQuery<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
  }>({
    queryKey: ["/api/analytics/stats"],
    enabled: isAuthenticated,
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
      setSelectedRequest(null);
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

  const getStatusBadge = (status: string) => {
    const variants = {
      pending_review: "gradient-badge-review",
      accepted: "gradient-badge-progress",
      rejected: "gradient-badge-cancelled",
      assigned: "gradient-badge-progress",
      in_progress: "gradient-badge-progress",
      blocked: "gradient-badge-cancelled",
      completed: "gradient-badge-completed",
      cancelled: "gradient-badge-cancelled",
    };
    return variants[status as keyof typeof variants] || "gradient-badge-submitted";
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
      
      <div className="flex">
        <Sidebar onNewRequest={() => setLocation("/requests/new")} user={user as any} />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Requests</p>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                      <Inbox className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats?.totalRequests || 0}</p>
                  <p className="text-xs mt-1 font-medium text-green-600 dark:text-green-400">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{background: 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 71%, 50%) 100%)'}}></span>
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">In Progress</p>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(48, 92%, 55%) 100%)'}}>
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats?.inProgress || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active requests</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed</p>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, hsl(142, 71%, 45%) 0%, hsl(152, 71%, 50%) 100%)'}}>
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats?.completed || 0}</p>
                  <p className="text-xs mt-1 font-medium text-green-600 dark:text-green-400">
                    {stats?.totalRequests ? Math.round((stats.completed / stats.totalRequests) * 100) : 0}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all rounded-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg. Completion</p>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stats?.avgCompletionDays || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">days</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters and Actions */}
          <Card className="mb-4 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
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
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.department || "all"} onValueChange={(value) => setFilters({...filters, department: value === "all" ? "" : value})}>
                    <SelectTrigger className="w-40" data-testid="select-department">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
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
                    New Request
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No requests found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request: DataRequestWithDetails) => (
                      <TableRow 
                        key={request.id} 
                        className="table-row"
                        onClick={() => setSelectedRequest(request)}
                        data-testid={`row-request-${request.id}`}
                      >
                        <TableCell className="font-medium">
                          <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${calculateUrgency(request).colorClass}`}>
                            {calculateUrgency(request).label}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.title}</TableCell>
                        <TableCell className="capitalize">{request.department}</TableCell>
                        <TableCell>{formatRequestType(request.type)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(request.priority)}
                            <span className="capitalize">{request.priority}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`status-badge ${getStatusBadge(request.status)}`}>
                            {formatStatus(request.status)}
                          </Badge>
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
                        <TableCell>{formatDate(request.dueDate.toString())}</TableCell>
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
                            {(user as any)?.role === "data_analyst" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${request.title}"?`)) {
                                    deleteRequestMutation.mutate(request.id);
                                  }
                                }}
                                data-testid={`button-delete-${request.id}`}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
        <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden" aria-describedby={undefined}>
          {selectedRequest && (
            <RequestDetail 
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
                queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
