import { createTodo, deleteTodo, getTodos, updateTodo, updateTodoStatus } from "./todos";
import { getDocketwiseToken } from "./docketwise";

export const router = {
  todos: {
    get: getTodos,
    create: createTodo,
    update: updateTodo,
    updateStatus: updateTodoStatus,
    delete: deleteTodo,
  },
  docketwise: {
    getToken: getDocketwiseToken,
  },
};
