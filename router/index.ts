import {
  createContact,
  deleteContact,
  getContactById,
  getContactDocuments,
  getContacts,
  updateContact,
} from "./contacts";
import {
  createCustomMatter,
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
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "./notifications";
import {
  getMatterTypes,
  syncMatterTypes,
  updateMatterType,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./matterTypes";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "./notificationSettings";
import {
  getNotificationRecipients,
  getAvailableUsers,
  updateEmailRecipients,
  updateInAppRecipients,
  initializeRecipients,
} from "./notificationRecipients";
import {
  sendTestEmail,
  sendTestInApp,
} from "./testNotifications";

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
    getDocuments: getContactDocuments,
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
    create: createCustomMatter,
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
  },
  matterTypes: {
    get: getMatterTypes,
    sync: syncMatterTypes,
    update: updateMatterType,
  },
  categories: {
    get: getCategories,
    create: createCategory,
    update: updateCategory,
    delete: deleteCategory,
  },
  notificationSettings: {
    get: getNotificationSettings,
    update: updateNotificationSettings,
  },
  notificationRecipients: {
    get: getNotificationRecipients,
    getAvailableUsers: getAvailableUsers,
    updateEmail: updateEmailRecipients,
    updateInApp: updateInAppRecipients,
    initialize: initializeRecipients,
  },
  testNotifications: {
    sendEmail: sendTestEmail,
    sendInApp: sendTestInApp,
  },
};
