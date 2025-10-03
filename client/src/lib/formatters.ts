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
    case "new_dashboard":
      return "New Dashboard/Report";
    case "modify_dashboard":
      return "Modification to Existing Dashboard/Report";
    case "adhoc_analysis":
      return "Ad-hoc Data Analysis";
    case "data_extraction":
      return "One-time Data Extraction";
    case "data_bug":
      return "Data Bug / Data Quality Issue";
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
