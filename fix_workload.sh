#!/bin/bash
# Script to simplify workload calculation - Option 1

FILE="server/storage.ts"

# Remove the three helper functions (lines 1015-1049)
sed -i '1015,1049d' "$FILE"

# Now the query section will be at a different line, so let's find and replace the pattern
# Replace the complex query with a simple one
sed -i '/Get detailed task data with request priority for active tasks/,/\);/{
  s/Get detailed task data with request priority for active tasks/Get expected time for active tasks (expectedTime already includes PERT adjustments)/
  /dueDate: tasks.dueDate,/d
  /status: tasks.status,/d
  /requestId: tasks.requestId,/d
  /requestPriority: dataRequests.priority,/d
  /\.leftJoin(dataRequests/d
}' "$FILE"

# Simplify the calculation - find and replace the complex reduce
sed -i '/Calculate weighted workload/,/}, 0);/{
  /const totalWeightedHours/,/}, 0);/{
    s/const baseHours = task.expectedTime || 0;/return sum + (task.expectedTime || 0);/
    /const priorityWeight/d
    /const urgencyFactor/d
    /const statusFactor/d
    /return sum + (baseHours/d
    s/}, 0);/}, 0);/
  }
}' "$FILE"

# Remove the "unweighted hours" comment since all hours are now unweighted
sed -i 's/Calculate unweighted hours for reference/Total hours from PERT estimates/' "$FILE"

# Update comments
sed -i 's/Convert weighted hours to days/Convert total hours to productive days/' "$FILE"
sed -i 's/Time-based metrics (now weighted)/Time-based metrics (from PERT estimates)/' "$FILE"

echo "Done! File modified."

