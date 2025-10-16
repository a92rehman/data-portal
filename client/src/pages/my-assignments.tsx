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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Search, Eye, CircleAlert, MinusCircle, InfoIcon, Calendar as CalendarIcon } from "lucide-react";
import type { DataRequestWithDetails } from "@shared/schema";
import { calculateUrgency } from "@/lib/urgency";
import { format } from "date-fns";

export default function MyAssignments() {
  const { user, isLoading: authLoading } = useAuth();
  const { connectionStatus } = useWebSocketContext();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    type: "",
    dateFilter: "",
    startDate: "",
    endDate: "",
  });
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Fetch requests assigned to current user (analyst or data lead)
  // For data leads, we pass assignedToId filter to get only their assigned requests
  const queryParams = (user as any)?.role === 'team_lead' 
    ? { assignedToId: (user as any)?.id, ...filters }
    : { ...filters };
    
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
        
        <main className="flex-1 ml-64 p-6">
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
                    placeholder="Search assignments..."
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
                    <SelectItem value="new_dashboard">New Dashboard</SelectItem>
                    <SelectItem value="modify_dashboard">Modify Dashboard</SelectItem>
                    <SelectItem value="adhoc_analysis">Ad-hoc Analysis</SelectItem>
                    <SelectItem value="data_extraction">Data Extraction</SelectItem>
                    <SelectItem value="data_bug">Data Bug</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.dateFilter || "all"} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-40" data-testid="select-date">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {filters.dateFilter === "custom" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-64" data-testid="button-date-picker">
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
                        mode="range"
                        selected={dateRange}
                        onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                        numberOfMonths={2}
                        data-testid="calendar-date-picker"
                      />
                    </PopoverContent>
                  </Popover>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id} className="hover:bg-purple-50/50 transition-colors">
                        <TableCell className="font-mono text-xs" data-testid={`cell-id-${request.id}`}>
                          <Badge className={`px-2 py-1 rounded-full text-xs font-semibold ${calculateUrgency(request).colorClass}`}>
                            {calculateUrgency(request).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`cell-type-${request.id}`}>
                          {formatRequestType(request.type)}
                        </TableCell>
                        <TableCell data-testid={`cell-status-${request.id}`}>
                          <Badge className={`status-badge ${getStatusBadge(request.status)}`}>
                            {formatStatus(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize" data-testid={`cell-department-${request.id}`}>
                          {request.department}
                        </TableCell>
                        <TableCell data-testid={`cell-priority-${request.id}`}>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(request.priority)}
                            <span className="text-sm">{formatPriority(request.priority)}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-requester-${request.id}`}>
                          {request.requestedBy.firstName} {request.requestedBy.lastName}
                        </TableCell>
                        <TableCell data-testid={`cell-created-${request.id}`}>
                          {request.createdAt ? formatDate(request.createdAt.toString()) : 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-date-${request.id}`}>
                          {request.dueDate ? formatDate(request.dueDate.toString()) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
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
          <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col p-0 overflow-hidden [&>button]:hidden" aria-describedby={undefined}>
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
