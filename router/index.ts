import {
  createContact,
  deleteContact,
  getContactById,
  getContacts,
  updateContact,
} from "./contacts";
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
  contacts: {
    get: getContacts,
    getById: getContactById,
    create: createContact,
    update: updateContact,
    delete: deleteContact,
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
