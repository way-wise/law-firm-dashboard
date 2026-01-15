import {
  createContact,
  deleteContact,
  getContactById,
  getContacts,
  updateContact,
} from "./contacts";
import {
  deleteCustomMatter,
  getCustomMatterById,
  getCustomMatters,
  updateCustomMatter,
} from "./customMatters";
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
  getSyncSettings,
  triggerManualSync,
  updateSyncSettings,
} from "./syncSettings";
import {
  createTeamMember,
  deleteTeamMember,
  getTeamMemberById,
  getTeamMembers,
  updateTeamMember,
} from "./team";
import {
  createTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  updateTodoStatus,
} from "./todos";
import { getNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications } from "./notifications";

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
  customMatters: {
    get: getCustomMatters,
    getById: getCustomMatterById,
    update: updateCustomMatter,
    delete: deleteCustomMatter,
  },
  team: {
    get: getTeamMembers,
    getById: getTeamMemberById,
    create: createTeamMember,
    update: updateTeamMember,
    delete: deleteTeamMember,
  },
  docketwise: {
    getStatus: getConnectionStatus,
  },
  sync: {
    getSettings: getSyncSettings,
    updateSettings: updateSyncSettings,
    trigger: triggerManualSync,
  },
  notifications: {
    list: getNotifications,
    markRead: markNotificationRead,
    markAllRead: markAllNotificationsRead,
    subscribe: subscribeToNotifications,
  },
};
