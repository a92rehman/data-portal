import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface InsightContext {
  userRole: string;
  department?: string;
  requestStats?: {
    totalRequests: number;
    completed: number;
    inProgress: number;
    avgCompletionDays: number;
    overdue: number;
  };
  taskStats?: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  teamWorkload?: Array<{
    firstName: string;
    lastName: string;
    capacityLevel: string;
    currentUtilization: number;
  }>;
}

// Cache for insights to reduce API calls
const insightCache = new Map<string, { insight: string; expiry: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Build a summary of the context data for the AI
 */
function buildContextSummary(context: InsightContext): string {
  const parts: string[] = [];

  if (context.requestStats) {
    const rs = context.requestStats;
    parts.push(`Request statistics: ${rs.totalRequests} total, ${rs.completed} completed, ${rs.inProgress} in progress. Average completion time: ${rs.avgCompletionDays} days. ${rs.overdue} overdue requests.`);
  }

  if (context.taskStats) {
    const ts = context.taskStats;
    parts.push(`Task statistics: ${ts.totalTasks} total, ${ts.completed} completed, ${ts.inProgress} in progress. ${ts.overdue} overdue tasks.`);
  }

  if (context.teamWorkload && context.teamWorkload.length > 0) {
    const capacityInfo = context.teamWorkload.map(member => {
      return `${member.firstName} ${member.lastName}: ${member.capacityLevel} (${Math.round(member.currentUtilization)}% utilized)`;
    }).join(', ');
    parts.push(`Team workload: ${capacityInfo}`);
  }

  if (context.department) {
    parts.push(`User's department: ${context.department}`);
  }

  return parts.join(' ');
}

/**
 * Generate an AI-powered insight based on user context and data
 */
export async function generateAIInsight(context: InsightContext): Promise<string> {
  // Create cache key based on context
  const cacheKey = JSON.stringify({
    role: context.userRole,
    dept: context.department,
    reqCompleted: context.requestStats?.completed,
    taskCompleted: context.taskStats?.completed,
    overdue: (context.requestStats?.overdue || 0) + (context.taskStats?.overdue || 0)
  });

  // Check cache first
  const cached = insightCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.insight;
  }

  try {
    // Build context summary
    const contextSummary = buildContextSummary(context);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using the cheaper model for better cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are a data analyst assistant for an educational data management portal. Provide concise, actionable insights in 1-2 sentences. Always start with a relevant emoji (📊, 🎯, ⚠️, 🚀, 💡, etc.). Be encouraging, specific, and focus on trends, anomalies, or recommendations.'
        },
        {
          role: 'user',
          content: `Based on this data from the data request portal, provide a key insight for a ${context.userRole}:\n\n${contextSummary}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const insight = response.choices[0]?.message?.content || 'Unable to generate insight at this time.';
    
    // Cache the result
    insightCache.set(cacheKey, {
      insight,
      expiry: Date.now() + CACHE_DURATION
    });

    // Clean up old cache entries periodically
    if (insightCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of insightCache.entries()) {
        if (value.expiry < now) {
          insightCache.delete(key);
        }
      }
    }

    return insight;
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Provide fallback insights if API fails
    return generateFallbackInsight(context);
  }
}

/**
 * Generate a fallback insight when OpenAI API is unavailable
 */
function generateFallbackInsight(context: InsightContext): string {
  const insights: string[] = [];

  if (context.requestStats) {
    const { totalRequests, completed, overdue, avgCompletionDays } = context.requestStats;
    
    if (completed > 0 && totalRequests > 0) {
      const completionRate = Math.round((completed / totalRequests) * 100);
      insights.push(`📊 Your team has completed ${completed} of ${totalRequests} requests (${completionRate}% completion rate).`);
    }
    
    if (avgCompletionDays > 0) {
      insights.push(`⏱️ Average completion time is ${avgCompletionDays} days.`);
    }
    
    if (overdue > 0) {
      insights.push(`⚠️ You have ${overdue} overdue request${overdue > 1 ? 's' : ''} that need attention.`);
    }
  }

  if (context.taskStats) {
    const { totalTasks, completed, overdue } = context.taskStats;
    
    if (completed > 0 && totalTasks > 0) {
      const completionRate = Math.round((completed / totalTasks) * 100);
      insights.push(`✅ Task completion rate is at ${completionRate}% (${completed}/${totalTasks} tasks completed).`);
    }
    
    if (overdue > 0) {
      insights.push(`🚨 ${overdue} task${overdue > 1 ? 's are' : ' is'} overdue.`);
    }
  }

  if (context.teamWorkload && context.teamWorkload.length > 0) {
    const overloadedCount = context.teamWorkload.filter(m => m.capacityLevel === 'overloaded').length;
    if (overloadedCount > 0) {
      insights.push(`⚠️ ${overloadedCount} team member${overloadedCount > 1 ? 's are' : ' is'} currently overloaded.`);
    }
  }

  if (insights.length === 0) {
    return '📈 Keep up the great work with your data management tasks!';
  }

  return insights[Math.floor(Math.random() * insights.length)];
}

