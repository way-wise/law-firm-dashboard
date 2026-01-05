import type { PaginationSchemaType } from "@/schema/paginationSchema";

// Extract pagination queries
export function getPaginationQuery(query: PaginationSchemaType) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}
