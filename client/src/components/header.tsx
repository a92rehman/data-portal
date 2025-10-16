import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Search, ChartLine, X, Check, ArrowLeft, Moon, Sun, Settings, LogOut, Menu } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocketContext } from "@/contexts/WebSocketContext";
import type { User, Notification } from "@shared/schema";
import MobileNav from "@/components/mobile-nav";

interface HeaderProps {
  user: User | null;
}

export default function Header({ user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'dark';
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return isDark;
    }
    return false;
  });

  const { sendTyping, typingUsers, connectionStatus } = useWebSocketContext();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
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
    
    // Stay on current page and add requestId param to open dialog
    if (notification.requestId) {
      // Get current path (remove any existing query params)
      const currentPath = location.split('?')[0];
      setLocation(`${currentPath}?requestId=${notification.requestId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsProfileOpen(false);
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSettingsClick = () => {
    setIsProfileOpen(false);
    setLocation("/settings");
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b-2 border-purple-200 dark:border-purple-700 sticky top-0 z-40 shadow-md">
      <div className="flex items-center justify-between px-6 py-4 pt-[12px] pb-[12px]">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="border-2 border-transparent hover:border-purple-300 rounded-lg transition-all"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
            <ChartLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">Taleemabad DataHub</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Request Management System</p>
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

          <div className="flex items-center gap-2">
            {/* WebSocket Connection Status Indicator */}
            <div className="flex items-center gap-1.5" title={`Real-time updates: ${connectionStatus}`}>
              <div className={`w-2 h-2 rounded-full transition-all ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 
                 'Offline'}
              </span>
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
              <div className="border-b px-4 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
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
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 cursor-pointer transition-colors border-l-4 ${
                          notification.read === 'false' 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-purple-500 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                            : 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${notification.read === 'false' ? 'text-purple-900 dark:text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-2">
                              {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              {notification.read === 'true' && (
                                <span className="text-gray-400 dark:text-gray-500">• Read</span>
                              )}
                            </p>
                          </div>
                          {notification.read === 'false' && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full mt-1 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
          </div>

          <Popover open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-3 pl-4 border-l-2 border-purple-200 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg px-3 py-2 -mr-3 transition-all"
                data-testid="button-profile"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground" data-testid="text-user-name">
                    {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "User"}
                  </p>
                  <p className="text-xs font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent capitalize" data-testid="text-user-role">
                    {user?.role?.replace("_", " ") || "Team Member"}
                  </p>
                </div>
                <Avatar className="w-10 h-10 border-2 border-purple-300 hover:border-purple-500 transition-all shadow-md" data-testid="avatar-user">
                  <AvatarImage src={user?.profileImageUrl ?? ""} />
                  <AvatarFallback className="font-bold text-white" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                    {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end" data-testid="popover-profile">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-purple-300 shadow-md">
                    <AvatarImage src={user?.profileImageUrl ?? ""} />
                    <AvatarFallback className="font-bold text-white" style={{background: 'linear-gradient(135deg, hsl(239, 84%, 67%) 0%, hsl(260, 84%, 70%) 100%)'}}>
                      {getInitials(user?.firstName ?? undefined, user?.lastName ?? undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <p className="text-xs font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent capitalize mt-1">
                      {user?.role?.replace("_", " ") || "Team Member"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <div className="px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isDarkMode ? (
                        <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-sm font-medium">Dark Mode</span>
                    </div>
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={toggleDarkMode}
                      data-testid="switch-dark-mode-header"
                    />
                  </div>
                </div>

                <Separator className="my-2" />

                <button
                  onClick={handleSettingsClick}
                  className="w-full px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-3 text-left"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium">Settings</span>
                </button>

                <Separator className="my-2" />

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3 text-left text-red-600 dark:text-red-400"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
