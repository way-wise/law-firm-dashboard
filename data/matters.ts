import { workers } from "./workers";

// Docketwise API aligned types
export type PriorityDateStatus = "undefined" | "current" | "not_current";

// Receipt from USCIS case status
export interface Receipt {
  id: number;
  number: string; // e.g., "EAC0000000000"
  description: string | null;
  status_update_type: "manual" | "automatic";
  created_at: string;
  updated_at: string;
}

// Note attached to matter
export interface Note {
  id: number;
  title: string;
  content: string;
  category: string;
  date: string;
  starred: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// Client/Contact info embedded in matter
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  company_name: string | null;
  email: string | null;
  lead: boolean;
  created_at: string;
  updated_at: string;
}

// Matter Status (workflow stage)
export interface MatterStatus {
  id: number;
  name: string;
  duration: number | null;
  sort: number | null;
  created_at: string;
  updated_at: string;
}

// Matter Type with associated statuses
export interface MatterType {
  id: number;
  name: string;
  matter_statuses: MatterStatus[];
  created_at: string;
  updated_at: string;
}

// Main Matter interface aligned with Docketwise API
export interface Matter {
  id: number;
  number: string | null; // Case number
  title: string;
  description: string | null;
  client_id: number;
  attorney_id: number | null;
  user_ids: number[]; // Assigned team members
  status: MatterStatus | null;
  type: MatterType | null;
  receipt_number: string | null;
  priority_date: string | null;
  priority_date_status: PriorityDateStatus;
  archived: boolean;
  discarded_at: string | null;
  created_at: string;
  updated_at: string;
  // Embedded relations
  client: Client;
  receipts: Receipt[];
  notes: Note[];
  // Additional fields
  paralegal: string | null;
  billing_status: "pending" | "invoiced" | "paid" | null;
}

// Matter statuses (workflow stages)
export const matterStatuses: MatterStatus[] = [
  { id: 1, name: "Case Evaluation", duration: null, sort: 1, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 2, name: "Document Collection", duration: null, sort: 2, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 3, name: "Drafting", duration: null, sort: 3, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 4, name: "Review", duration: null, sort: 4, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 5, name: "Filed", duration: null, sort: 5, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 6, name: "RFE Received", duration: null, sort: 6, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 7, name: "RFE Response", duration: null, sort: 7, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 8, name: "Approved", duration: null, sort: 8, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 9, name: "Denied", duration: null, sort: 9, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
];

// Matter types with their workflow statuses
export const matterTypes: MatterType[] = [
  { id: 1, name: "I-485 Adjustment of Status", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 2, name: "H-1B Petition", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 3, name: "Asylum Application", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 4, name: "L-1 Intracompany Transfer", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 5, name: "EB-2 NIW", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 6, name: "O-1 Extraordinary Ability", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
  { id: 7, name: "Family-Based Green Card", matter_statuses: matterStatuses, created_at: "2024-01-01T00:00:00Z", updated_at: "2024-01-01T00:00:00Z" },
];

export const matters: Matter[] = [
  {
    id: 1,
    number: "M-2024-001",
    title: "Maria Rodriguez - I-485",
    description: "Adjustment of Status application for permanent residence",
    client_id: 1,
    attorney_id: 1,
    user_ids: [1, 2],
    status: matterStatuses[2], // Drafting
    type: matterTypes[0], // I-485
    receipt_number: null,
    priority_date: "2024-10-31",
    priority_date_status: "current",
    archived: false,
    discarded_at: null,
    created_at: "2024-10-31T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    client: {
      id: 1,
      first_name: "Maria",
      last_name: "Rodriguez",
      middle_name: null,
      company_name: null,
      email: "maria.rodriguez@email.com",
      lead: false,
      created_at: "2024-10-31T00:00:00Z",
      updated_at: "2024-10-31T00:00:00Z",
    },
    receipts: [],
    notes: [
      { id: 1, title: "Initial consultation", content: "Client seeking green card through employment", category: "All Notes", date: "2024-10-31T10:00:00Z", starred: false, created_by_name: "Soraya", created_at: "2024-10-31T10:00:00Z", updated_at: "2024-10-31T10:00:00Z" },
      { id: 2, title: "Documents received", content: "Received passport, I-94, and employment letter", category: "All Notes", date: "2024-11-05T14:00:00Z", starred: true, created_by_name: "Soraya", created_at: "2024-11-05T14:00:00Z", updated_at: "2024-11-05T14:00:00Z" },
    ],
    paralegal: "Soraya Martinez",
    billing_status: "invoiced",
  },
  {
    id: 2,
    number: "M-2024-002",
    title: "Chen Wei - H-1B",
    description: "H-1B specialty occupation petition",
    client_id: 2,
    attorney_id: 1,
    user_ids: [4],
    status: matterStatuses[5], // RFE Received
    type: matterTypes[1], // H-1B
    receipt_number: "EAC2490012345",
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-11-05T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    client: {
      id: 2,
      first_name: "Chen",
      last_name: "Wei",
      middle_name: null,
      company_name: null,
      email: "chen.wei@email.com",
      lead: false,
      created_at: "2024-11-05T00:00:00Z",
      updated_at: "2024-11-05T00:00:00Z",
    },
    receipts: [
      { id: 1, number: "EAC2490012345", description: "H-1B Petition", status_update_type: "automatic", created_at: "2024-11-20T00:00:00Z", updated_at: "2024-12-15T00:00:00Z" },
    ],
    notes: [
      { id: 3, title: "RFE received", content: "USCIS requesting additional evidence for specialty occupation", category: "All Notes", date: "2024-12-10T09:00:00Z", starred: true, created_by_name: "Sue", created_at: "2024-12-10T09:00:00Z", updated_at: "2024-12-10T09:00:00Z" },
    ],
    paralegal: "Sue Chen",
    billing_status: "paid",
  },
  {
    id: 3,
    number: "M-2024-003",
    title: "Ahmed Hassan - Asylum",
    description: "Affirmative asylum application",
    client_id: 3,
    attorney_id: 1,
    user_ids: [2],
    status: matterStatuses[0], // Case Evaluation
    type: matterTypes[2], // Asylum
    receipt_number: null,
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-11-10T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    client: {
      id: 3,
      first_name: "Ahmed",
      last_name: "Hassan",
      middle_name: null,
      company_name: null,
      email: "ahmed.hassan@email.com",
      lead: false,
      created_at: "2024-11-10T00:00:00Z",
      updated_at: "2024-11-10T00:00:00Z",
    },
    receipts: [],
    notes: [],
    paralegal: "Mike Johnson",
    billing_status: "pending",
  },
  {
    id: 4,
    number: "M-2024-004",
    title: "Priya Sharma - L-1",
    description: "L-1A intracompany transferee manager",
    client_id: 4,
    attorney_id: 1,
    user_ids: [3],
    status: matterStatuses[4], // Filed
    type: matterTypes[3], // L-1
    receipt_number: "WAC2490054321",
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-11-15T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    client: {
      id: 4,
      first_name: "Priya",
      last_name: "Sharma",
      middle_name: null,
      company_name: null,
      email: "priya.sharma@email.com",
      lead: false,
      created_at: "2024-11-15T00:00:00Z",
      updated_at: "2024-11-15T00:00:00Z",
    },
    receipts: [
      { id: 2, number: "WAC2490054321", description: "L-1A Petition", status_update_type: "automatic", created_at: "2024-12-01T00:00:00Z", updated_at: "2024-12-20T00:00:00Z" },
    ],
    notes: [],
    paralegal: "Lisa Park",
    billing_status: "paid",
  },
  {
    id: 5,
    number: "M-2024-005",
    title: "Dimitri Volkov - EB-2 NIW",
    description: "EB-2 National Interest Waiver petition",
    client_id: 5,
    attorney_id: 1,
    user_ids: [5],
    status: matterStatuses[2], // Drafting
    type: matterTypes[4], // EB-2 NIW
    receipt_number: null,
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-11-20T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    client: {
      id: 5,
      first_name: "Dimitri",
      last_name: "Volkov",
      middle_name: null,
      company_name: null,
      email: "dimitri.volkov@email.com",
      lead: false,
      created_at: "2024-11-20T00:00:00Z",
      updated_at: "2024-11-20T00:00:00Z",
    },
    receipts: [],
    notes: [],
    paralegal: "David Kim",
    billing_status: "invoiced",
  },
  {
    id: 6,
    number: "M-2024-006",
    title: "Fatima Al-Sayed - O-1",
    description: "O-1A extraordinary ability in sciences",
    client_id: 6,
    attorney_id: 1,
    user_ids: [2],
    status: matterStatuses[4], // Filed
    type: matterTypes[5], // O-1
    receipt_number: "EAC2490067890",
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-11-25T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    client: {
      id: 6,
      first_name: "Fatima",
      last_name: "Al-Sayed",
      middle_name: null,
      company_name: null,
      email: "fatima.alsayed@email.com",
      lead: false,
      created_at: "2024-11-25T00:00:00Z",
      updated_at: "2024-11-25T00:00:00Z",
    },
    receipts: [
      { id: 3, number: "EAC2490067890", description: "O-1A Petition", status_update_type: "automatic", created_at: "2024-12-10T00:00:00Z", updated_at: "2024-12-20T00:00:00Z" },
    ],
    notes: [],
    paralegal: "Mike Johnson",
    billing_status: "paid",
  },
  {
    id: 7,
    number: "M-2024-007",
    title: "John Smith - Family GC",
    description: "Family-based green card through US citizen spouse",
    client_id: 7,
    attorney_id: null,
    user_ids: [],
    status: matterStatuses[0], // Case Evaluation
    type: matterTypes[6], // Family-Based
    receipt_number: null,
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-12-01T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    client: {
      id: 7,
      first_name: "John",
      last_name: "Smith",
      middle_name: null,
      company_name: null,
      email: "john.smith@email.com",
      lead: false,
      created_at: "2024-12-01T00:00:00Z",
      updated_at: "2024-12-01T00:00:00Z",
    },
    receipts: [],
    notes: [],
    paralegal: null,
    billing_status: "pending",
  },
  {
    id: 8,
    number: "M-2024-008",
    title: "Yuki Tanaka - H-1B",
    description: "H-1B specialty occupation petition - Software Engineer",
    client_id: 8,
    attorney_id: 1,
    user_ids: [1],
    status: matterStatuses[4], // Filed
    type: matterTypes[1], // H-1B
    receipt_number: "EAC2490098765",
    priority_date: null,
    priority_date_status: "undefined",
    archived: false,
    discarded_at: null,
    created_at: "2024-12-05T00:00:00Z",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    client: {
      id: 8,
      first_name: "Yuki",
      last_name: "Tanaka",
      middle_name: null,
      company_name: null,
      email: "yuki.tanaka@email.com",
      lead: false,
      created_at: "2024-12-05T00:00:00Z",
      updated_at: "2024-12-05T00:00:00Z",
    },
    receipts: [
      { id: 4, number: "EAC2490098765", description: "H-1B Petition", status_update_type: "automatic", created_at: "2024-12-20T00:00:00Z", updated_at: "2024-12-25T00:00:00Z" },
    ],
    notes: [],
    paralegal: "Soraya Martinez",
    billing_status: "invoiced",
  },
];

// Get paginated matters
export function getMatters(page: number = 1, limit: number = 10) {
  const start = (page - 1) * limit;
  const end = start + limit;
  const data = matters.slice(start, end);
  
  return {
    data,
    meta: {
      page,
      limit,
      total: matters.length,
    },
  };
}

export const getMatterById = (id: number) => matters.find((m) => m.id === id);

// Helper to get client full name
export const getClientName = (client: Client) => 
  `${client.first_name} ${client.last_name}`.trim();

// Helper to get status name safely
export const getStatusName = (matter: Matter) => 
  matter.status?.name || "No Status";

// Helper to get type name safely
export const getTypeName = (matter: Matter) => 
  matter.type?.name || "No Type";

// Dashboard stats
export function getDashboardStats() {
  const totalCases = matters.filter(m => !m.archived).length;
  const drafting = matters.filter((m) => m.status?.name === "Drafting").length;
  const rfes = matters.filter((m) => m.status?.name === "RFE Received" || m.status?.name === "RFE Response").length;
  const filed = matters.filter((m) => m.status?.name === "Filed").length;
  const caseEvaluation = matters.filter((m) => m.status?.name === "Case Evaluation").length;
  
  // Calculate additional metrics
  const monthlyGrowth = 23; // Mock data: percentage growth this month
  const teamMembers = workers.filter(w => w.isActive).length;
  const avgResolutionTime = 45; // Mock data: average days to resolve a case
  
  return {
    totalCases,
    drafting,
    rfes,
    filed,
    activeUnfiled: caseEvaluation + drafting,
    monthlyGrowth,
    teamMembers,
    avgResolutionTime,
  };
}

// Team stats for dashboard
export function getTeamStats() {
  const inHouseWorkers = workers.filter((w) => w.teamType === "inHouse" && w.isActive);
  const contractorWorkers = workers.filter((w) => w.teamType === "contractor" && w.isActive);
  
  const inHouseTotal = inHouseWorkers.reduce((sum, w) => sum + w.activeCases, 0);
  const contractorTotal = contractorWorkers.reduce((sum, w) => sum + w.activeCases, 0);
  
  return {
    inHouse: {
      totalActive: inHouseTotal,
      workers: inHouseWorkers.map((w) => ({
        id: w.id,
        name: w.name,
        caseCount: w.activeCases,
        image: w.image,
      })),
    },
    contractors: {
      totalActive: contractorTotal,
      workers: contractorWorkers.map((w) => ({
        id: w.id,
        name: w.name,
        caseCount: w.activeCases,
        image: w.image,
      })),
    },
  };
}
