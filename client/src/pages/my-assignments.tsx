import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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

export default function MyAssignments() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<DataRequestWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Fetch requests assigned to current analyst (backend filters by role automatically)
  const { data: requests = [], isLoading, refetch } = useQuery<DataRequestWithDetails[]>({
    queryKey: ["/api/requests", { status: statusFilter }],
    staleTime: Infinity,
  });

  const filteredRequests = (requests || []).filter((request: DataRequestWithDetails) =>
    request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.primaryQuestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.businessProblem.toLowerCase().includes(searchQuery.toLowerCase())
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
              My Assignments
            </h2>
            <p className="text-muted-foreground">
              Manage requests assigned to you
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-4 border-2 border-gray-200 shadow-md">
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

                <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-40" data-testid="select-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card className="border-2 border-gray-200 shadow-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No assignments found
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
                        <TableCell data-testid={`cell-requester-${request.id}`}>
                          {request.requestedBy.firstName} {request.requestedBy.lastName}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
