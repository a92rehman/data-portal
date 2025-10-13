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
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import RequestDetail from "@/components/request-detail";
import { Search, Eye, CircleAlert, MinusCircle, InfoIcon } from "lucide-react";
import type { DataRequestWithDetails } from "@shared/schema";
import { calculateUrgency } from "@/lib/urgency";

export default function MyRequests() {
  const { user, isLoading: authLoading } = useAuth();
  const { connectionStatus } = useWebSocketContext();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    department: "all",
    priority: "all",
    type: "all",
  });

  // Fetch requests submitted by current user
  const apiFilters = {
    status: filters.status === "all" ? "" : filters.status,
    department: filters.department === "all" ? "" : filters.department,
    priority: filters.priority === "all" ? "" : filters.priority,
    type: filters.type === "all" ? "" : filters.type,
    requestedById: (user as any)?.id,
  };
  
  const { data: requests = [], isLoading, refetch } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests", apiFilters],
    staleTime: Infinity,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    enabled: !!(user as any)?.id, // Only fetch when user ID is available
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
      case "bigquery_access":
        return "BigQuery Access";
      case "event_tracking":
        return "Event Tracking";
      case "metric_change":
        return "Metric Change";
      case "pipeline_change":
        return "Pipeline Change";
      case "recurring_report":
        return "Recurring Report";
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
    const statusMap: Record<string, string> = {
      submitted: "Submitted",
      under_review: "Under Review",
      pending_review: "Pending Review",
      rejected: "Rejected",
      accepted: "Accepted",
      assigned: "Assigned",
      in_progress: "In Progress",
      blocked: "Blocked",
      completed: "Completed",
      cancelled: "Cancelled"
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
      case "under_review":
      case "pending_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "assigned":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "in_progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "blocked":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "completed":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "p0_critical":
        return <CircleAlert className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "p1_high":
        return <CircleAlert className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case "p2_medium":
        return <MinusCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "p3_low":
        return <InfoIcon className="w-4 h-4 text-green-600 dark:text-green-400" />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar onNewRequest={() => setLocation("/requests/new")} user={user} />

        <main className="flex-1 p-8 mt-[73px]">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              My Requests
            </h2>
            <p className="text-muted-foreground mb-6">
              View all requests you have submitted
            </p>

            {/* Filters */}
            <Card className="mb-4 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.priority}
                    onValueChange={(value) => setFilters({ ...filters, priority: value })}
                  >
                    <SelectTrigger className="w-full md:w-48" data-testid="select-priority-filter">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="p0_critical">P0 - Critical</SelectItem>
                      <SelectItem value="p1_high">P1 - High</SelectItem>
                      <SelectItem value="p2_medium">P2 - Medium</SelectItem>
                      <SelectItem value="p3_low">P3 - Low</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No requests found
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
                          <TableCell className="font-medium" data-testid={`cell-title-${request.id}`}>
                            {request.title}
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
                          <TableCell data-testid={`cell-assigned-${request.id}`}>
                            {request.assignedTo ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}` : 'Unassigned'}
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
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] p-6 overflow-y-auto">
          {selectedRequest && (
            <RequestDetail
              request={selectedRequest}
              onClose={() => setSelectedRequest(null)}
              onUpdate={() => {
                setSelectedRequest(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
