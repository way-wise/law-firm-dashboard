import { getConnectionStatus } from "./docketwise";
import {
  createMatter,
  deleteMatter,
  getMatterById,
  getMatterReceipts,
  getMatters,
  updateMatter,
} from "./matters";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  updateTodoStatus,
} from "./todos";

export const router = {
  todos: {
    get: getTodos,
    create: createTodo,
    update: updateTodo,
    updateStatus: updateTodoStatus,
    delete: deleteTodo,
  },
  matters: {
    get: getMatters,
    getById: getMatterById,
    create: createMatter,
    update: updateMatter,
    delete: deleteMatter,
    getReceipts: getMatterReceipts,
  },
  docketwise: {
    getStatus: getConnectionStatus,
  },
};
