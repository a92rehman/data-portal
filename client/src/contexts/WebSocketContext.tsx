import { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WebSocketContextType {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  sendTyping: (requestId: string, isTyping: boolean, userName: string) => void;
  typingUsers: Record<string, string[]>;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children, userId }: { children: ReactNode; userId: string | undefined }) {
  const { connectionStatus, sendTyping, typingUsers } = useWebSocket(userId);

  return (
    <WebSocketContext.Provider value={{ connectionStatus, sendTyping, typingUsers }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
}
