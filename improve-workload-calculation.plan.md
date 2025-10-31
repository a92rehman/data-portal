# Improve Team Workload Calculation Formula

## Overview
Enhance the team workload management system with a more sophisticated, logical formula that accounts for task priority, urgency, complexity, and realistic capacity constraints.

## Current Issues

### 1. Oversimplified Calculation
- All active tasks weighted equally
- No consideration of due dates or urgency
- Blocked tasks counted at full weight
- Simple ceiling function doesn't reflect reality

### 2. Unrealistic Capacity Assumptions
- Fixed 5-day (30-hour) weekly capacity
- Doesn't account for meetings, admin work, or context switching
- No buffer for unexpected work or interruptions

### 3. Missing Key Factors
- Task priority not considered
- Due date urgency ignored
- Confidence levels not factored in
- No distinction between focused vs. fragmented work

## Proposed Improved Formula

### Core Components

#### 1. **Weighted Task Hours**
```
Weighted Hours = Base Expected Time × Priority Weight × Urgency Factor × Status Factor
```

**Priority Weights:**
- Critical: 1.3x (needs immediate attention)
- High: 1.15x (important work)
- Medium: 1.0x (standard weight)
- Low: 0.85x (can be deferred)

**Urgency Factor (based on due date):**
- Overdue: 1.5x (critical)
- Due within 2 days: 1.3x (urgent)
- Due within 1 week: 1.1x (soon)
- Due within 2 weeks: 1.0x (normal)
- Due beyond 2 weeks: 0.9x (future)
- No due date: 0.8x (lowest priority)

**Status Factor:**
- to_do: 1.0x (full weight)
- in_progress: 1.2x (already started, needs completion)
- blocked: 0.3x (waiting on others, reduced weight)
- completed: 0x (excluded from active workload)

#### 2. **Realistic Weekly Capacity**
```
Effective Weekly Capacity = (5 days × 6 hours/day) × Productivity Factor
                          = 30 hours × 0.75
                          = 22.5 hours
```

**Productivity Factor: 0.75 (75%)**
Accounts for:
- Meetings and standups (10%)
- Email and communication (5%)
- Context switching (5%)
- Breaks and admin tasks (5%)

#### 3. **Workload Metrics**

**Total Weighted Hours:**
```
Total Weighted Hours = Σ(Task Expected Time × Priority Weight × Urgency Factor × Status Factor)
```

**Workload Days:**
```
Workload Days = Total Weighted Hours / 6 hours per day
```

**Capacity Utilization:**
```
Utilization % = (Total Weighted Hours / Effective Weekly Capacity) × 100
              = (Total Weighted Hours / 22.5) × 100
```

**Available Capacity:**
```
Available Hours = Effective Weekly Capacity - Total Weighted Hours
Available Days = Available Hours / 6
```

#### 4. **Enhanced Capacity Levels**

```
Available:    0-20% utilization   (< 4.5 hours)
Light:        20-50% utilization  (4.5-11.25 hours)
Moderate:     50-75% utilization  (11.25-16.875 hours)
Heavy:        75-95% utilization  (16.875-21.375 hours)
Overloaded:   95%+ utilization    (> 21.375 hours)
Critical:     120%+ utilization   (> 27 hours) - unsustainable
```

## Implementation Plan

### File: `/home/runner/workspace/server/storage.ts`

**Update `getTeamWorkload()` method (lines 998-1092):**

1. **Fetch tasks with additional data:**
   - Include `dueDate`, `priority`, and `status`
   - Get request priority for request-linked tasks

2. **Calculate urgency factor:**
```typescript
const calculateUrgencyFactor = (dueDate: Date | null): number => {
  if (!dueDate) return 0.8;
  
  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) return 1.5;      // Overdue
  if (daysUntilDue <= 2) return 1.3;     // Due within 2 days
  if (daysUntilDue <= 7) return 1.1;     // Due within 1 week
  if (daysUntilDue <= 14) return 1.0;    // Due within 2 weeks
  return 0.9;                             // Due beyond 2 weeks
};
```

3. **Calculate priority weight:**
```typescript
const getPriorityWeight = (priority: string | null): number => {
  switch (priority) {
    case 'critical': return 1.3;
    case 'high': return 1.15;
    case 'medium': return 1.0;
    case 'low': return 0.85;
    default: return 1.0;
  }
};
```

4. **Calculate status factor:**
```typescript
const getStatusFactor = (status: string): number => {
  switch (status) {
    case 'to_do': return 1.0;
    case 'in_progress': return 1.2;
    case 'blocked': return 0.3;
    case 'completed': return 0;
    default: return 1.0;
  }
};
```

5. **Calculate weighted workload:**
```typescript
const HOURS_PER_DAY = 6;
const PRODUCTIVITY_FACTOR = 0.75;
const DAYS_PER_WEEK = 5;
const EFFECTIVE_WEEKLY_CAPACITY = DAYS_PER_WEEK * HOURS_PER_DAY * PRODUCTIVITY_FACTOR; // 22.5 hours

// For each task
const weightedHours = (expectedTime || 0) * 
                     getPriorityWeight(task.priority) * 
                     calculateUrgencyFactor(task.dueDate) * 
                     getStatusFactor(task.status);

const totalWeightedHours = sum of all weightedHours;
const workloadDays = totalWeightedHours / HOURS_PER_DAY;
const utilizationPercent = (totalWeightedHours / EFFECTIVE_WEEKLY_CAPACITY) * 100;
const availableHours = Math.max(0, EFFECTIVE_WEEKLY_CAPACITY - totalWeightedHours);
const availableDays = availableHours / HOURS_PER_DAY;
```

6. **Enhanced capacity assessment:**
```typescript
const capacityLevel = 
  utilizationPercent === 0 ? 'available' :
  utilizationPercent <= 20 ? 'available' :
  utilizationPercent <= 50 ? 'light' :
  utilizationPercent <= 75 ? 'moderate' :
  utilizationPercent <= 95 ? 'heavy' :
  utilizationPercent <= 120 ? 'overloaded' :
  'critical';
```

### File: `/home/runner/workspace/client/src/pages/analytics.tsx`

**Update workload display (lines 635-732):**

1. Add visual indicators for critical overload
2. Show breakdown of weighted vs actual hours
3. Display urgency distribution (overdue, urgent, normal)
4. Add tooltip explaining the calculation

## Expected Benefits

1. **More Accurate Load Assessment:**
   - Reflects real-world priorities and urgency
   - Accounts for realistic working capacity
   - Better identifies overloaded team members

2. **Better Task Assignment:**
   - Data leads can see who has capacity for urgent work
   - Prevents assigning critical tasks to overloaded analysts
   - Helps balance workload across team

3. **Improved Planning:**
   - Realistic capacity planning
   - Better deadline estimation
   - Proactive identification of bottlenecks

4. **Enhanced Visibility:**
   - Clear understanding of team capacity
   - Identifies blocked tasks that need attention
   - Shows impact of urgent vs. routine work

## Testing Scenarios

1. **Analyst with 3 urgent tasks (due in 2 days)** - Should show higher utilization
2. **Analyst with 5 low-priority tasks (due in 3 weeks)** - Should show moderate utilization
3. **Analyst with 2 blocked tasks** - Should show reduced workload
4. **Analyst with mix of priorities** - Should show balanced calculation

## Future Enhancements

1. Historical workload tracking
2. Burndown charts for team capacity
3. Predictive analytics for capacity planning
4. Individual productivity factor adjustments
5. Task complexity scoring based on PERT variance













