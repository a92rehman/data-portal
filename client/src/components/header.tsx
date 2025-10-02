import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, ChartLine } from "lucide-react";
import type { User } from "@shared/schema";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white border-b-2 border-purple-200 sticky top-0 z-40 shadow-md">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">Taleemabad Data Requests</h1>
            <p className="text-xs text-gray-500">Request Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 border-2 border-gray-200 focus:border-purple-400 transition-colors"
              data-testid="input-header-search"
            />
          </div>

          <Button variant="ghost" size="sm" className="relative border-2 border-transparent hover:border-purple-300 rounded-lg transition-all" data-testid="button-notifications">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          <div className="flex items-center gap-3 pl-4 border-l-2 border-purple-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground" data-testid="text-user-name">
                {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "User"}
              </p>
              <p className="text-xs font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent capitalize" data-testid="text-user-role">
                {user?.role?.replace("_", " ") || "Team Member"}
              </p>
            </div>
            <Avatar className="w-10 h-10 border-2 border-purple-300 cursor-pointer hover:border-purple-500 transition-all shadow-md" onClick={handleLogout} data-testid="avatar-user">
              <AvatarImage src={user?.profileImageUrl ?? ""} />
              <AvatarFallback className="font-bold text-white" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
