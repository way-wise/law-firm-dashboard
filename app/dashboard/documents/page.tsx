import { getDocuments } from "@/data/documents";
import DocumentsTable from "./documents-table";

const DocumentsPage = () => {
  const documentsData = getDocuments(1, 10);

  return <DocumentsTable documents={documentsData} />;
};

export default DocumentsPage;

