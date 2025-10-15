import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Search, Eye, CircleAlert, MinusCircle, InfoIcon, Calendar as CalendarIcon } from "lucide-react";
import type { DataRequestWithDetails, User } from "@shared/schema";
import { DEPARTMENTS } from "@shared/constants";
import { format } from "date-fns";
import { calculateUrgency } from "@/lib/urgency";

export default function RequestAssignments() {
  const { user, isLoading: authLoading } = useAuth();
  const { connectionStatus } = useWebSocketContext();
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
    enabled: authLoading === false && ((user as any)?.role === "team_lead" || (user as any)?.role === "analyst"),
  });

  // Fetch requests assigned to current user (analyst or data lead)
  // For team leads: if they haven't selected a specific analyst in the filter, show only their assignments
  // For analysts: use all filters as-is
  const queryParams = (user as any)?.role === 'team_lead' 
    ? { ...filters, assignedToId: filters.assignedToId || (user as any)?.id }
    : filters;
    
  const { data: requests = [], isLoading, refetch } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests", queryParams],
    staleTime: Infinity,
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
  }, [searchString, location, setLocation]);

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

  const filteredRequests = (requests || []).filter((request: DataRequestWithDetails) =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.primaryQuestion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.businessProblem?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const formatPriority = (priority: string) => {
    switch (priority) {
      case "p0_critical":
        return "P0 - Critical";
      case "p1_high":
        return "P1 - High";
      case "p2_medium":
        return "P2 - Medium";
      case "p3_low":
        return "P3 - Low";
      default:
        return priority;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
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
      'assigned': 2, // Same as accepted - it's the initial state after assignment
      'in_progress': 3,
      'blocked': 4,
      'completed': 5,
      'rejected': 6,
      'cancelled': 6, // Same as rejected - terminal state
    };
    
    const orderA = statusOrder[a.status as keyof typeof statusOrder] || 999;
    const orderB = statusOrder[b.status as keyof typeof statusOrder] || 999;
    
    // Primary sort: by status
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Secondary sort: by creation date (newest first)
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  if (authLoading || isLoading) {
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
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              My Assignments
            </h2>
            <p className="text-muted-foreground">
              Manage requests assigned to you
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-4 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
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
                  {sortedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-purple-50/50 transition-colors" onClick={() => setSelectedRequest(request)}>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                            }}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Work On
                          </Button>
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

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden" aria-describedby={undefined}>
            <RequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={() => {
                refetch();
                setSelectedRequest(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
