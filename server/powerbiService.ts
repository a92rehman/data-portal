import { ClientSecretCredential } from '@azure/identity';
import { db } from './db';
import { sql } from 'drizzle-orm';

console.log('[POWERBI] Initializing Power BI Service...');

// Check required environment variables
const requiredEnvVars = [
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'POWERBI_DATASET_ID',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('[POWERBI] WARNING: Missing environment variables:', missingVars.join(', '));
  console.warn('[POWERBI] Power BI API features will not work until these are configured.');
} else {
  console.log('[POWERBI] All environment variables found');
}

// Cache for access tokens
interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

// In-memory cache for visual data
interface CachedVisualData {
  data: StoredVisualData;
  expiresAt: number;
}

const visualDataCache = new Map<string, CachedVisualData>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clear the token cache to force a fresh token fetch
 * Useful when Service Principal permissions are updated
 */
export function clearPowerBITokenCache(): void {
  console.log('[POWERBI] Clearing token cache to force fresh token fetch');
  tokenCache = null;
}

/**
 * Get Power BI access token using Service Principal (client credentials flow)
 */
async function getPowerBIAccessToken(): Promise<string> {
  try {
    // Return cached token if still valid (with 5 minute buffer)
    if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
      return tokenCache.token;
    }

    // Check if credentials are configured
    if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID || !process.env.AZURE_CLIENT_SECRET) {
      throw new Error('Azure credentials not configured');
    }

    console.log('[POWERBI] Fetching new access token...');

    // Create credential with Service Principal
    const credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID,
      process.env.AZURE_CLIENT_ID,
      process.env.AZURE_CLIENT_SECRET
    );

    // Get token for Power BI service
    // Use .default scope for client credentials flow (Service Principal)
    const token = await credential.getToken('https://analysis.windows.net/powerbi/api/.default');
    
    if (!token || !token.token) {
      throw new Error('Failed to obtain access token from Azure AD');
    }
    
    console.log('[POWERBI] Token obtained, expires at:', new Date(token.expiresOnTimestamp).toISOString());

    // Cache token
    tokenCache = {
      token: token.token,
      expiresAt: token.expiresOnTimestamp,
    };

    console.log('[POWERBI] Access token obtained successfully');
    return token.token;
  } catch (error) {
    console.error('[POWERBI] Error getting access token:', error);
    throw error;
  }
}

/**
 * Execute a DAX query against Power BI dataset
 */
export async function executeDaxQuery(query: string): Promise<any> {
  try {
    const accessToken = await getPowerBIAccessToken();
    const datasetId = process.env.POWERBI_DATASET_ID;

    if (!datasetId) {
      throw new Error('POWERBI_DATASET_ID not configured');
    }

    console.log('[POWERBI] Executing DAX query:', query.substring(0, 100) + '...');

    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          queries: [
            {
              query: query,
            },
          ],
          serializerSettings: {
            includeNulls: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POWERBI] Query failed:', response.status, errorText);
      throw new Error(`Power BI query failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[POWERBI] Query executed successfully, rows returned:', data.results[0]?.tables[0]?.rows?.length || 0);
    return data.results[0]?.tables[0] || { rows: [] };
  } catch (error) {
    console.error('[POWERBI] Error executing DAX query:', error);
    throw error;
  }
}

/**
 * Get dataset schema (tables and columns)
 */
export async function getDatasetSchema(): Promise<any> {
  try {
    const accessToken = await getPowerBIAccessToken();
    const datasetId = process.env.POWERBI_DATASET_ID;

    if (!datasetId) {
      throw new Error('POWERBI_DATASET_ID not configured');
    }

    console.log('[POWERBI] Fetching dataset schema...');

    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POWERBI] Failed to fetch schema:', response.status, errorText);
      throw new Error(`Failed to fetch schema: ${response.status}`);
    }

    const data = await response.json();
    console.log('[POWERBI] Schema fetched successfully');
    return data;
  } catch (error) {
    console.error('[POWERBI] Error fetching dataset schema:', error);
    throw error;
  }
}

/**
 * Extract dashboard data - get key metrics for Program Delivery Dashboard
 * Dynamically extracts data based on actual dataset schema
 * Returns data with proper source identification for tracking
 */
export async function getDashboardData(reportId: string): Promise<any> {
  const startTime = Date.now();
  console.log('[POWERBI] Starting data extraction for report:', reportId);

  // Check if credentials are configured
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
    console.error('[POWERBI] Configuration error:', errorMsg);
    return {
      rows: [],
      timestamp: new Date().toISOString(),
      error: errorMsg,
      source: 'powerbi_error',
      success: false
    };
  }

  try {
    // Get dataset schema to understand structure
    let schema;
    let tables: any[] = [];
    let schemaFetchSuccess = false;
    
    try {
      console.log('[POWERBI] Fetching dataset schema...');
      schema = await getDatasetSchema();
      schemaFetchSuccess = true;
      console.log('[POWERBI] ✓ Dataset schema retrieved successfully');
      
      // Extract table names from schema
      if (schema.tables && Array.isArray(schema.tables)) {
        tables = schema.tables.filter((t: any) => t && t.name && !t.name.startsWith('$'));
        console.log('[POWERBI] Found', tables.length, 'user tables in dataset (excluding system tables)');
      } else {
        console.warn('[POWERBI] Schema response does not contain tables array');
      }
    } catch (error: any) {
      console.error('[POWERBI] ✗ Failed to fetch schema:', error.message);
      console.error('[POWERBI] Schema fetch error details:', {
        error: error.message,
        stack: error.stack
      });
      // We'll still try to extract data, but this is a critical failure
    }

    // If schema fetch failed, we cannot extract meaningful data
    if (!schemaFetchSuccess) {
      const errorMsg = 'Failed to fetch dataset schema - cannot extract data';
      console.error('[POWERBI]', errorMsg);
      return {
        rows: [],
        timestamp: new Date().toISOString(),
        error: errorMsg,
        source: 'powerbi_error',
        success: false
      };
    }

    // If no tables found, return error
    if (tables.length === 0) {
      const errorMsg = 'No user tables found in dataset schema';
      console.warn('[POWERBI]', errorMsg);
      return {
        rows: [],
        timestamp: new Date().toISOString(),
        error: errorMsg,
        source: 'powerbi_error',
        success: false
      };
    }

    const results: any[] = [];
    let successfulExtractions = 0;
    let failedExtractions = 0;

    console.log('[POWERBI] Attempting to extract data from', tables.length, 'tables');
    
    // Process each table with improved error handling
    for (const table of tables) {
      const tableName = table.name;
      console.log('[POWERBI] Processing table:', tableName);
      
      // Try to get row count and basic statistics
      let tableExtracted = false;
      
      try {
        // Query 1: Get total row count
        const countQuery = `
          EVALUATE
          ROW("TableName", "${tableName}", "TotalRows", COUNTROWS('${tableName}'))
        `;
        
        const countResult = await executeDaxQuery(countQuery);
        if (countResult.rows && countResult.rows.length > 0 && countResult.rows[0]?.TotalRows > 0) {
          results.push(...countResult.rows);
          tableExtracted = true;
          console.log('[POWERBI] ✓ Got row count for', tableName, ':', countResult.rows[0]?.TotalRows, 'rows');
        }
      } catch (error: any) {
        console.warn('[POWERBI] Could not get row count for', tableName, ':', error.message);
      }

      // If table has columns, try to extract meaningful metrics
      if (table.columns && Array.isArray(table.columns) && table.columns.length > 0) {
        // Identify numeric columns for aggregations
        const numericColumns = table.columns.filter((col: any) => 
          col && col.name && (col.type === 'Double' || col.type === 'Int64' || col.type === 'Decimal')
        );
        
        // Try to extract aggregations for numeric columns (limit to first 5 to avoid query complexity)
        if (numericColumns.length > 0) {
          try {
            // Limit to first 5 numeric columns to keep query manageable
            const columnsToAggregate = numericColumns.slice(0, 5);
            
            // Build aggregation query for selected numeric columns
            const aggregations = columnsToAggregate.map(col => {
              const colName = col.name;
              // Escape column name if it contains special characters
              const safeColName = colName.replace(/[\[\]']/g, '');
              return `"${safeColName}_Sum", SUM('${tableName}'[${colName}]), "${safeColName}_Count", COUNTROWS(FILTER('${tableName}', NOT(ISBLANK('${tableName}'[${colName}]))))`;
            }).join(', ');
            
            const summaryQuery = `
              EVALUATE
              ROW(
                "TableName", "${tableName}",
                "TotalRows", COUNTROWS('${tableName}'),
                ${aggregations}
              )
            `;
            
            const summaryResult = await executeDaxQuery(summaryQuery);
            if (summaryResult.rows && summaryResult.rows.length > 0) {
              results.push(...summaryResult.rows);
              tableExtracted = true;
              console.log('[POWERBI] ✓ Got summary aggregations for', tableName, '-', columnsToAggregate.length, 'numeric columns');
            }
          } catch (error: any) {
            console.warn('[POWERBI] Could not get aggregations for', tableName, ':', error.message);
            // Try individual column aggregations as fallback
            if (numericColumns.length > 0) {
              try {
                const firstCol = numericColumns[0].name;
                const simpleQuery = `
                  EVALUATE
                  ROW(
                    "TableName", "${tableName}",
                    "ColumnName", "${firstCol}",
                    "Sum", SUM('${tableName}'[${firstCol}]),
                    "Average", AVERAGE('${tableName}'[${firstCol}]),
                    "Count", COUNTROWS('${tableName}')
                  )
                `;
                const simpleResult = await executeDaxQuery(simpleQuery);
                if (simpleResult.rows && simpleResult.rows.length > 0) {
                  results.push(...simpleResult.rows);
                  tableExtracted = true;
                  console.log('[POWERBI] ✓ Got simple aggregation for', tableName, '.', firstCol);
                }
              } catch (fallbackError: any) {
                console.warn('[POWERBI] Fallback aggregation also failed for', tableName, ':', fallbackError.message);
              }
            }
          }
        }

        // Try to get sample data with key metrics
        try {
          // Get first 20 rows as sample (reduced for performance but still meaningful)
          const sampleQuery = `
            EVALUATE 
            TOPN(20, '${tableName}', 1)
          `;
          
          const sampleResult = await executeDaxQuery(sampleQuery);
          if (sampleResult.rows && sampleResult.rows.length > 0) {
            // Add to results with table context
            results.push({
              TableName: tableName,
              SampleRows: sampleResult.rows.slice(0, 10), // First 10 rows
              SampleRowCount: sampleResult.rows.length,
              ColumnNames: table.columns.map((c: any) => c.name).slice(0, 10) // First 10 column names
            });
            tableExtracted = true;
            console.log('[POWERBI] ✓ Got sample data for', tableName, ':', sampleResult.rows.length, 'sample rows');
          }
        } catch (error: any) {
          console.warn('[POWERBI] Could not get sample data for', tableName, ':', error.message);
        }

        // Try to get distinct values for key text columns (for categorizations)
        // Don't break early - always try to get distinct values even if other extractions succeeded
        const textColumns = table.columns.filter((col: any) => 
          col && col.name && (col.type === 'String' || col.type === 'Text')
        ).slice(0, 2); // Limit to first 2 text columns to avoid too many queries
        
        for (const textCol of textColumns) {
          try {
            const distinctQuery = `
              EVALUATE
              ADDCOLUMNS(
                TOPN(10, VALUES('${tableName}'[${textCol.name}]), '${tableName}'[${textCol.name}]),
                "TableName", "${tableName}",
                "ColumnName", "${textCol.name}"
              )
            `;
            
            const distinctResult = await executeDaxQuery(distinctQuery);
            if (distinctResult.rows && distinctResult.rows.length > 0) {
              results.push({
                TableName: tableName,
                ColumnName: textCol.name,
                DistinctValues: distinctResult.rows.map((r: any) => r[textCol.name]).filter((v: any) => v !== null && v !== undefined).slice(0, 10)
              });
              console.log('[POWERBI] ✓ Got distinct values for', tableName, '.', textCol.name, '-', distinctResult.rows.length, 'values');
              break; // Only get distinct values for first successful text column per table
            }
          } catch (error: any) {
            // Silent fail for distinct queries - not critical
          }
        }
      }

      if (tableExtracted) {
        successfulExtractions++;
      } else {
        failedExtractions++;
      }
    }
    
    // If we still don't have results, try generic fallback queries (limited attempts)
    if (results.length === 0 && tables.length > 0) {
      console.log('[POWERBI] No results from primary extraction, trying fallback queries...');
      
      // Try first 3 tables only to avoid timeout
      for (const table of tables.slice(0, 3)) {
        const tableName = table.name;
        
        try {
          const fallbackQuery = `
            EVALUATE
            ROW("Source", "${tableName}", "Count", COUNTROWS('${tableName}'))
          `;
          
          const fallbackResult = await executeDaxQuery(fallbackQuery);
          if (fallbackResult.rows && fallbackResult.rows.length > 0 && fallbackResult.rows[0]?.Count > 0) {
            results.push(...fallbackResult.rows);
            successfulExtractions++;
            console.log('[POWERBI] ✓ Fallback query succeeded for', tableName);
            break; // Stop after first success
          }
        } catch (error: any) {
          console.warn('[POWERBI] Fallback query failed for', tableName, ':', error.message);
        }
      }
    }

    const duration = Date.now() - startTime;

    // Validate results before returning
    console.log('[POWERBI] Final results check:', {
      resultsLength: results.length,
      successfulExtractions,
      failedExtractions,
      tablesProcessed: tables.length
    });
    
    if (results.length > 0) {
      // Check if results actually contain meaningful data
      const hasMeaningfulData = results.some(row => {
        if (row.TotalRows && row.TotalRows > 0) return true;
        if (row.Count && row.Count > 0) return true;
        if (row.SampleRows && Array.isArray(row.SampleRows) && row.SampleRows.length > 0) return true;
        // Also check for any non-empty values
        if (row && typeof row === 'object') {
          const hasAnyValue = Object.values(row).some(val => 
            val !== null && val !== undefined && val !== ''
          );
          if (hasAnyValue) return true;
        }
        return false;
      });

      console.log('[POWERBI] Meaningful data check:', {
        hasMeaningfulData,
        sampleRow: results[0] ? JSON.stringify(results[0]).substring(0, 200) : 'no rows'
      });

      if (hasMeaningfulData) {
        console.log('[POWERBI] ✓ Dashboard data extracted successfully:', {
          totalRows: results.length,
          tablesProcessed: tables.length,
          successfulExtractions,
          failedExtractions,
          duration: `${duration}ms`
        });
        return {
          rows: results,
          timestamp: new Date().toISOString(),
          source: 'powerbi',
          tableCount: tables.length,
          successfulExtractions,
          failedExtractions,
          success: true
        };
      } else {
        console.warn('[POWERBI] ✗ Extracted results but no meaningful data found');
        console.warn('[POWERBI] Sample results:', JSON.stringify(results.slice(0, 3), null, 2));
      }
    } else {
      console.warn('[POWERBI] ✗ No results extracted from any tables');
      console.warn('[POWERBI] Tables processed:', tables.map(t => t.name));
    }

    // No meaningful data extracted
    const errorMsg = `Unable to extract meaningful data from Power BI dataset. Processed ${tables.length} tables, ${successfulExtractions} successful, ${failedExtractions} failed`;
    console.error('[POWERBI]', errorMsg);
    return {
      rows: [],
      timestamp: new Date().toISOString(),
      error: errorMsg,
      source: 'powerbi_error',
      success: false,
      tablesProcessed: tables.length,
      successfulExtractions,
      failedExtractions
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[POWERBI] ✗ Error extracting dashboard data:', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    return {
      rows: [],
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error occurred',
      source: 'powerbi_error',
      success: false,
      tablesProcessed: 0,
      successfulExtractions: 0,
      failedExtractions: 0
    };
  }
}

/**
 * List all available datasets (helper function for setup)
 */
export async function listDatasets(): Promise<any[]> {
  try {
    const accessToken = await getPowerBIAccessToken();

    console.log('[POWERBI] Listing datasets...');

    const response = await fetch(
      'https://api.powerbi.com/v1.0/myorg/datasets',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POWERBI] Failed to list datasets:', response.status, errorText);
      throw new Error(`Failed to list datasets: ${response.status}`);
    }

    const data = await response.json();
    console.log('[POWERBI] Datasets listed successfully:', data.value?.length || 0, 'datasets');
    return data.value || [];
  } catch (error) {
    console.error('[POWERBI] Error listing datasets:', error);
    throw error;
  }
}

/**
 * Generate embed token for a Power BI report using Service Principal
 * This allows anonymous users to view the report without signing in
 */
export async function generateEmbedToken(reportId: string, workspaceId?: string): Promise<{
  token: string;
  embedUrl: string;
  tokenId: string;
  expiration: string;
}> {
  try {
    const accessToken = await getPowerBIAccessToken();
    
    // Default workspace ID (can be from env or passed as parameter)
    // Use 'me' if no workspace ID is provided (workspace of the Service Principal)
    const targetWorkspaceId = workspaceId || process.env.POWERBI_WORKSPACE_ID || 'me';
    
    console.log('[POWERBI] Generating embed token for report:', reportId, 'in workspace:', targetWorkspaceId);
    
    // Get the report to find its workspace
    let actualWorkspaceId = targetWorkspaceId;
    try {
      const reportResponse = await fetch(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!reportResponse.ok) {
        const errorText = await reportResponse.text();
        console.warn('[POWERBI] Could not fetch report details:', reportResponse.status, errorText);
      } else {
        const reportData = await reportResponse.json();
        // If report is in a workspace (group), use that workspace ID
        if (reportData.workspaceId) {
          actualWorkspaceId = reportData.workspaceId;
          console.log('[POWERBI] Found report workspace:', actualWorkspaceId);
        } else {
          console.log('[POWERBI] Report is in My Workspace (workspaceId not specified)');
        }
      }
    } catch (error) {
      console.warn('[POWERBI] Could not fetch report details, using default workspace:', error);
    }
    
    // Request embed token for the report
    // Try the workspace-specific endpoint first, then fall back to myorg if needed
    const embedTokenUrl = actualWorkspaceId === 'me' || !actualWorkspaceId
      ? `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/GenerateToken`
      : `https://api.powerbi.com/v1.0/myorg/groups/${actualWorkspaceId}/reports/${reportId}/GenerateToken`;
    
    console.log('[POWERBI] Requesting embed token from:', embedTokenUrl);
    console.log('[POWERBI] Using workspace ID:', actualWorkspaceId);
    console.log('[POWERBI] Report ID:', reportId);
    
    const response = await fetch(embedTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        accessLevel: 'View', // Allow viewing only
        allowSaveAs: false, // Don't allow saving
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POWERBI] Failed to generate embed token:', response.status, errorText);
      
      // If it's a 403, provide helpful error message about Service Principal permissions
      if (response.status === 403) {
        console.error('[POWERBI] 403 Forbidden - Detailed diagnostics:');
        console.error('[POWERBI] - Embed Token URL:', embedTokenUrl);
        console.error('[POWERBI] - Workspace ID:', actualWorkspaceId);
        console.error('[POWERBI] - Report ID:', reportId);
        console.error('[POWERBI] - Service Principal Client ID:', process.env.AZURE_CLIENT_ID);
        console.error('[POWERBI] - Error response:', errorText);
        
        // Check for specific error messages and provide targeted guidance
        let errorMessage: string;
        
        if (errorText.includes('Embedding is disabled on tenant level') || errorText.includes('embedding is disabled')) {
          errorMessage = `Power BI Embedding is disabled (403). Enable it in Power BI Admin Portal:

1. Go to: https://app.powerbi.com/admin-portal
2. Navigate to: Tenant settings → Developer settings
3. Find the setting: "Embed content in apps"
4. Toggle it to "Enabled"
5. Set scope to "Entire organization" (or your security group)
6. Click "Apply" to save changes
7. Wait 15-30 minutes for propagation

Additional requirements:
- "Allow service principals to use Power BI APIs" must also be enabled in Tenant settings
- Service Principal (Client ID: ${process.env.AZURE_CLIENT_ID}) must be added to workspace (${actualWorkspaceId || 'My Workspace'}) as Member or Admin role
- Workspace must allow embedding

Note: Changes can take 15-30 minutes to propagate across the tenant.

URL attempted: ${embedTokenUrl}
Workspace: ${actualWorkspaceId || 'My Workspace'}
Response: ${errorText}`;
        } else if (errorText.includes('API is not accessible for application')) {
          errorMessage = `Power BI API access denied (403). Verify:
1. "Allow service principals to use Power BI APIs" is ENABLED in Power BI Admin Portal → Tenant settings
2. Service Principal (Client ID: ${process.env.AZURE_CLIENT_ID}) is added to the workspace
3. Service Principal has Member or Admin role (not Viewer)
4. Tenant setting applies to the correct security group or "Entire organization"

URL attempted: ${embedTokenUrl}
Workspace: ${actualWorkspaceId || 'My Workspace'}
Response: ${errorText}`;
        } else {
          errorMessage = `Power BI API access denied (403). Verify:
1. "Allow service principals to use Power BI APIs" is ENABLED in Power BI Admin Portal → Tenant settings
2. Service Principal (Client ID: ${process.env.AZURE_CLIENT_ID}) is added to the workspace
3. Service Principal has Member or Admin role (not Viewer)
4. Tenant setting applies to the correct security group or "Entire organization"
5. Check if "Allow embedding" or "Allow service principals to embed" is enabled in Tenant settings

URL attempted: ${embedTokenUrl}
Workspace: ${actualWorkspaceId || 'My Workspace'}
Response: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(`Failed to generate embed token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[POWERBI] Embed token generated successfully, token length:', data.token?.length || 0);
    
    if (!data.token) {
      throw new Error('No token in response from Power BI API');
    }
    
    // Get the actual embed URL from the report (this is what Power BI SDK needs)
    let actualEmbedUrl: string;
    try {
      // Try to get the embedUrl from the report metadata
      const reportResponse = await fetch(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        // Power BI API returns embedUrl in the report data
        if (reportData.embedUrl) {
          actualEmbedUrl = reportData.embedUrl;
          console.log('[POWERBI] Found embedUrl from report API:', actualEmbedUrl.substring(0, 100) + '...');
        } else {
          // Fallback: construct embed URL
          const tenantId = process.env.AZURE_TENANT_ID || '';
          actualEmbedUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&ctid=${tenantId}`;
          console.log('[POWERBI] Using constructed embedUrl');
        }
      } else {
        // Fallback: construct embed URL
        const tenantId = process.env.AZURE_TENANT_ID || '';
        actualEmbedUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&ctid=${tenantId}`;
        console.log('[POWERBI] Could not fetch report metadata, using constructed embedUrl');
      }
    } catch (error) {
      // Fallback: construct embed URL
      const tenantId = process.env.AZURE_TENANT_ID || '';
      actualEmbedUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&ctid=${tenantId}`;
      console.log('[POWERBI] Error fetching report metadata, using constructed embedUrl');
    }
    
    console.log('[POWERBI] Embed URL for SDK:', actualEmbedUrl.substring(0, 100) + '...');
    
    return {
      token: data.token,
      embedUrl: actualEmbedUrl,
      tokenId: data.tokenId || '',
      expiration: data.expiration || new Date(Date.now() + 3600000).toISOString(), // 1 hour default
    };
  } catch (error: any) {
    console.error('[POWERBI] Error generating embed token:', error);
    throw error;
  }
}

/**
 * Test Power BI connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await getPowerBIAccessToken();
    return {
      success: true,
      message: 'Successfully connected to Power BI API',
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    };
  }
}

/**
 * Visual data interfaces
 */
export interface VisualData {
  visualName: string;
  visualType: string;
  pageName: string;
  data: any[];
  metadata: {
    fields: string[];
    measures: string[];
    aggregations: string[];
    filters: any[];
  };
  extractedAt: string;
}

export interface StoredVisualData {
  reportId: string;
  timestamp: string;
  visuals: VisualData[];
  expiresAt: string;
}

/**
 * Get all pages in a Power BI report
 */
export async function getReportPages(reportId: string, workspaceId?: string): Promise<any[]> {
  try {
    const accessToken = await getPowerBIAccessToken();
    const targetWorkspaceId = workspaceId || process.env.POWERBI_WORKSPACE_ID || 'me';
    
    console.log('[POWERBI] Fetching pages for report:', reportId, 'in workspace:', targetWorkspaceId);
    
    // Get the report to find its workspace
    let actualWorkspaceId = targetWorkspaceId;
    try {
      const reportResponse = await fetch(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        if (reportData.workspaceId) {
          actualWorkspaceId = reportData.workspaceId;
          console.log('[POWERBI] Found report workspace:', actualWorkspaceId);
        }
      }
    } catch (error) {
      console.warn('[POWERBI] Could not fetch report details, using default workspace:', error);
    }
    
    const pagesUrl = actualWorkspaceId === 'me' || !actualWorkspaceId
      ? `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/pages`
      : `https://api.powerbi.com/v1.0/myorg/groups/${actualWorkspaceId}/reports/${reportId}/pages`;
    
    const response = await fetch(pagesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[POWERBI] Failed to fetch pages:', response.status, errorText);
      throw new Error(`Failed to fetch pages: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const pages = data.value || [];
    console.log('[POWERBI] Found', pages.length, 'pages in report');
    return pages;
  } catch (error) {
    console.error('[POWERBI] Error fetching report pages:', error);
    throw error;
  }
}

/**
 * Get all visuals on a specific page
 */
export async function getPageVisuals(reportId: string, pageName: string, workspaceId?: string): Promise<any[]> {
  try {
    const accessToken = await getPowerBIAccessToken();
    const targetWorkspaceId = workspaceId || process.env.POWERBI_WORKSPACE_ID || 'me';
    
    // Get the report to find its workspace
    let actualWorkspaceId = targetWorkspaceId;
    try {
      const reportResponse = await fetch(
        `https://api.powerbi.com/v1.0/myorg/reports/${reportId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        if (reportData.workspaceId) {
          actualWorkspaceId = reportData.workspaceId;
        }
      }
    } catch (error) {
      // Use default workspace
    }
    
    // Power BI REST API doesn't directly expose visual metadata
    // We need to use the ExportData API or parse the report definition
    // For now, we'll try to get page details which may include visual information
    const pageUrl = actualWorkspaceId === 'me' || !actualWorkspaceId
      ? `https://api.powerbi.com/v1.0/myorg/reports/${reportId}/pages/${encodeURIComponent(pageName)}`
      : `https://api.powerbi.com/v1.0/myorg/groups/${actualWorkspaceId}/reports/${reportId}/pages/${encodeURIComponent(pageName)}`;
    
    const response = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[POWERBI] Failed to fetch page details:', response.status, errorText);
      // Return empty array if page details not available
      return [];
    }

    const pageData = await response.json();
    // Power BI API may not return visual details directly
    // We'll need to use a workaround or alternative approach
    // For now, return empty array and we'll construct visual data from report definition
    console.log('[POWERBI] Page data retrieved for:', pageName);
    return [];
  } catch (error) {
    console.error('[POWERBI] Error fetching page visuals:', error);
    // Return empty array on error - we'll use alternative extraction method
    return [];
  }
}

/**
 * Extract data from a visual by constructing DAX query from visual configuration
 * Since Power BI REST API doesn't directly expose visual data, we'll use an alternative approach:
 * 1. Try to get visual configuration from report definition
 * 2. Construct DAX queries based on visual type and fields
 * 3. Execute DAX queries to get the data
 */
export async function extractVisualData(visualConfig: any, reportId: string): Promise<any> {
  try {
    // Visual config should contain: visualType, fields, measures, filters
    const visualType = visualConfig.visualType || 'table';
    const fields = visualConfig.fields || [];
    const measures = visualConfig.measures || [];
    const filters = visualConfig.filters || [];
    
    // For now, we'll use a simplified approach:
    // Extract data based on the dataset schema and visual type
    // This is a fallback - ideally we'd get the actual visual query from Power BI
    
    // Get dataset schema to understand available tables
    const schema = await getDatasetSchema();
    const tables = schema.tables || [];
    
    if (tables.length === 0) {
      console.warn('[POWERBI] No tables found in dataset for visual extraction');
      return { rows: [] };
    }
    
    // Try to construct a basic query based on visual type
    // This is a simplified implementation - in production, you'd parse the actual visual query
    let query = '';
    
    if (visualType === 'card' || visualType === 'kpi') {
      // For cards/KPIs, get a single aggregated value
      if (measures.length > 0) {
        const measure = measures[0];
        query = `EVALUATE ROW("Value", ${measure})`;
      } else if (fields.length > 0) {
        // Try to find the table containing this field
        const field = fields[0];
        for (const table of tables) {
          const column = table.columns?.find((c: any) => c.name === field);
          if (column && (column.type === 'Double' || column.type === 'Int64' || column.type === 'Decimal')) {
            query = `EVALUATE ROW("Value", SUM('${table.name}'[${field}]))`;
            break;
          }
        }
      }
    } else if (visualType === 'table' || visualType === 'matrix') {
      // For tables, get the fields as columns
      if (fields.length > 0) {
        const fieldList = fields.slice(0, 10).join(', '); // Limit to 10 fields
        query = `EVALUATE TOPN(100, SUMMARIZE('${tables[0].name}', ${fieldList}))`;
      }
    } else if (visualType === 'barChart' || visualType === 'columnChart' || visualType === 'lineChart') {
      // For charts, group by category and aggregate by value
      if (fields.length >= 1 && measures.length >= 1) {
        const categoryField = fields[0];
        const measure = measures[0];
        query = `EVALUATE TOPN(50, SUMMARIZE('${tables[0].name}', '${tables[0].name}'[${categoryField}], "Value", ${measure}))`;
      }
    } else {
      // Default: get sample data
      query = `EVALUATE TOPN(50, '${tables[0].name}')`;
    }
    
    if (!query) {
      // Fallback: get sample data from first table
      query = `EVALUATE TOPN(50, '${tables[0].name}')`;
    }
    
    console.log('[POWERBI] Executing visual data query:', query.substring(0, 100));
    const result = await executeDaxQuery(query);
    return result;
  } catch (error: any) {
    console.error('[POWERBI] Error extracting visual data:', error);
    return { rows: [] };
  }
}

/**
 * Extract data from all visuals in a Power BI report
 * Uses the proven getDashboardData method and formats it as visual data
 */
export async function extractAllVisualsData(reportId: string, workspaceId?: string): Promise<StoredVisualData> {
  const startTime = Date.now();
  console.log('[POWERBI] Starting visual data extraction for report:', reportId);
  
  const visuals: VisualData[] = [];
  
  try {
    // Get all pages in the report
    let pages: any[] = [];
    try {
      pages = await getReportPages(reportId, workspaceId);
      console.log('[POWERBI] Found', pages.length, 'pages in report');
    } catch (pageError: any) {
      console.warn('[POWERBI] Could not fetch pages, using default:', pageError.message);
      pages = [{ name: 'Overview' }]; // Default page if pages can't be fetched
    }
    
    // Use the proven getDashboardData function which successfully extracts data
    console.log('[POWERBI] Calling getDashboardData for report:', reportId);
    
    let dashboardData;
    try {
      dashboardData = await getDashboardData(reportId);
    } catch (error: any) {
      console.error('[POWERBI] ❌ getDashboardData threw an exception:', error);
      console.error('[POWERBI] Error stack:', error.stack);
      return {
        reportId,
        timestamp: new Date().toISOString(),
        visuals: [],
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }
    
    console.log('[POWERBI] getDashboardData result:', {
      success: dashboardData?.success,
      source: dashboardData?.source,
      rowCount: dashboardData?.rows?.length || 0,
      error: dashboardData?.error,
      hasRows: !!dashboardData?.rows,
      rowsIsArray: Array.isArray(dashboardData?.rows),
      fullResponse: JSON.stringify(dashboardData).substring(0, 500) // First 500 chars for debugging
    });
    
    // Check if we have data - be very permissive
    const hasData = dashboardData && 
                   dashboardData.success !== false && 
                   dashboardData.rows && 
                   Array.isArray(dashboardData.rows) && 
                   dashboardData.rows.length > 0;
    
    if (!hasData) {
      console.error('[POWERBI] ⚠️ Dashboard data extraction returned no data:', {
        success: dashboardData?.success,
        source: dashboardData?.source,
        error: dashboardData?.error,
        rowCount: dashboardData?.rows?.length || 0,
        rowsType: typeof dashboardData?.rows,
        isArray: Array.isArray(dashboardData?.rows),
        dashboardDataKeys: dashboardData ? Object.keys(dashboardData) : 'no dashboardData'
      });
      
      // Try to get at least some data directly from the dataset
      console.log('[POWERBI] Attempting direct dataset query as fallback...');
      try {
        const schema = await getDatasetSchema();
        console.log('[POWERBI] Schema retrieved:', {
          hasSchema: !!schema,
          hasTables: !!(schema && schema.tables),
          tableCount: schema?.tables?.length || 0
        });
        
        if (schema && schema.tables && schema.tables.length > 0) {
          const firstTable = schema.tables[0];
          console.log('[POWERBI] Found first table:', firstTable.name, 'with', firstTable.columns?.length || 0, 'columns');
          
          // Try a simple count query
          try {
            const simpleQuery = `EVALUATE ROW("TableName", "${firstTable.name}", "TotalRows", COUNTROWS('${firstTable.name}'))`;
            console.log('[POWERBI] Executing fallback query:', simpleQuery);
            const simpleResult = await executeDaxQuery(simpleQuery);
            
            console.log('[POWERBI] Fallback query result:', {
              hasResult: !!simpleResult,
              hasRows: !!(simpleResult && simpleResult.rows),
              rowCount: simpleResult?.rows?.length || 0,
              firstRow: simpleResult?.rows?.[0] ? JSON.stringify(simpleResult.rows[0]).substring(0, 200) : 'no rows'
            });
            
            if (simpleResult && simpleResult.rows && simpleResult.rows.length > 0 && simpleResult.rows[0]) {
              console.log('[POWERBI] ✓ Direct query succeeded, creating visual from this data');
              return {
                reportId,
                timestamp: new Date().toISOString(),
                visuals: [{
                  visualName: 'Dataset Overview',
                  visualType: 'card',
                  pageName: defaultPageName,
                  data: simpleResult.rows,
                  metadata: {
                    fields: Object.keys(simpleResult.rows[0] || {}),
                    measures: [],
                    aggregations: ['COUNTROWS'],
                    filters: [],
                  },
                  extractedAt: new Date().toISOString(),
                }],
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              };
            } else {
              console.warn('[POWERBI] Direct query returned empty results');
            }
          } catch (queryError: any) {
            console.error('[POWERBI] Direct query failed:', queryError.message);
            console.error('[POWERBI] Query error stack:', queryError.stack);
          }
        } else {
          console.warn('[POWERBI] Schema has no tables to query');
        }
      } catch (schemaError: any) {
        console.error('[POWERBI] Could not get schema for fallback:', schemaError.message);
        console.error('[POWERBI] Schema error stack:', schemaError.stack);
      }
      
      // Return empty but valid structure
      return {
        reportId,
        timestamp: new Date().toISOString(),
        visuals: [],
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }
    
    console.log('[POWERBI] Dashboard data extracted successfully:', {
      rows: dashboardData.rows.length,
      tables: dashboardData.tableCount,
      successfulExtractions: dashboardData.successfulExtractions,
      source: dashboardData.source
    });
    
    // Transform dashboard data into visual data format
    const dataRows = dashboardData.rows || [];
    const defaultPageName = pages[0]?.name || 'Overview';
    
    // CRITICAL: If we have data rows, we MUST create visuals
    if (dataRows.length === 0) {
      console.error('[POWERBI] ❌ CRITICAL ERROR: dashboardData.rows is empty array despite hasData check!');
      console.error('[POWERBI] dashboardData object:', JSON.stringify(dashboardData, null, 2));
    }
    
    console.log('[POWERBI] Processing', dataRows.length, 'data rows');
    if (dataRows.length > 0) {
      console.log('[POWERBI] First data row sample:', JSON.stringify(dataRows[0], null, 2));
      console.log('[POWERBI] First data row keys:', Object.keys(dataRows[0] || {}));
    }
    
    // ALWAYS create at least one visual if we have data - be very permissive
    // This ensures we never return 0 visuals when data exists
    if (dataRows.length > 0) {
      // Group data by type (but don't rely on this - always create fallback visuals)
      const rowCountData = dataRows.filter((row: any) => 
        (row.TotalRows && row.TotalRows > 0) || 
        (row.Count && row.Count > 0) ||
        row.TableName || 
        row.Source
      );
      const sampleDataRows = dataRows.filter((row: any) => 
        row.SampleRows && Array.isArray(row.SampleRows) && row.SampleRows.length > 0
      );
      const aggregationData = dataRows.filter((row: any) => {
        return Object.keys(row).some(key => 
          (key.endsWith('_Sum') || key.endsWith('_Count') || key.endsWith('_Average')) && 
          row[key] !== null && row[key] !== undefined
        );
      });
      const distinctDataRows = dataRows.filter((row: any) => 
        row.DistinctValues && Array.isArray(row.DistinctValues) && row.DistinctValues.length > 0
      );
      
      console.log('[POWERBI] Data categorization:', {
        rowCountData: rowCountData.length,
        sampleDataRows: sampleDataRows.length,
        aggregationData: aggregationData.length,
        distinctDataRows: distinctDataRows.length,
        totalRows: dataRows.length
      });
      
      // Create summary card visuals from row count data
      if (rowCountData.length > 0) {
        visuals.push({
          visualName: 'Summary Metrics',
          visualType: 'card',
          pageName: defaultPageName,
          data: rowCountData.slice(0, 20),
          metadata: {
            fields: Object.keys(rowCountData[0] || {}),
            measures: [],
            aggregations: ['COUNTROWS', 'COUNT'],
            filters: [],
          },
          extractedAt: new Date().toISOString(),
        });
        console.log('[POWERBI] Created summary card visual with', rowCountData.length, 'rows');
      }
      
      // Create table visuals from sample data
      for (let i = 0; i < Math.min(sampleDataRows.length, 5); i++) {
        const sampleRow = sampleDataRows[i];
        if (sampleRow.SampleRows && sampleRow.SampleRows.length > 0) {
          visuals.push({
            visualName: `${sampleRow.TableName || 'Data Table'} - Sample Data`,
            visualType: 'table',
            pageName: defaultPageName,
            data: sampleRow.SampleRows,
            metadata: {
              fields: sampleRow.ColumnNames || (sampleRow.SampleRows[0] ? Object.keys(sampleRow.SampleRows[0]) : []),
              measures: [],
              aggregations: [],
              filters: [],
            },
            extractedAt: new Date().toISOString(),
          });
          console.log('[POWERBI] Created table visual:', sampleRow.TableName, 'with', sampleRow.SampleRows.length, 'sample rows');
        }
      }
      
      // Create chart visuals from aggregation data
      if (aggregationData.length > 0) {
        visuals.push({
          visualName: 'Aggregated Metrics',
          visualType: 'barChart',
          pageName: defaultPageName,
          data: aggregationData.slice(0, 20),
          metadata: {
            fields: aggregationData[0] ? Object.keys(aggregationData[0]).filter(k => !k.endsWith('_Sum') && !k.endsWith('_Count') && !k.endsWith('_Average') && k !== 'TableName') : [],
            measures: aggregationData[0] ? Object.keys(aggregationData[0]).filter(k => k.endsWith('_Sum') || k.endsWith('_Count') || k.endsWith('_Average')) : [],
            aggregations: ['SUM', 'COUNT', 'AVERAGE'],
            filters: [],
          },
          extractedAt: new Date().toISOString(),
        });
        console.log('[POWERBI] Created aggregation chart visual with', aggregationData.length, 'rows');
      }
      
      // Create visuals from distinct values (categorization data)
      for (let i = 0; i < Math.min(distinctDataRows.length, 5); i++) {
        const distinctRow = distinctDataRows[i];
        if (distinctRow.DistinctValues && distinctRow.DistinctValues.length > 0) {
          visuals.push({
            visualName: `${distinctRow.ColumnName || 'Categories'} - Categories`,
            visualType: 'pieChart',
            pageName: defaultPageName,
            data: distinctRow.DistinctValues.map((val: any) => ({ 
              category: distinctRow.ColumnName || 'Category',
              value: val,
              count: 1 
            })),
            metadata: {
              fields: [distinctRow.ColumnName || 'Category'],
              measures: [],
              aggregations: [],
              filters: [],
            },
            extractedAt: new Date().toISOString(),
          });
          console.log('[POWERBI] Created pie chart visual:', distinctRow.ColumnName, 'with', distinctRow.DistinctValues.length, 'values');
        }
      }
      
      // CRITICAL: ALWAYS create at least one visual from ALL data if we haven't created any yet
      // This is a safety net to ensure we never return 0 visuals when data exists
      if (visuals.length === 0) {
        console.log('[POWERBI] ⚠️ No categorized visuals created, creating fallback visuals from all data');
        
        // Create a comprehensive visual from all data
        visuals.push({
          visualName: 'Dashboard Data Overview',
          visualType: 'table',
          pageName: defaultPageName,
          data: dataRows.slice(0, 100), // First 100 rows of data
          metadata: {
            fields: dataRows[0] ? Object.keys(dataRows[0]) : [],
            measures: [],
            aggregations: [],
            filters: [],
          },
          extractedAt: new Date().toISOString(),
        });
        console.log('[POWERBI] Created fallback overview visual with', Math.min(100, dataRows.length), 'rows');
      }
      
      // Also create additional summary visual if we have summary-like data
      const hasSummaryData = dataRows.some((row: any) => 
        row.TotalRows || row.Count || row.TableName || row.Source
      );
      if (hasSummaryData && visuals.length < 3) {
        const summaryRows = dataRows.filter((row: any) => 
          row.TotalRows || row.Count || row.TableName || row.Source
        );
        if (summaryRows.length > 0) {
          visuals.push({
            visualName: 'Data Summary',
            visualType: 'card',
            pageName: defaultPageName,
            data: summaryRows.slice(0, 50),
            metadata: {
              fields: summaryRows[0] ? Object.keys(summaryRows[0]) : [],
              measures: [],
              aggregations: [],
              filters: [],
            },
            extractedAt: new Date().toISOString(),
          });
          console.log('[POWERBI] Created additional summary visual with', summaryRows.length, 'rows');
        }
      }
    } else {
      console.warn('[POWERBI] ⚠️ No data rows to process - cannot create visuals');
    }
    
    const duration = Date.now() - startTime;
    console.log('[POWERBI] ✅ Visual data extraction completed:', {
      reportId,
      pagesProcessed: pages.length,
      visualsExtracted: visuals.length,
      dataRowsProcessed: dataRows.length,
      duration: `${duration}ms`
    });
    
    // FINAL SAFETY CHECK: If we STILL have no visuals but have data, create one no matter what
    if (visuals.length === 0 && dataRows.length > 0) {
      console.error('[POWERBI] ❌ CRITICAL: No visuals created despite having', dataRows.length, 'data rows');
      console.error('[POWERBI] Creating emergency fallback visual...');
      console.error('[POWERBI] Data row sample:', JSON.stringify(dataRows.slice(0, 2), null, 2));
      console.error('[POWERBI] Data row keys:', dataRows[0] ? Object.keys(dataRows[0]) : 'no keys');
      
      // Emergency fallback - create visual from ANY data structure
      visuals.push({
        visualName: 'Extracted Data',
        visualType: 'table',
        pageName: defaultPageName,
        data: dataRows.slice(0, 100),
        metadata: {
          fields: dataRows[0] ? Object.keys(dataRows[0]) : ['data'],
          measures: [],
          aggregations: [],
          filters: [],
        },
        extractedAt: new Date().toISOString(),
      });
      console.log('[POWERBI] ✅ Created emergency fallback visual with', Math.min(100, dataRows.length), 'rows');
    }
    
    if (visuals.length > 0) {
      console.log('[POWERBI] ✅ Successfully created', visuals.length, 'visuals from', dataRows.length, 'data rows');
    } else {
      console.error('[POWERBI] ❌ FAILED: No visuals created and no data available');
    }
    
    return {
      reportId,
      timestamp: new Date().toISOString(),
      visuals,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min TTL
    };
  } catch (error: any) {
    console.error('[POWERBI] ❌ Error extracting all visuals data:', error);
    console.error('[POWERBI] Error stack:', error.stack);
    return {
      reportId,
      timestamp: new Date().toISOString(),
      visuals: [],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Store visual data in both cache and database
 */
export async function storeVisualData(reportId: string, visualData: StoredVisualData): Promise<void> {
  try {
    // Store in cache
    visualDataCache.set(reportId, {
      data: visualData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    console.log('[POWERBI] Visual data cached for report:', reportId);
    
    // Store in database
    try {
      // Delete existing records for this report
      await db.execute(sql`
        DELETE FROM powerbi_visual_data 
        WHERE report_id = ${reportId}
      `);
      
      // Insert new records for each visual
      for (const visual of visualData.visuals) {
        await db.execute(sql`
          INSERT INTO powerbi_visual_data (
            report_id, 
            page_name, 
            visual_name, 
            visual_type, 
            data_json, 
            metadata_json, 
            extracted_at, 
            expires_at
          ) VALUES (
            ${reportId},
            ${visual.pageName},
            ${visual.visualName},
            ${visual.visualType},
            ${JSON.stringify(visual.data)}::jsonb,
            ${JSON.stringify(visual.metadata)}::jsonb,
            ${visual.extractedAt}::timestamp,
            ${visualData.expiresAt}::timestamp
          )
        `);
      }
      
      console.log('[POWERBI] Visual data stored in database for report:', reportId, '-', visualData.visuals.length, 'visuals');
    } catch (dbError: any) {
      // If database storage fails, log but don't throw (cache is still available)
      console.error('[POWERBI] Failed to store visual data in database:', dbError.message);
      // Check if table exists, if not, we'll create it in migration
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('table')) {
        console.warn('[POWERBI] powerbi_visual_data table may not exist yet. Run migration to create it.');
      }
    }
  } catch (error: any) {
    console.error('[POWERBI] Error storing visual data:', error);
    throw error;
  }
}

/**
 * Get stored visual data (from cache first, fallback to database)
 */
export async function getStoredVisualData(reportId: string): Promise<StoredVisualData | null> {
  try {
    // Check cache first
    const cached = visualDataCache.get(reportId);
    if (cached && cached.expiresAt > Date.now()) {
      console.log('[POWERBI] Visual data retrieved from cache for report:', reportId);
      return cached.data;
    }
    
    // Remove expired cache entry
    if (cached && cached.expiresAt <= Date.now()) {
      visualDataCache.delete(reportId);
    }
    
    // Try database
    try {
      const result = await db.execute(sql`
        SELECT 
          report_id,
          page_name,
          visual_name,
          visual_type,
          data_json,
          metadata_json,
          extracted_at,
          expires_at
        FROM powerbi_visual_data
        WHERE report_id = ${reportId}
          AND expires_at > NOW()
        ORDER BY extracted_at DESC
      `);
      
      if (result.rows && result.rows.length > 0) {
        // Group by visual and reconstruct StoredVisualData
        const visuals: VisualData[] = result.rows.map((row: any) => ({
          visualName: row.visual_name,
          visualType: row.visual_type,
          pageName: row.page_name,
          data: row.data_json || [],
          metadata: row.metadata_json || { fields: [], measures: [], aggregations: [], filters: [] },
          extractedAt: row.extracted_at,
        }));
        
        const storedData: StoredVisualData = {
          reportId: reportId,
          timestamp: result.rows[0]?.extracted_at || new Date().toISOString(),
          visuals,
          expiresAt: result.rows[0]?.expires_at || new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        };
        
        // Cache it for future use
        visualDataCache.set(reportId, {
          data: storedData,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        
        console.log('[POWERBI] Visual data retrieved from database for report:', reportId, '-', visuals.length, 'visuals');
        return storedData;
      }
    } catch (dbError: any) {
      // If table doesn't exist, that's okay - we'll create it in migration
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('table')) {
        console.warn('[POWERBI] powerbi_visual_data table may not exist yet. Run migration to create it.');
      } else {
        console.error('[POWERBI] Error retrieving visual data from database:', dbError.message);
      }
    }
    
    return null;
  } catch (error: any) {
    console.error('[POWERBI] Error getting stored visual data:', error);
    return null;
  }
}

/**
 * Clear expired visual data from cache and database
 */
export async function clearExpiredVisualData(): Promise<void> {
  try {
    // Clear expired cache entries
    const now = Date.now();
    for (const [reportId, cached] of visualDataCache.entries()) {
      if (cached.expiresAt <= now) {
        visualDataCache.delete(reportId);
      }
    }
    
    // Clear expired database entries
    try {
      await db.execute(sql`
        DELETE FROM powerbi_visual_data 
        WHERE expires_at < NOW()
      `);
      console.log('[POWERBI] Expired visual data cleared from database');
    } catch (dbError: any) {
      // Table might not exist yet
      if (!dbError.message?.includes('does not exist') && !dbError.message?.includes('relation') && !dbError.message?.includes('table')) {
        console.error('[POWERBI] Error clearing expired visual data from database:', dbError.message);
      }
    }
  } catch (error: any) {
    console.error('[POWERBI] Error clearing expired visual data:', error);
  }
}
