interface Conversation {
  id: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  lastMessageAt: Date;
}

// In-memory store (for MVP)
const conversations = new Map<string, Conversation>();

// Auto-cleanup old conversations
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [id, conv] of conversations.entries()) {
    if (now - conv.lastMessageAt.getTime() > ONE_HOUR) {
      conversations.delete(id);
    }
  }
}, 15 * 60 * 1000); // Clean every 15 minutes

export function getOrCreateConversation(id: string, userId: string): Conversation {
  if (!conversations.has(id)) {
    conversations.set(id, {
      id,
      userId,
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date()
    });
  }
  
  const conv = conversations.get(id)!;
  conv.lastMessageAt = new Date();
  return conv;
}

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

