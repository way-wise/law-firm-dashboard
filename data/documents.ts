// Document interface aligned with Docketwise API
export interface Document {
  id: number;
  title: string;
  firm_id: number;
  client_id: number | null;
  matter_id: number | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
  size: number; // Size in bytes
  user_id: number;
  uploaded_by_email: string | null;
  doc_url: string;
  description?: string | null;
  filename?: string | null;
}

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

// Helper to get file extension
export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
};

// Mock documents data
export const documents: Document[] = [
  {
    id: 1,
    title: "John Doe's G28",
    firm_id: 1,
    client_id: 7,
    matter_id: 1,
    created_at: "2019-09-02T17:56:46.492-05:00",
    updated_at: "2019-09-02T17:56:46.492-05:00",
    archived: false,
    size: 369233,
    user_id: 3,
    uploaded_by_email: "soraya@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/1",
    description: "Form G-28 Notice of Entry of Appearance",
    filename: "g28_john_doe.pdf",
  },
  {
    id: 2,
    title: "Maria Rodriguez - I-485 Supporting Documents",
    firm_id: 1,
    client_id: 1,
    matter_id: 1,
    created_at: "2024-10-15T10:30:00.000-05:00",
    updated_at: "2024-10-15T10:30:00.000-05:00",
    archived: false,
    size: 2048576,
    user_id: 1,
    uploaded_by_email: "soraya@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/2",
    description: "Supporting documents for I-485 application",
    filename: "i485_supporting_docs.pdf",
  },
  {
    id: 3,
    title: "Chen Wei - H-1B Petition Package",
    firm_id: 1,
    client_id: 2,
    matter_id: 2,
    created_at: "2024-11-05T14:20:00.000-05:00",
    updated_at: "2024-11-05T14:20:00.000-05:00",
    archived: false,
    size: 5123456,
    user_id: 4,
    uploaded_by_email: "sue@contractor.com",
    doc_url: "https://app.docketwise.com/documents/3",
    description: "Complete H-1B petition package",
    filename: "h1b_petition_package.pdf",
  },
  {
    id: 4,
    title: "Ahmed Hassan - Asylum Application",
    firm_id: 1,
    client_id: 3,
    matter_id: 3,
    created_at: "2024-11-10T09:15:00.000-05:00",
    updated_at: "2024-11-10T09:15:00.000-05:00",
    archived: false,
    size: 1024000,
    user_id: 2,
    uploaded_by_email: "saurabh@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/4",
    description: "Asylum application form and supporting evidence",
    filename: "asylum_application.pdf",
  },
  {
    id: 5,
    title: "Priya Sharma - L-1A Supporting Letter",
    firm_id: 1,
    client_id: 4,
    matter_id: 4,
    created_at: "2024-11-15T11:45:00.000-05:00",
    updated_at: "2024-11-15T11:45:00.000-05:00",
    archived: false,
    size: 256000,
    user_id: 3,
    uploaded_by_email: "maryam@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/5",
    description: "Employer support letter for L-1A petition",
    filename: "l1a_support_letter.pdf",
  },
  {
    id: 6,
    title: "Dimitri Volkov - EB-2 NIW Research Papers",
    firm_id: 1,
    client_id: 5,
    matter_id: 5,
    created_at: "2024-11-20T13:30:00.000-05:00",
    updated_at: "2024-11-20T13:30:00.000-05:00",
    archived: false,
    size: 8192000,
    user_id: 5,
    uploaded_by_email: "santosh@contractor.com",
    doc_url: "https://app.docketwise.com/documents/6",
    description: "Research publications and citations",
    filename: "eb2_niw_research.zip",
  },
  {
    id: 7,
    title: "Fatima Al-Sayed - O-1 Recommendation Letters",
    firm_id: 1,
    client_id: 6,
    matter_id: 6,
    created_at: "2024-11-25T16:00:00.000-05:00",
    updated_at: "2024-11-25T16:00:00.000-05:00",
    archived: false,
    size: 1536000,
    user_id: 2,
    uploaded_by_email: "mike@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/7",
    description: "Recommendation letters from peers",
    filename: "o1_recommendations.pdf",
  },
  {
    id: 8,
    title: "Yuki Tanaka - H-1B RFE Response",
    firm_id: 1,
    client_id: 8,
    matter_id: 8,
    created_at: "2024-12-10T10:00:00.000-05:00",
    updated_at: "2024-12-10T10:00:00.000-05:00",
    archived: false,
    size: 3072000,
    user_id: 1,
    uploaded_by_email: "soraya@lawfirm.com",
    doc_url: "https://app.docketwise.com/documents/8",
    description: "Response to Request for Evidence",
    filename: "h1b_rfe_response.pdf",
  },
];

// Get paginated documents
export function getDocuments(page: number = 1, limit: number = 10, search?: string) {
  let filtered = documents;

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.filename?.toLowerCase().includes(searchLower)
    );
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const data = filtered.slice(start, end);

  return {
    data,
    meta: {
      page,
      limit,
      total: filtered.length,
    },
  };
}

// Get document by ID
export const getDocumentById = (id: number) => documents.find((d) => d.id === id);

// Get documents by client ID
export const getDocumentsByClientId = (clientId: number) =>
  documents.filter((d) => d.client_id === clientId && !d.archived);

// Get documents by matter ID
export const getDocumentsByMatterId = (matterId: number) =>
  documents.filter((d) => d.matter_id === matterId && !d.archived);

