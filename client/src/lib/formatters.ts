export function formatPriority(priority: string): string {
  switch (priority) {
    case "p0_critical":
      return "P0 - Critical";
    case "p1_high":
      return "P1 - High";
    case "p2_medium":
      return "P2 - Medium";
    case "p3_low":
      return "P3 - Low";
    default:
      return priority;
  }
}

export function formatRequestType(type: string): string {
  switch (type) {
    case "user_investigation":
      return "User Investigation";
    case "data_extraction":
      return "One-time Data Request";
    case "bq_access":
      return "BigQuery/Tool Access";
    case "data_bug":
      return "Data Bug/Data Quality Issue";
    case "adhoc_analysis":
      return "Ad-hoc Analysis";
    case "modify_dashboard":
      return "Modification to Existing Dashboard";
    case "new_dashboard":
      return "New Dashboard";
    case "training":
      return "Training (Capacity Building)";
    case "experimentation":
      return "Experimentation";
    case "tracking":
      return "Event Tracking";
    case "metric_change":
      return "Metric Change";
    case "pipeline_change":
      return "Pipeline Change";
    case "recurring_report":
      return "Recurring Report";
    case "other":
      return "Other";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "p0_critical":
      return "hsl(0, 84%, 60%)";
    case "p1_high":
      return "hsl(0, 72%, 51%)";
    case "p2_medium":
      return "hsl(38, 92%, 50%)";
    case "p3_low":
      return "hsl(199, 89%, 48%)";
    default:
      return "hsl(199, 89%, 48%)";
  }
}

export function formatDepartment(dept: string): string {
  return dept; // Departments are already properly formatted
}

export function formatFrequency(frequency: string, duration?: number, unit?: string): string {
  if (frequency === "One Time") {
    return "One Time";
  }
  if (duration && unit) {
    return `${frequency} for ${duration} ${unit}`;
  }
  return frequency;
}

export function formatImpact(impact: string): string {
  return impact; // Impacts are already properly formatted
}
