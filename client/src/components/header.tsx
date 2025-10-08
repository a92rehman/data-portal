import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, ChartLine, X, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import type { User, Notification } from "@shared/schema";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = notifications.filter(n => n.read === 'false').length;

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest('PATCH', `/api/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('PATCH', '/api/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (notification.read === 'false') {
      markAsReadMutation.mutate(notification.id);
    }
    setIsNotificationOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

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

          <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative border-2 border-transparent hover:border-purple-300 rounded-lg transition-all" 
                data-testid="button-notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end" data-testid="popover-notifications">
              <div className="border-b px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
                <h3 className="font-semibold text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    className="text-xs text-purple-600 hover:text-purple-800"
                    data-testid="button-mark-all-read"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.requestId ? `/request/${notification.requestId}` : '#'}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div
                          className={`p-4 cursor-pointer transition-colors hover:bg-purple-50 ${
                            notification.read === 'false' ? 'bg-blue-50' : 'bg-white'
                          }`}
                          data-testid={`notification-${notification.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${notification.read === 'false' ? 'text-purple-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            {notification.read === 'false' && (
                              <div className="w-2 h-2 bg-purple-600 rounded-full mt-1 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

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
