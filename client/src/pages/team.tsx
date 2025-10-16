import { useState, useEffect } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Users, Mail, UserCog, UserMinus, Settings, UserPlus } from "lucide-react";
import type { User } from "@shared/schema";
import emailjs from "@emailjs/browser";

export default function Team() {
  const [emailJSConfig, setEmailJSConfig] = useState<{serviceId: string, templateId: string, publicKey: string} | null>(null);
  
  // Initialize EmailJS
  useEffect(() => {
    // Fetch EmailJS config from server
    fetch('/api/emailjs-config')
      .then(res => res.json())
      .then(config => {
        console.log('[EmailJS] Config fetched from server:', { hasServiceId: !!config.serviceId, hasTemplateId: !!config.templateId, hasPublicKey: !!config.publicKey });
        setEmailJSConfig(config);
        if (config.publicKey) {
          emailjs.init(config.publicKey);
          console.log('[EmailJS] Initialized successfully with public key');
        } else {
          console.error('[EmailJS] Public key not found in server config');
        }
      })
      .catch(error => {
        console.error('[EmailJS] Failed to fetch config:', error);
      });
  }, []);
  
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberDepartment, setNewMemberDepartment] = useState("");
  const [newMemberName, setNewMemberName] = useState("");

  const isDataLead = (user as any)?.role === "team_lead";

  const { data: allUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isDataLead,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; firstName?: string; lastName?: string; email?: string; role?: string; department?: string }) => {
      return await apiRequest("PATCH", `/api/users/${data.userId}`, { 
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role, 
        department: data.department 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User information updated successfully",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      setEditFirstName("");
      setEditLastName("");
      setEditEmail("");
      setEditRole("");
      setEditDepartment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user information",
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
    mutationFn: async (data: { email: string; role: string; department?: string; name?: string }) => {
      return await apiRequest("POST", "/api/users/invite", data);
    },
    onSuccess: async (response: any, variables) => {
      console.log('[Frontend] Mutation success! Response:', response);
      console.log('[Frontend] Variables:', variables);
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // If analyst was invited and password was generated, send email via EmailJS
      if (variables.role === 'analyst' && response.generatedPassword) {
        console.log('[Frontend] Step 6: Analyst invited, received password from server');
        console.log('[Frontend] Step 7: Preparing to send email via EmailJS');
        
        try {
          const inviterName = user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).email : 'Data Lead';
          
          const emailParams = {
            to_email: variables.email,
            to_name: variables.email.split('@')[0],
            analyst_name: variables.email.split('@')[0],
            analyst_email: variables.email,
            analyst_password: response.generatedPassword,
            inviter_name: inviterName,
          };
          
          console.log('[Frontend] Step 8: EmailJS parameters prepared:', {
            to_email: emailParams.to_email,
            to_name: emailParams.to_name,
            analyst_name: emailParams.analyst_name,
            analyst_email: emailParams.analyst_email,
            password_length: emailParams.analyst_password.length,
            inviter_name: emailParams.inviter_name,
          });
          
          console.log('[Frontend] Step 9: Sending email via EmailJS...');
          console.log('[Frontend] Service ID:', emailJSConfig?.serviceId);
          console.log('[Frontend] Template ID:', emailJSConfig?.templateId);
          
          if (!emailJSConfig) {
            throw new Error('EmailJS not configured');
          }
          
          const result = await emailjs.send(
            emailJSConfig.serviceId,
            emailJSConfig.templateId,
            emailParams
          );
          
          console.log('[Frontend] Step 10: Email sent successfully via EmailJS!', result);
          
          toast({
            title: "Success",
            description: "Analyst invited successfully. Login credentials have been sent via email.",
          });
        } catch (emailError) {
          console.error('[Frontend] Step 10: EmailJS failed to send email:', emailError);
          toast({
            title: "Analyst Invited",
            description: "User created but email delivery failed. Please contact the analyst directly.",
            variant: "destructive",
          });
        }
      } else {
        // For team_lead and requester, invitation email is sent via Brevo from backend
        const roleText = variables.role === 'team_lead' ? 'Data Lead' : 'Data Requester';
        toast({
          title: "Success",
          description: `${roleText} invited successfully. Invitation email has been sent to ${variables.email}.`,
        });
      }
      
      setShowAddMemberDialog(false);
      setNewMemberEmail("");
      setNewMemberRole("");
      setNewMemberDepartment("");
      setNewMemberName("");
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

  // Primary Data Lead - cannot have role changed
  const PRIMARY_DATA_LEAD_EMAIL = "abdur.rehman@taleemabad.com";
  
  const isPrimaryDataLead = (member: User) => {
    return member.email?.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL;
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "");
    setEditDepartment(user.department || "");
    setShowEditDialog(true);
  };

  const handleRemoveUser = (user: User) => {
    setSelectedUser(user);
    setShowRemoveDialog(true);
  };

  const submitUserEdit = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        userId: selectedUser.id,
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        role: editRole,
        department: editDepartment || undefined,
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
        name: newMemberName || undefined,
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
        <div>
          <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
          <main className="md:ml-64 p-6 flex items-center justify-center">
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
      
      <div>
        <Sidebar onNewRequest={() => setLocation("/?new=true")} user={user as any} />
        
        <main className="md:ml-64 p-6">
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((member) => (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={member.profileImageUrl ?? ""} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                                  {getInitials(member.firstName ?? undefined, member.lastName ?? undefined)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-foreground">
                                  {member.firstName} {member.lastName}
                                </div>
                                {isPrimaryDataLead(member) && (
                                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 mt-1">
                                    Primary Lead
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-4 h-4" />
                              {member.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeColor(member.role || '')}`}>
                              {formatRole(member.role || '')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.department ? (
                              <Badge variant="outline" className="capitalize">
                                {member.department}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(member)}
                                data-testid={`button-edit-${member.id}`}
                                disabled={isPrimaryDataLead(member)}
                                title={isPrimaryDataLead(member) ? "Primary Data Lead information cannot be modified" : "Edit user information"}
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveUser(member)}
                                data-testid={`button-remove-${member.id}`}
                                disabled={member.id === (user as any)?.id || isPrimaryDataLead(member)}
                                title={isPrimaryDataLead(member) ? "Primary Data Lead cannot be removed" : ""}
                              >
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent data-testid="dialog-edit-user" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Information</DialogTitle>
            <DialogDescription>
              Update all information for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name" className="text-sm font-medium mb-2">First Name</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  data-testid="input-edit-first-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-last-name" className="text-sm font-medium mb-2">Last Name</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium mb-2">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="email@example.com"
                data-testid="input-edit-email"
              />
            </div>
            <div>
              <Label htmlFor="edit-role" className="text-sm font-medium mb-2">Role</Label>
              <Select value={editRole} onValueChange={setEditRole} data-testid="select-edit-role">
                <SelectTrigger id="edit-role">
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
              <Label htmlFor="edit-department" className="text-sm font-medium mb-2">Department (Optional)</Label>
              <Input
                id="edit-department"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                placeholder="e.g., Marketing, Engineering..."
                data-testid="input-edit-department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
                setEditFirstName("");
                setEditLastName("");
                setEditEmail("");
                setEditRole("");
                setEditDepartment("");
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={submitUserEdit}
              disabled={!editFirstName || !editLastName || !editEmail || !editRole || updateUserMutation.isPending}
              data-testid="button-confirm-edit"
              className="gradient-button-primary text-white font-semibold"
              style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
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
              <Label className="text-sm font-medium text-foreground mb-2 block">Full Name</Label>
              <Input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g., John Doe"
                data-testid="input-member-name"
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
                setNewMemberName("");
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
