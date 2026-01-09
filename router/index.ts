import { createTodo, deleteTodo, getTodos, updateTodo, updateTodoStatus } from "./todos";
import { 
  getMatters, 
  getMatterById, 
  createMatter, 
  updateMatter, 
  deleteMatter,
  getMatterReceipts 
} from "./matters";

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
};
