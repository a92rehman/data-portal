import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WebSocketClient extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class NotificationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/notifications' });
    this.clients = new Map();
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private handleConnection(ws: WebSocketClient) {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.userId) {
          ws.userId = data.userId;
          if (!this.clients.has(data.userId)) {
            this.clients.set(data.userId, new Set());
          }
          this.clients.get(data.userId)!.add(ws);
        } else if (data.type === 'typing' && ws.userId) {
          // Broadcast typing indicator to other users
          this.broadcastTyping(ws.userId, data.requestId, data.isTyping, data.userName);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const userClients = this.clients.get(ws.userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            this.clients.delete(ws.userId);
          }
        }
      }
    });
  }

  private broadcastTyping(senderId: string, requestId: string, isTyping: boolean, userName: string) {
    // Broadcast to all connected users except the sender
    this.clients.forEach((userClients, userId) => {
      if (userId !== senderId) {
        userClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'typing_indicator',
              requestId,
              userId: senderId,
              userName,
              isTyping
            }));
          }
        });
      }
    });
  }

  public notifyUser(userId: string, notification: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(notification));
        }
      });
    }
  }

  public notifyMultipleUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => this.notifyUser(userId, notification));
  }
}

let wsServer: NotificationWebSocketServer | null = null;

export function setupWebSocketServer(server: Server) {
  wsServer = new NotificationWebSocketServer(server);
  return wsServer;
}

export function getWebSocketServer(): NotificationWebSocketServer | null {
  return wsServer;
}
