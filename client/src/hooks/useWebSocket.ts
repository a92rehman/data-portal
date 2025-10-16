import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getNotificationPriority, playNotificationSound, getPriorityIcon } from '@/lib/notificationUtils';

interface TypingIndicator {
  requestId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export function useWebSocket(userId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const userIdRef = useRef(userId);
  const isConnectingRef = useRef(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const [typingByRequest, setTypingByRequest] = useState<Record<string, string[]>>({});
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Update userId ref when it changes
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Convert Map to grouped object whenever typingUsers changes
  useEffect(() => {
    const grouped: Record<string, string[]> = {};
    typingUsers.forEach((indicator) => {
      if (indicator.isTyping) {
        if (!grouped[indicator.requestId]) {
          grouped[indicator.requestId] = [];
        }
        if (!grouped[indicator.requestId].includes(indicator.userName)) {
          grouped[indicator.requestId].push(indicator.userName);
        }
      }
    });
    setTypingByRequest(grouped);
  }, [typingUsers]);

  const connect = useCallback(() => {
    const currentUserId = userIdRef.current;
    
    // Don't connect if no userId or already connecting/connected
    if (!currentUserId || isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection if it's closing or closed
    if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      isConnectingRef.current = false;
      setConnectionStatus('connected');
      ws.send(JSON.stringify({ type: 'auth', userId: currentUserId }));
    };

    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        console.log('[WebSocket] Received notification:', notification);
        
        if (notification.type === 'typing_indicator') {
          // Handle typing indicator
          const key = `${notification.requestId}-${notification.userId}`;
          setTypingUsers(prev => {
            const updated = new Map(prev);
            if (notification.isTyping) {
              updated.set(key, notification);
              // Auto-clear after 3 seconds
              setTimeout(() => {
                setTypingUsers(current => {
                  const newMap = new Map(current);
                  newMap.delete(key);
                  return newMap;
                });
              }, 3000);
            } else {
              updated.delete(key);
            }
            return updated;
          });
        } else {
          // Handle other notifications
          console.log('[WebSocket] Invalidating queries for notification');
          
          // Determine priority and show toast
          const priority = getNotificationPriority(notification);
          const priorityIcon = getPriorityIcon(priority);
          
          // Play notification sound
          playNotificationSound(priority);
          
          // Show toast notification
          const toastConfig = {
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          };
          
          if (priority === 'critical') {
            toast.error(`${priorityIcon} ${notification.title}`, {
              ...toastConfig,
              autoClose: 8000, // Show longer for critical
            });
          } else if (priority === 'high') {
            toast.warning(`${priorityIcon} ${notification.title}`, toastConfig);
          } else {
            toast.info(`${priorityIcon} ${notification.title}`, toastConfig);
          }
          
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
          
          if (notification.requestId) {
            queryClient.invalidateQueries({ queryKey: ['/api/requests', notification.requestId] });
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      isConnectingRef.current = false;
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected. Code:', event.code, 'Reason:', event.reason);
      isConnectingRef.current = false;
      setConnectionStatus('disconnected');
      wsRef.current = null;
      
      // Only reconnect if we still have a userId and it wasn't a clean close
      if (userIdRef.current && event.code !== 1000) {
        console.log('[WebSocket] Reconnecting in 3 seconds...');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };
  }, [queryClient]);

  const sendTyping = useCallback((requestId: string, isTyping: boolean, userName: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        requestId,
        isTyping,
        userName
      }));
    }
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      console.log('[WebSocket] Cleanup - closing connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, [userId, connect]);

  return { 
    ws: wsRef.current, 
    sendTyping, 
    typingUsers: typingByRequest,
    connectionStatus 
  };
}
