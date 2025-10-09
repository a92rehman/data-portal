import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Users, Mail, UserCog, UserMinus, Settings, UserPlus } from "lucide-react";
import type { User } from "@shared/schema";

export default function Team() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberDepartment, setNewMemberDepartment] = useState("");

  const isDataLead = (user as any)?.role === "team_lead";

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isDataLead,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; department?: string }) => {
      return await apiRequest("PATCH", `/api/users/${data.userId}/role`, { 
        role: data.role, 
        department: data.department 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      setShowRoleDialog(false);
      setSelectedUser(null);
      setSelectedRole("");
      setSelectedDepartment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User removed successfully",
      });
      setShowRemoveDialog(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string; department?: string }) => {
      return await apiRequest("POST", "/api/users/invite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member invited successfully. They can now sign in.",
      });
      setShowAddMemberDialog(false);
      setNewMemberEmail("");
      setNewMemberRole("");
      setNewMemberDepartment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "analyst":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "team_lead":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "requester":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "team_lead":
        return "Data Lead";
      case "analyst":
        return "Data Analyst";
      case "requester":
        return "Data Requester";
      default:
        return role || "No Role";
    }
  };

  const handleChangeRole = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "");
    setSelectedDepartment(user.department || "");
    setShowRoleDialog(true);
  };

  const handleRemoveUser = (user: User) => {
    setSelectedUser(user);
    setShowRemoveDialog(true);
  };

  const submitRoleChange = () => {
    if (selectedUser && selectedRole) {
      updateRoleMutation.mutate({
        userId: selectedUser.id,
        role: selectedRole,
        department: selectedDepartment || undefined,
      });
    }
  };

  const submitRemoveUser = () => {
    if (selectedUser) {
      removeUserMutation.mutate(selectedUser.id);
    }
  };

  const handleAddMember = () => {
    setShowAddMemberDialog(true);
  };

  const submitAddMember = () => {
    if (newMemberEmail && newMemberRole) {
      addMemberMutation.mutate({
        email: newMemberEmail,
        role: newMemberRole,
        department: newMemberDepartment || undefined,
      });
    }
  };

  // Group users by role
  const analysts = allUsers.filter(u => u.role === 'analyst');
  const teamLeads = allUsers.filter(u => u.role === 'team_lead');
  const requesters = allUsers.filter(u => u.role === 'requester');
  const noRole = allUsers.filter(u => !u.role);

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

  if (!isDataLead) {
    return (
      <div className="min-h-screen">
        <Header user={user as any} />
        <div className="flex">
          <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
          <main className="flex-1 p-6 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Only Data Leads can access team management.</p>
              </CardContent>
            </Card>
          </main>
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
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Team Management
              </h2>
              <p className="text-muted-foreground">
                Manage team members, roles, and permissions
              </p>
            </div>
            <Button
              onClick={handleAddMember}
              className="font-semibold"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
              data-testid="button-add-member"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Members</p>
                    <p className="text-3xl font-bold text-foreground">{allUsers.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data Leads</p>
                    <p className="text-3xl font-bold text-foreground">{teamLeads.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(209, 89%, 53%) 100%)'}}>
                    <UserCog className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Analysts</p>
                    <p className="text-3xl font-bold text-foreground">{analysts.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Requesters</p>
                    <p className="text-3xl font-bold text-foreground">{requesters.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 71%, 45%) 100%)'}}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Team Members */}
          <Card className="border-2 border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No team members found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsers.map((member) => (
                    <Card key={member.id} className="border-2 border-gray-100 hover:border-gray-300 transition-all hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={member.profileImageUrl ?? ""} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                              {getInitials(member.firstName ?? undefined, member.lastName ?? undefined)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {member.firstName} {member.lastName}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{member.email}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <Badge className={`text-xs ${getRoleBadgeColor(member.role || '')}`}>
                                {formatRole(member.role || '')}
                              </Badge>
                              {member.department && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {member.department}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleChangeRole(member)}
                                data-testid={`button-change-role-${member.id}`}
                                className="flex-1"
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Change Role
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveUser(member)}
                                data-testid={`button-remove-${member.id}`}
                                disabled={member.id === (user as any)?.id}
                              >
                                <UserMinus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent data-testid="dialog-change-role">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role and department for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole} data-testid="select-new-role">
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Data Requester</SelectItem>
                  <SelectItem value="team_lead">Data Lead</SelectItem>
                  <SelectItem value="analyst">Data Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Department (Optional)</label>
              <Input
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                placeholder="e.g., Marketing, Engineering..."
                data-testid="input-department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRoleDialog(false);
                setSelectedUser(null);
                setSelectedRole("");
                setSelectedDepartment("");
              }}
              data-testid="button-cancel-role-change"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRoleChange}
              disabled={!selectedRole || updateRoleMutation.isPending}
              data-testid="button-confirm-role-change"
              className="gradient-button-primary text-white font-semibold"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent data-testid="dialog-remove-user">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedUser?.firstName} {selectedUser?.lastName} from the team? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveDialog(false);
                setSelectedUser(null);
              }}
              data-testid="button-cancel-remove"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitRemoveUser}
              disabled={removeUserMutation.isPending}
              data-testid="button-confirm-remove"
            >
              {removeUserMutation.isPending ? "Removing..." : "Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent data-testid="dialog-add-member">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a new team member. They will be able to sign in after being added.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Email Address</Label>
              <Input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="email@taleemabad.com"
                data-testid="input-member-email"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Role</Label>
              <Select value={newMemberRole} onValueChange={setNewMemberRole} data-testid="select-member-role">
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Data Requester</SelectItem>
                  <SelectItem value="team_lead">Data Lead</SelectItem>
                  <SelectItem value="analyst">Data Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Department (Optional)</Label>
              <Input
                value={newMemberDepartment}
                onChange={(e) => setNewMemberDepartment(e.target.value)}
                placeholder="e.g., Marketing, Engineering..."
                data-testid="input-member-department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMemberDialog(false);
                setNewMemberEmail("");
                setNewMemberRole("");
                setNewMemberDepartment("");
              }}
              data-testid="button-cancel-add-member"
            >
              Cancel
            </Button>
            <Button
              onClick={submitAddMember}
              disabled={!newMemberEmail || !newMemberRole || addMemberMutation.isPending}
              data-testid="button-confirm-add-member"
              className="gradient-button-primary text-white font-semibold"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
