import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());

  const connect = useCallback(() => {
    if (!userId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({ type: 'auth', userId }));
    };

    ws.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        console.log('Received notification:', notification);
        
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
          queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
          queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
          
          if (notification.requestId) {
            queryClient.invalidateQueries({ queryKey: ['/api/requests', notification.requestId] });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    return ws;
  }, [userId, queryClient]);

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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, connect]);

  return { ws: wsRef.current, sendTyping, typingUsers };
}
