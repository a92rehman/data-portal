import { ClientSecretCredential } from '@azure/identity';

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
    const token = await credential.getToken('https://analysis.windows.net/powerbi/api/.default');

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
    if (results.length > 0) {
      // Check if results actually contain meaningful data
      const hasMeaningfulData = results.some(row => {
        if (row.TotalRows && row.TotalRows > 0) return true;
        if (row.Count && row.Count > 0) return true;
        if (row.SampleRows && Array.isArray(row.SampleRows) && row.SampleRows.length > 0) return true;
        return false;
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
      }
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


