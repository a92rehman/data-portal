import OpenAI from 'openai';
import { getDashboardData, getStoredVisualData, VisualData, StoredVisualData } from './powerbiService';

console.log('[OPENAI] Initializing OpenAI client...');
if (!process.env.OPENAI_API_KEY) {
  console.error('[OPENAI] WARNING: OPENAI_API_KEY environment variable is not set!');
} else {
  console.log('[OPENAI] OpenAI API key found, length:', process.env.OPENAI_API_KEY.length);
}

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
  const dataSource = context.dataContext?.source || 'unknown';
  const dataSuccess = context.dataContext?.success;
  let prompt = '';
  
  // Validate data exists before generating insights
  if (!context.dataContext || (!context.dataContext.data && !context.dataContext.formattedData)) {
    console.warn('[OPENAI] No data context available, using fallback insights');
    return generateFallbackInsights(context.dataContext || {});
  }
  
  if (dataSource === 'powerbi' && dataSuccess === true) {
    // Power BI specific prompt - actual Power BI data extracted successfully
    const hasData = context.dataContext.data && Array.isArray(context.dataContext.data) && context.dataContext.data.length > 0;
    
    if (!hasData) {
      console.warn('[OPENAI] Power BI source marked but no data available, using fallback');
      return generateFallbackInsights(context.dataContext);
    }
    
    prompt = `You are analyzing the "${context.dashboardTitle}" Power BI dashboard showing Program Delivery metrics.

IMPORTANT: This is REAL LIVE DATA extracted directly from the Power BI dataset API in real-time. You must analyze actual metrics from the dataset and generate insights based ONLY on the numbers, aggregations, and sample data provided below.

=== LIVE POWER BI DATA ===
${context.dataContext.formattedData || formatPowerBIData(context.dataContext.data || [])}

=== DATA CONTEXT ===
- Total tables processed: ${context.dataContext.tableCount || 'unknown'}
- Data extracted at: ${context.dataContext.timestamp || new Date().toISOString()}
- Source: Power BI Dataset (Live)

=== INSTRUCTIONS ===
1. Analyze the KEY METRICS SUMMARY section - these are real aggregated values (sums, counts, totals)
2. Review the SAMPLE DATA to understand the data structure and actual values
3. Check CATEGORIZATION DATA for groupings (grades, subjects, types, etc.)
4. Calculate percentages, trends, and patterns from the actual numbers
5. Generate actionable insights based ONLY on the real data above

Generate 3-5 key insights in JSON format about the PROGRAM DELIVERY data from Power BI. Include:
- Specific numbers and percentages from the data (e.g., "1,834 observations completed", "62% completion rate")
- Trends calculated from aggregations (e.g., which grade has the most observations)
- Patterns identified from sample data and categorizations
- Performance metrics extracted from the sums and counts

Each insight should have:
- title: Short, actionable title with actual numbers (max 50 chars)
- description: Brief explanation with specific metrics from the data (max 100 chars)
- trend: "up", "down", or "neutral" based on the actual numbers
- change: percentage change if calculable from the data (optional)
- metric: which metric this relates to (observations, schools, grades, subjects, etc.)

CRITICAL: 
- Base insights ONLY on the actual Power BI data provided above
- Use the real numbers, aggregations, and values from the data
- Do NOT make up or guess metrics
- Do NOT reference request management, tasks, or data requests
- Focus ONLY on Program Delivery metrics (observations, schools, teachers, grades, subjects)

Return ONLY valid JSON array, no other text.`;
  } else {
    // Fallback prompt - using demo/sample data
    const dataContext = context.dataContext.formattedData || JSON.stringify(context.dataContext, null, 2);
    
    const isFallback = dataSource === 'fallback' || dataSource !== 'powerbi';
    const fallbackNote = isFallback ? 'NOTE: This is demo/sample data. Power BI data extraction was unsuccessful or unavailable.' : '';
    
    prompt = `You are analyzing the "${context.dashboardTitle}" Program Delivery Dashboard showing observation and completion metrics.

${fallbackNote}

Current data from the dashboard:
${dataContext}

Generate 3-5 key insights in JSON format about the Program Delivery metrics. Focus on:
- Observation completion rates and progress to targets
- Performance by grade and subject
- School visits and teacher observations
- Trends and patterns in the data

Each insight should have:
- title: Short, actionable title (max 50 chars)
- description: Brief explanation (max 100 chars)
- trend: "up", "down", or "neutral" (optional)
- change: percentage change if applicable (optional)
- metric: which metric this relates to (observations, schools, grades, etc.)

Focus ONLY on Program Delivery metrics. Do NOT reference request management, tasks, or data requests.

Return ONLY valid JSON array, no other text.`;
  }

  try {
    console.log('[OPENAI] Generating dashboard insights...');
    
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
    console.log('[OPENAI] Raw response received:', content.substring(0, 200));
    
    let insights;
    try {
      insights = JSON.parse(content);
    } catch {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('[OPENAI] Failed to parse JSON, using fallback');
        insights = [];
      }
    }
    
    console.log('[OPENAI] Insights generated:', insights.length, 'items');
    return insights;
  } catch (error) {
    console.error('[OPENAI] Error generating insights:', error);
    console.error('[OPENAI] Error stack:', (error as any)?.stack);
    console.error('[OPENAI] Error message:', (error as any)?.message);
    
    // Fallback insights
    const fallbackInsights = generateFallbackInsights(context.dataContext);
    console.log('[OPENAI] Using fallback insights:', fallbackInsights.length, 'items');
    return fallbackInsights;
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
  const dashboardTitle = params.dashboardContext.dashboardTitle || 'Program Delivery Dashboard';
  const dataSource = params.dashboardContext.dataContext?.source || 'unknown';
  const dataSuccess = params.dashboardContext.dataContext?.success;
  
  // Build context-aware system prompt
  let systemPrompt = `You are an AI assistant helping users understand their ${dashboardTitle}. `;
  
  // Validate Power BI data - must be successful and have actual data
  const isPowerBISuccess = dataSource === 'powerbi' && 
                           dataSuccess === true && 
                           params.dashboardContext.dataContext?.data && 
                           Array.isArray(params.dashboardContext.dataContext.data) && 
                           params.dashboardContext.dataContext.data.length > 0;
  
  const isVisualDataSuccess = dataSource === 'powerbi_visuals' && 
                              dataSuccess === true && 
                              params.dashboardContext.dataContext?.data && 
                              Array.isArray(params.dashboardContext.dataContext.data) && 
                              params.dashboardContext.dataContext.data.length > 0;
  
  if (isVisualDataSuccess) {
    // Power BI visual data specific prompt - most accurate and visual-specific
    systemPrompt += `You are analyzing a Power BI dashboard showing Program Delivery metrics.

IMPORTANT: You are analyzing REAL VISUAL DATA extracted directly from the Power BI report visuals. This data represents the actual visuals (charts, tables, cards) displayed in the dashboard.

Current visual data extracted from Power BI report:
${params.dashboardContext.dataContext?.formattedData || formatVisualDataForAI(params.dashboardContext.dataContext?.data || [])}

The data above shows specific visuals from the Power BI report, including:
- Visual names (e.g., "Total Observations by Grade", "Completion Rate Card")
- Visual types (bar charts, tables, cards, etc.)
- The actual data displayed in each visual
- Which page each visual appears on

When answering questions:
- Reference specific visuals by name when relevant (e.g., "According to the 'Total Observations by Grade' bar chart...")
- Use the actual data values from the visuals
- Explain what each visual shows and what insights can be drawn
- Be specific about numbers, trends, and patterns visible in the visual data

Base all answers ONLY on the actual Power BI visual data provided above.
Do NOT reference request management system, tasks, or data requests. Only discuss what's shown in the Power BI dashboard visuals.

Be concise and helpful. Keep responses under 200 words.`;
  } else if (isPowerBISuccess) {
    // Power BI dataset data prompt - fallback when visual data not available
    systemPrompt += `You are analyzing a Power BI dashboard showing Program Delivery metrics.

IMPORTANT: You are analyzing REAL data extracted directly from the Power BI dataset API.

Current dashboard data extracted from Power BI:
${params.dashboardContext.dataContext?.formattedData || formatPowerBIData(params.dashboardContext.dataContext?.data || [])}

Raw data structure:
${JSON.stringify(params.dashboardContext.dataContext?.data?.slice(0, 10) || [], null, 2)}

Focus on interpreting these PROGRAM DELIVERY metrics from the actual Power BI data. Provide insights about observations, schools, teachers, grades, subjects, and any other metrics visible in the dashboard data.

Base all answers ONLY on the actual Power BI data provided above.
Do NOT reference request management system, tasks, or data requests. Only discuss what's shown in the Power BI dashboard data.

Be concise and helpful. Keep responses under 200 words.`;
  } else {
    // Fallback prompt for demo/sample data
    const dataContext = params.dashboardContext.dataContext?.formattedData || 
                       JSON.stringify(params.dashboardContext.dataContext || {}, null, 2);
    
    const isFallback = dataSource === 'fallback' || dataSource !== 'powerbi';
    const fallbackNote = isFallback ? 'NOTE: This is demo/sample data. Power BI data extraction was unsuccessful or unavailable.' : '';
    
    systemPrompt += `You are analyzing the "${dashboardTitle}" Program Delivery Dashboard showing observation and completion metrics.

${fallbackNote}

Current dashboard data:
${dataContext}

Focus on providing insights about:
- Observation completion rates and progress to targets
- Performance by grade and subject
- School visits and teacher observations
- Trends and patterns in the data

User role: ${params.userRole}

Answer questions about the Program Delivery dashboard data, provide explanations, and offer actionable insights. 
Focus ONLY on observation metrics, schools, teachers, grades, and subjects. 
Do NOT reference request management, tasks, or data requests.

Be concise and helpful. Keep responses under 200 words.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...params.conversation.messages.slice(-10).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    })), // Last 10 messages for context
    { role: 'user', content: params.message }
  ];

  try {
    console.log('[OPENAI] Sending chat message...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0]?.message?.content || 'I apologize, I could not process your question.';
    console.log('[OPENAI] Chat response received:', reply.substring(0, 100));
    return reply;
  } catch (error) {
    console.error('[OPENAI] Error in chat:', error);
    console.error('[OPENAI] Error stack:', (error as any)?.stack);
    console.error('[OPENAI] Error message:', (error as any)?.message);
    throw new Error('Failed to get response from AI');
  }
}

function generateFallbackInsights(data: any): any[] {
  const insights = [];
  
  // Check for Program Delivery dashboard data
  if (data.completedObservations && data.targetObservations) {
    const progressRate = Math.round((data.completedObservations / data.targetObservations) * 100);
    insights.push({
      title: `${progressRate}% Progress to Target`,
      description: `${data.completedObservations} observations completed of ${data.targetObservations} target`,
      trend: progressRate >= 30 ? "up" : "down",
      metric: "observations",
      change: progressRate
    });
  }
  
  if (data.completionRate) {
    insights.push({
      title: `${data.completionRate}% Completion Rate`,
      description: `62% of scheduled observations have been completed`,
      trend: data.completionRate >= 60 ? "up" : "neutral",
      metric: "completion"
    });
  }
  
  if (data.observationsByGrade && data.observationsByGrade.gradeThree) {
    insights.push({
      title: 'Grade Three Leads',
      description: `Grade Three has ${data.observationsByGrade.gradeThree} completed observations`,
      trend: "up",
      metric: "grade"
    });
  }
  
  if (insights.length === 0) {
    insights.push({
      title: 'Dashboard Ready',
      description: 'Program Delivery dashboard data is available for analysis',
      trend: "neutral"
    });
  }
  
  return insights;
}

/**
 * Get dashboard context data for chat
 * Properly identifies data source (Power BI vs fallback)
 */
export async function getDashboardContextData(
  dashboardId: string,
  userId: string,
  userRole: string,
  storage: any,
  reportId?: string
): Promise<any> {
  // Fetch relevant data based on dashboard
  if (dashboardId === 'program-delivery') {
    // Try to fetch stored visual data first (fastest, most accurate)
    if (reportId) {
      try {
        console.log('[DASHBOARD CONTEXT] Checking for stored visual data for report:', reportId);
        const storedVisualData = await getStoredVisualData(reportId);
        
        if (storedVisualData && storedVisualData.visuals && storedVisualData.visuals.length > 0) {
          console.log('[DASHBOARD CONTEXT] ✓ Found stored visual data:', {
            visualCount: storedVisualData.visuals.length,
            timestamp: storedVisualData.timestamp,
            expiresAt: storedVisualData.expiresAt
          });
          
          // Format visual data for AI consumption
          const formattedVisualData = formatVisualDataForAI(storedVisualData.visuals);
          
          return {
            source: 'powerbi_visuals',
            data: storedVisualData.visuals,
            formattedData: formattedVisualData,
            timestamp: storedVisualData.timestamp,
            expiresAt: storedVisualData.expiresAt,
            visualCount: storedVisualData.visuals.length,
            success: true,
            error: null
          };
        } else {
          console.log('[DASHBOARD CONTEXT] No stored visual data found, falling back to dataset extraction');
        }
      } catch (visualDataError: any) {
        console.warn('[DASHBOARD CONTEXT] Error fetching stored visual data:', visualDataError.message);
        // Continue to fallback
      }
    }
    
    // Fallback: Try to fetch from Power BI dataset (slower, less specific)
    if (reportId) {
      try {
        console.log('[DASHBOARD CONTEXT] Fetching Power BI dataset data for report:', reportId);
        const powerBIData = await getDashboardData(reportId);
        
        // Validate Power BI data - must be successful, have rows, and source must be 'powerbi'
        const isPowerBISuccess = powerBIData.success === true && 
                                 powerBIData.source === 'powerbi' &&
                                 powerBIData.rows && 
                                 Array.isArray(powerBIData.rows) && 
                                 powerBIData.rows.length > 0;
        
        if (isPowerBISuccess) {
          // Verify data is meaningful (not just empty structures)
          const hasMeaningfulData = powerBIData.rows.some((row: any) => {
            if (row.TotalRows && row.TotalRows > 0) return true;
            if (row.Count && row.Count > 0) return true;
            if (row.SampleRows && Array.isArray(row.SampleRows) && row.SampleRows.length > 0) return true;
            return false;
          });
          
          if (hasMeaningfulData) {
            console.log('[DASHBOARD CONTEXT] ✓ Power BI data fetched successfully:', {
              rows: powerBIData.rows.length,
              tables: powerBIData.tableCount,
              source: powerBIData.source,
              success: powerBIData.success
            });
            
            // Format Power BI data for better AI consumption
            const formattedData = formatPowerBIData(powerBIData.rows);
            
            return {
              source: 'powerbi',
              data: powerBIData.rows,
              formattedData: formattedData,
              timestamp: powerBIData.timestamp,
              tableCount: powerBIData.tableCount,
              success: true,
              error: null
            };
          } else {
            console.warn('[DASHBOARD CONTEXT] Power BI data fetched but contains no meaningful data');
          }
        } else {
          console.warn('[DASHBOARD CONTEXT] Power BI data fetch unsuccessful:', {
            success: powerBIData.success,
            source: powerBIData.source,
            error: powerBIData.error,
            rowsCount: powerBIData.rows?.length || 0
          });
        }
      } catch (powerBIError: any) {
        console.error('[DASHBOARD CONTEXT] ✗ Power BI fetch failed with exception:', {
          error: powerBIError.message,
          stack: powerBIError.stack
        });
      }
    } else {
      console.warn('[DASHBOARD CONTEXT] No reportId provided, cannot fetch Power BI data');
    }
    
    // Fallback: Use demo data when Power BI API is not accessible or fails
    console.log('[DASHBOARD CONTEXT] ⚠ Using fallback demo Program Delivery data');
    const demoData = {
      targetObservations: 5650,
      scheduledObservations: 2940,
      completedObservations: 1834,
      schoolsVisited: 324,
      teachersObserved: 1987,
      observationsByGrade: {
        gradeOne: 251,
        gradeTwo: 479,
        gradeThree: 501,
        gradeFour: 301,
        gradeFive: 300
      },
      observationsBySubject: {
        urdu: 662,
        english: 584,
        math: 566,
        numeracy: 9,
        readingHourUrdu: 7,
        readingHourEnglish: 2,
        generalScience: 1,
        socialStudies: 1,
        waqfiyatAmaa: 1
      },
      observationsByType: {
        fico: 771,
        fln: 1063
      },
      completionRate: Math.round((1834 / 2940) * 100),
      progressToTarget: Math.round((1834 / 5650) * 100)
    };
    
    return {
      source: 'fallback', // Changed from 'powerbi' to 'fallback' to correctly identify demo data
      ...demoData,
      formattedData: `Program Delivery Dashboard Metrics (Demo Data):

Note: This is demo/sample data. Power BI data extraction was unsuccessful.

Key Performance Indicators:
- Target Observations: ${demoData.targetObservations}
- Observations Scheduled: ${demoData.scheduledObservations}
- Observations Completed: ${demoData.completedObservations}
- Schools Visited: ${demoData.schoolsVisited}
- Teachers Observed: ${demoData.teachersObserved}

Completion Status:
- Completion Rate: ${demoData.completionRate}% (${demoData.completedObservations} of ${demoData.scheduledObservations} scheduled)
- Progress to Target: ${demoData.progressToTarget}% (${demoData.completedObservations} of ${demoData.targetObservations} target)

Top Performing Grades:
- Grade Three: ${demoData.observationsByGrade.gradeThree} observations
- Grade Two: ${demoData.observationsByGrade.gradeTwo} observations
- Grade Four: ${demoData.observationsByGrade.gradeFour} observations

Top Performing Subjects:
- Urdu: ${demoData.observationsBySubject.urdu} observations
- English: ${demoData.observationsBySubject.english} observations
- Math: ${demoData.observationsBySubject.math} observations

Observation Types:
- FLN: ${demoData.observationsByType.fln} (${Math.round((1063/1834)*100)}%)
- FICO: ${demoData.observationsByType.fico} (${Math.round((771/1834)*100)}%)`,
      success: false,
      error: 'Using fallback demo data - Power BI extraction failed or unavailable'
    };
  }
  
  // Default return for other dashboards
  return {
    source: 'unknown',
    success: false,
    error: 'Dashboard not supported'
  };
}

/**
 * Format visual data for AI consumption
 * Groups visuals by page and type, includes visual names and extracted data
 */
function formatVisualDataForAI(visuals: VisualData[]): string {
  try {
    if (!visuals || visuals.length === 0) {
      return 'No visual data available from Power BI report.';
    }

    let summary = 'Power BI Report - Visual Data Extract:\n\n';
    summary += `Total Visuals Extracted: ${visuals.length}\n\n`;
    
    // Group visuals by page
    const visualsByPage: Record<string, VisualData[]> = {};
    visuals.forEach(visual => {
      const pageName = visual.pageName || 'Unknown Page';
      if (!visualsByPage[pageName]) {
        visualsByPage[pageName] = [];
      }
      visualsByPage[pageName].push(visual);
    });

    // Format each page's visuals
    Object.entries(visualsByPage).forEach(([pageName, pageVisuals]) => {
      summary += `\n=== Page: ${pageName} ===\n`;
      summary += `Visuals on this page: ${pageVisuals.length}\n\n`;
      
      pageVisuals.forEach((visual, idx) => {
        summary += `Visual ${idx + 1}: ${visual.visualName}\n`;
        summary += `  Type: ${visual.visualType}\n`;
        
        // Include metadata
        if (visual.metadata.fields.length > 0) {
          summary += `  Fields: ${visual.metadata.fields.join(', ')}\n`;
        }
        if (visual.metadata.measures.length > 0) {
          summary += `  Measures: ${visual.metadata.measures.join(', ')}\n`;
        }
        if (visual.metadata.aggregations.length > 0) {
          summary += `  Aggregations: ${visual.metadata.aggregations.join(', ')}\n`;
        }
        
        // Include data summary
        if (visual.data && Array.isArray(visual.data) && visual.data.length > 0) {
          summary += `  Data Points: ${visual.data.length}\n`;
          
          // Show sample of data (first 3 rows for cards/summaries, first 5 for tables)
          const sampleSize = visual.visualType === 'card' ? 1 : Math.min(5, visual.data.length);
          summary += `  Sample Data:\n`;
          
          visual.data.slice(0, sampleSize).forEach((row: any, rowIdx: number) => {
            if (typeof row === 'object' && row !== null) {
              const rowSummary = Object.entries(row)
                .slice(0, 10) // Limit to first 10 fields
                .map(([key, value]) => `${key}=${value}`)
                .join(', ');
              summary += `    Row ${rowIdx + 1}: ${rowSummary}\n`;
            } else {
              summary += `    Row ${rowIdx + 1}: ${row}\n`;
            }
          });
          
          if (visual.data.length > sampleSize) {
            summary += `    ... and ${visual.data.length - sampleSize} more rows\n`;
          }
        }
        
        summary += `  Extracted At: ${visual.extractedAt}\n\n`;
      });
    });

    // Add summary statistics
    const visualTypes: Record<string, number> = {};
    visuals.forEach(v => {
      visualTypes[v.visualType] = (visualTypes[v.visualType] || 0) + 1;
    });
    
    summary += '\n=== Visual Summary ===\n';
    Object.entries(visualTypes).forEach(([type, count]) => {
      summary += `  ${type}: ${count}\n`;
    });

    console.log('[DASHBOARD CONTEXT] Formatted visual data summary length:', summary.length);
    return summary;
  } catch (error) {
    console.error('[DASHBOARD CONTEXT] Error formatting visual data:', error);
    return JSON.stringify(visuals, null, 2);
  }
}

/**
 * Format raw Power BI data for better AI consumption
 * Enhanced to extract meaningful metrics for insights generation
 */
function formatPowerBIData(rows: any[]): string {
  try {
    if (!rows || rows.length === 0) {
      return 'No data available from Power BI dataset.';
    }

    // Build a comprehensive, human-readable summary optimized for AI insights
    let summary = 'Power BI Dataset - Live Data Extract:\n\n';
    
    // Group data by table
    const tables: Record<string, any[]> = {};
    rows.forEach(row => {
      if (row.TableName) {
        if (!tables[row.TableName]) {
          tables[row.TableName] = [];
        }
        tables[row.TableName].push(row);
      } else {
        if (!tables['_general']) {
          tables['_general'] = [];
        }
        tables['_general'].push(row);
      }
    });

    // Extract key metrics and aggregations
    const keyMetrics: any[] = [];
    const aggregations: any[] = [];
    const sampleData: any[] = [];
    const distinctValues: any[] = [];

    // Process each table
    Object.entries(tables).forEach(([tableName, tableRows]) => {
      if (tableName.startsWith('$')) return; // Skip system tables
      
      summary += `\n=== ${tableName} ===\n`;
      
      tableRows.forEach((row) => {
        // Extract row counts and totals
        if (row.TotalRows !== undefined && row.TotalRows !== null) {
          keyMetrics.push({ table: tableName, metric: 'Total Rows', value: row.TotalRows });
          summary += `Total Records: ${row.TotalRows}\n`;
        }

        // Extract aggregations (sums, counts, averages)
        Object.keys(row).forEach(key => {
          if (key.endsWith('_Sum') || key.endsWith('_Count') || key.endsWith('_Average')) {
            const metricName = key.replace(/_Sum|_Count|_Average$/, '');
            aggregations.push({ table: tableName, metric: metricName, type: key.split('_').pop()?.toLowerCase(), value: row[key] });
            summary += `  ${metricName} ${key.split('_').pop()}: ${row[key]}\n`;
          }
        });

        // Extract sample data rows
        if (row.SampleRows && Array.isArray(row.SampleRows) && row.SampleRows.length > 0) {
          summary += `\nSample Data (${row.SampleRows.length} rows):\n`;
          row.SampleRows.slice(0, 5).forEach((sampleRow: any, idx: number) => {
            summary += `  Row ${idx + 1}: `;
            const sampleValues = Object.entries(sampleRow)
              .filter(([k]) => k !== 'TableName')
              .slice(0, 5)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');
            summary += sampleValues + '\n';
          });
          sampleData.push({ table: tableName, samples: row.SampleRows.length, data: row.SampleRows.slice(0, 5) });
        }

        // Extract distinct values for categorization
        if (row.DistinctValues && Array.isArray(row.DistinctValues)) {
          summary += `\n${row.ColumnName || 'Categories'}: ${row.DistinctValues.join(', ')}\n`;
          distinctValues.push({ table: tableName, column: row.ColumnName, values: row.DistinctValues });
        }

        // Include other numeric metrics
        Object.keys(row).forEach(key => {
          if (key !== 'TableName' && key !== 'SampleRows' && key !== 'SampleRowCount' && 
              key !== 'ColumnNames' && key !== 'ColumnName' && key !== 'DistinctValues' &&
              !key.endsWith('_Sum') && !key.endsWith('_Count') && !key.endsWith('_Average') &&
              key !== 'TotalRows' && key !== 'Count') {
            const value = row[key];
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
              summary += `  ${key}: ${value}\n`;
              keyMetrics.push({ table: tableName, metric: key, value: value });
            }
          }
        });
      });
      
      summary += '\n';
    });

    // Create a summary section with key insights-ready metrics
    if (keyMetrics.length > 0 || aggregations.length > 0) {
      summary += '\n=== KEY METRICS SUMMARY ===\n';
      
      // Group by table
      const metricsByTable: Record<string, any[]> = {};
      [...keyMetrics, ...aggregations].forEach(m => {
        if (!metricsByTable[m.table]) {
          metricsByTable[m.table] = [];
        }
        metricsByTable[m.table].push(m);
      });

      Object.entries(metricsByTable).forEach(([table, metrics]) => {
        summary += `\n${table}:\n`;
        metrics.slice(0, 10).forEach(m => {
          summary += `  • ${m.metric}: ${m.value}${m.type ? ` (${m.type})` : ''}\n`;
        });
      });
    }

    // Add sample data summary
    if (sampleData.length > 0) {
      summary += '\n=== SAMPLE DATA AVAILABLE ===\n';
      sampleData.forEach(s => {
        summary += `  ${s.table}: ${s.samples} sample rows\n`;
      });
    }

    // Add distinct values summary for categorization insights
    if (distinctValues.length > 0) {
      summary += '\n=== CATEGORIZATION DATA ===\n';
      distinctValues.forEach(d => {
        summary += `  ${d.table}.${d.column}: ${d.values.length} distinct values (${d.values.slice(0, 5).join(', ')}${d.values.length > 5 ? '...' : ''})\n`;
      });
    }

    // Add statistics
    const totalRows = rows.length;
    const tableCount = Object.keys(tables).filter(k => !k.startsWith('$')).length;
    summary += `\n\nDataset Overview: ${tableCount} tables, ${totalRows} data points extracted`;

    console.log('[DASHBOARD CONTEXT] Formatted Power BI data summary length:', summary.length);
    console.log('[DASHBOARD CONTEXT] Key metrics extracted:', keyMetrics.length, 'Aggregations:', aggregations.length);
    return summary;
  } catch (error) {
    console.error('[DASHBOARD CONTEXT] Error formatting Power BI data:', error);
    return JSON.stringify(rows, null, 2);
  }
}

