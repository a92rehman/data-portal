import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InsightCard } from '@/components/InsightCard';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Insight {
  id: string;
  title: string;
  description: string;
  trend?: "up" | "down" | "neutral";
  change?: number;
  metric?: string;
}

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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const insightsScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-scroll to top when new insights arrive
  useEffect(() => {
    if (insights.length > 0) {
      insightsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [insights]);

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await fetch('/api/dashboard/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportId,
          dashboardId,
          dashboardTitle,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const data = await response.json();
      
      // Transform insights to add IDs
      const formattedInsights: Insight[] = data.insights.map((insight: any, index: number) => ({
        id: `insight-${Date.now()}-${index}`,
        title: insight.title || 'Insight',
        description: insight.description || '',
        trend: insight.trend || 'neutral',
        change: insight.change,
        metric: insight.metric,
      }));

      setInsights(formattedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
      // Show fallback insights
      setInsights([
        {
          id: 'fallback-1',
          title: 'Dashboard Analysis Ready',
          description: 'Your dashboard data is available for analysis',
          trend: 'neutral',
        },
      ]);
    } finally {
      setLoadingInsights(false);
    }
  };

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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-border">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Assistant
        </h3>
      </div>

      {/* Generate Insights Button - PROMINENT */}
      <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
        <Button 
          onClick={handleGenerateInsights}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
          size="lg"
          disabled={loadingInsights}
        >
          {loadingInsights ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {/* Insights Display - Scrollable */}
      <div 
        ref={insightsScrollRef}
        className="flex-1 overflow-y-auto p-4 border-b bg-gray-50 dark:bg-gray-800 min-h-0"
        style={{ maxHeight: '400px' }}
      >
        {insights.length === 0 && !loadingInsights && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click "Generate Insights" to analyze your dashboard</p>
          </div>
        )}
        
        <AnimatePresence>
          {insights.map((insight) => (
            <InsightCard key={insight.id} {...insight} />
          ))}
        </AnimatePresence>
      </div>

      {/* Chat Section - Scrollable */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Ask me anything about your dashboard</p>
          </div>
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
              
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              
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
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
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
  );
}

