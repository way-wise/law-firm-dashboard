// Meta Data
export type MetaData = {
  page: number;
  limit: number;
  total: number;
};

// Paginated Data
export type PaginatedData<TData> = {
  data: TData[];
  meta: MetaData;
};

// Todo
// export type Todo = {
//   id: string;
//   title: string;
//   status: "pending" | "completed";
//   description: string | null;
//   createdAt: string | Date;
//   updatedAt: string | Date;
// };
