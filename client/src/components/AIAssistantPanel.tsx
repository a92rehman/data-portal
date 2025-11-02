import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  dashboardId: string;
  dashboardTitle: string;
  reportId: string;
}

export default function AIAssistantPanel({
  dashboardId,
  dashboardTitle,
  reportId,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'powerbi' | 'fallback' | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Data source will be set when first message is sent and response is received

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendingMessage) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSendingMessage(true);

    try {
      const response = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          dashboardContext: {
            dashboardId,
            dashboardTitle,
            reportId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Check and set data source from response if available
      if (data.dataSource && !dataSource) {
        const source = data.dataSource === 'powerbi' ? 'powerbi' : 'fallback';
        setDataSource(source);
      }

      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Data Source Indicator */}
      {dataSource && (
        <div className="px-4 pt-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
              dataSource === 'powerbi' 
                ? 'bg-green-500/20 border border-green-400/30' 
                : 'bg-yellow-500/20 border border-yellow-400/30'
            }`}
          >
            {dataSource === 'powerbi' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Power BI Data</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">Fallback Data</span>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Full Chat Section */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Chat Messages - Scrollable */}
        <div 
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto p-4 min-h-0"
        >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground text-sm space-y-4"
          >
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Chat with your Dashboard AI</p>
            <p className="text-xs mb-4">Ask questions about your Program Delivery metrics</p>
            <div className="space-y-2 px-2">
              <p className="text-xs font-semibold text-muted-foreground">Try asking:</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setInput("What insights can you share about observation completion rates?")}
                className="block w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200/50 dark:border-purple-800/50"
              >
                💡 What insights can you share about observation completion rates?
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setInput("Which grade has the most observations completed?")}
                className="block w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200/50 dark:border-purple-800/50"
              >
                📊 Which grade has the most observations completed?
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setInput("What are the important actions we can take from the dashboard?")}
                className="block w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200/50 dark:border-purple-800/50"
              >
                🎯 What are the important actions we can take from the dashboard?
              </motion.button>
            </div>
          </motion.div>
        )}
        
        <div className="space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-foreground border border-purple-200/50 dark:border-purple-800/50'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </motion.div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </motion.div>
          ))}
          
          {sendingMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              </div>
            </motion.div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

        {/* Chat Input - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              placeholder="Ask about your dashboard..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sendingMessage}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || sendingMessage}
              size="icon"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

