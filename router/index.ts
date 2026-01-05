import { createTodo, deleteTodo, getTodos, updateTodo, updateTodoStatus } from "./todos";

export const router = {
  todos: {
    get: getTodos,
    create: createTodo,
    update: updateTodo,
    updateStatus: updateTodoStatus,
    delete: deleteTodo,
  },
};
