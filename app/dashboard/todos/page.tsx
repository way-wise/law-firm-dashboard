import "@/lib/orpc/server";
import { client } from "@/lib/orpc/client";
import TodosTable from "./todos-table";

const TodosPage = async ({
  searchParams,
}: PageProps<"/dashboard/todos">) => {
  const { page, limit, search, status } = await searchParams;

  const todos = await client.todos.get({
    page: page ?? 1,
    limit: limit ?? 10,
    search: typeof search === "string" ? search : undefined,
    status: status as "pending" | "completed" | undefined
  });

  return <TodosTable todos={todos} />;
};

export default TodosPage;
