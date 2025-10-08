import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Users, Mail } from "lucide-react";
import type { User } from "@shared/schema";

export default function Team() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: analysts = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users/analysts"],
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
        return "Data & Impact Lead";
      case "analyst":
        return "Analyst";
      case "requester":
        return "Requester";
      default:
        return role;
    }
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
        <Sidebar onNewRequest={() => {}} user={user as any} />
        
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Team Management
            </h2>
            <p className="text-muted-foreground">
              View and manage your data analytics team
            </p>
          </div>

          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-2 border-purple-200 shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Analysts</p>
                    <p className="text-3xl font-bold text-foreground">{analysts.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysts Grid */}
          <Card className="border-2 border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Data Analysts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No analysts found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysts.map((analyst) => (
                    <Card key={analyst.id} className="border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={analyst.profileImageUrl ?? ""} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                              {getInitials(analyst.firstName ?? undefined, analyst.lastName ?? undefined)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {analyst.firstName} {analyst.lastName}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{analyst.email}</span>
                            </div>
                            <Badge className={`text-xs ${getRoleBadgeColor(analyst.role || 'analyst')}`}>
                              {formatRole(analyst.role || 'analyst')}
                            </Badge>
                            {analyst.department && (
                              <Badge variant="outline" className="text-xs ml-2 capitalize">
                                {analyst.department}
                              </Badge>
                            )}
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
    </div>
  );
}
