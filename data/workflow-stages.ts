export interface WorkflowStage {
  id: string;
  name: string;
  code: string;
  order: number;
  color: string;
  icon: string;
  isTerminal: boolean;
  isActive: boolean;
}

export const workflowStages: WorkflowStage[] = [
  { id: "ws1", name: "Intake", code: "INTAKE", order: 1, color: "#22c55e", icon: "inbox", isTerminal: false, isActive: true },
  { id: "ws2", name: "Document Collection", code: "DOC_COLLECTION", order: 2, color: "#3b82f6", icon: "folder", isTerminal: false, isActive: true },
  { id: "ws3", name: "Drafting", code: "DRAFTING", order: 3, color: "#8b5cf6", icon: "pen-tool", isTerminal: false, isActive: true },
  { id: "ws4", name: "Review", code: "REVIEW", order: 4, color: "#f59e0b", icon: "eye", isTerminal: false, isActive: true },
  { id: "ws5", name: "Filed", code: "FILED", order: 5, color: "#06b6d4", icon: "send", isTerminal: false, isActive: true },
  { id: "ws6", name: "Pending", code: "PENDING", order: 6, color: "#64748b", icon: "clock", isTerminal: false, isActive: true },
  { id: "ws7", name: "RFE", code: "RFE", order: 7, color: "#ef4444", icon: "alert-circle", isTerminal: false, isActive: true },
  { id: "ws8", name: "Approved", code: "APPROVED", order: 8, color: "#22c55e", icon: "check-circle", isTerminal: true, isActive: true },
  { id: "ws9", name: "Denied", code: "DENIED", order: 9, color: "#ef4444", icon: "x-circle", isTerminal: true, isActive: true },
  { id: "ws10", name: "Withdrawn", code: "WITHDRAWN", order: 10, color: "#6b7280", icon: "minus-circle", isTerminal: true, isActive: true },
];

export const getWorkflowStageById = (id: string) => workflowStages.find((ws) => ws.id === id);

export const getActiveStages = () => workflowStages.filter((ws) => ws.isActive && !ws.isTerminal);
