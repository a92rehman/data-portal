import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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

export default function AllRequests() {
  const { user, isLoading: authLoading } = useAuth();
  const { connectionStatus } = useWebSocketContext();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    department: "",
    priority: "",
    type: "",
  });

  // Fetch all requests (Data Lead can see all)
  const { data: requests = [], isLoading, refetch } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests", filters],
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
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              All Requests
            </h2>
            <p className="text-muted-foreground">
              View and manage all data requests across the organization
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
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
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
                          {request.id.slice(0, 8)}...
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
                            <Eye className="w-4 h-4 mr-2" />
                            View
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
