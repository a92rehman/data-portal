import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface DashboardInsightsContext {
  dashboardId: string;
  dashboardTitle: string;
  dataContext: any;
  userRole: string;
}

/**
 * Generate 3-5 key insights from dashboard data
 */
export async function generateDashboardInsights(
  context: DashboardInsightsContext
): Promise<Array<{
  title: string;
  description: string;
  trend?: "up" | "down" | "neutral";
  change?: number;
  metric?: string;
}>> {
  const prompt = `You are analyzing the "${context.dashboardTitle}" dashboard for a ${context.userRole}.

Current data:
${JSON.stringify(context.dataContext, null, 2)}

Generate 3-5 key insights in JSON format. Each insight should have:
- title: Short, actionable title (max 50 chars)
- description: Brief explanation (max 100 chars)
- trend: "up", "down", or "neutral" (optional)
- change: percentage change if applicable (optional)
- metric: which metric this relates to (optional)

Focus on:
1. Notable trends or changes
2. Anomalies or unexpected patterns
3. Performance highlights or concerns
4. Actionable recommendations

Return ONLY valid JSON array, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data analyst providing insights from dashboard metrics. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '[]';
    let insights;
    try {
      insights = JSON.parse(content);
    } catch {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        insights = [];
      }
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating insights:', error);
    
    // Fallback insights
    return generateFallbackInsights(context.dataContext);
  }
}

/**
 * Handle chat messages with dashboard context
 */
export async function sendChatMessage(params: {
  message: string;
  conversation: any;
  dashboardContext: any;
  userRole: string;
}): Promise<string> {
  const systemPrompt = `You are an AI assistant helping users understand their ${params.dashboardContext.dashboardTitle || 'dashboard'}.

Current dashboard data:
${JSON.stringify(params.dashboardContext.data || {}, null, 2)}

User role: ${params.userRole}

Answer questions about the data, provide explanations, and offer insights. Be concise and helpful. Keep responses under 200 words.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...params.conversation.messages.slice(-10).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })), // Last 10 messages for context
    { role: 'user', content: params.message }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'I apologize, I could not process your question.';
  } catch (error) {
    console.error('Error in chat:', error);
    throw new Error('Failed to get response from AI');
  }
}

function generateFallbackInsights(data: any): any[] {
  const insights = [];
  
  if (data.completed && data.totalRequests) {
    const rate = Math.round((data.completed / data.totalRequests) * 100);
    insights.push({
      title: `${rate}% Completion Rate`,
      description: `${data.completed} of ${data.totalRequests} requests completed`,
      trend: rate > 50 ? "up" : "down",
      metric: "completion"
    });
  }
  
  if (data.avgCompletion) {
    insights.push({
      title: `${data.avgCompletion} Days Average`,
      description: `Average time to complete requests`,
      trend: "neutral",
      metric: "duration"
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      title: 'Dashboard Ready',
      description: 'Your dashboard data is available for analysis',
      trend: "neutral"
    });
  }
  
  return insights;
}

/**
 * Get dashboard context data for chat
 */
export async function getDashboardContextData(
  dashboardId: string,
  userId: string,
  userRole: string,
  storage: any
): Promise<any> {
  // Fetch relevant data based on dashboard
  if (dashboardId === 'program-delivery') {
    // Fetch program-specific metrics
    const requestStats = await storage.getRequestStats(userId, userRole);
    const taskStats = await storage.getTaskStats();
    
    return {
      totalRequests: requestStats.totalRequests,
      completed: requestStats.completed,
      inProgress: requestStats.inProgress,
      avgCompletion: requestStats.avgCompletionDays,
      taskCompletion: taskStats.completed,
      totalTasks: taskStats.totalTasks,
    };
  }
  
  // Default return for other dashboards
  return {};
}

