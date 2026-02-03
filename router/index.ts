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
  getMatterDetailByDocketwiseId,
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
import { syncMattersRoute } from "./mattersSync";
import {
  getTeamMembers,
  getTeamMembersList,
  getTeamMemberById,
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
import {
  getDashboardStats,
  getAssigneeStats,
  getRecentMatters,
  getMatterStatusDistribution,
  getMatterTypeDistribution,
  getMatterDistribution,
  getMonthlyTrends,
  getStatusDistribution,
  getMatterStatusesByType,
} from "./dashboard";
import { generateReport } from "./reports";
import { sendMatterNotification } from "./sendMatterNotification";
import { unifiedSync, getSyncStatus } from "./unifiedSync";
import {
  getStatusGroups,
  getActiveStatusGroups,
  getStatusGroupById,
  createStatusGroup,
  updateStatusGroup,
  deleteStatusGroup,
} from "./statusGroups";
import { getMatterStatuses } from "./matterStatuses";

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
    getDetailByDocketwiseId: getMatterDetailByDocketwiseId,
    create: createCustomMatter,
    update: updateCustomMatter,
    delete: deleteCustomMatter,
    sendNotification: sendMatterNotification,
  },
  docketwise: {
    getStatus: getConnectionStatus,
  },
  sync: {
    getSettings: getSyncSettings,
    updateSettings: updateSyncSettings,
    trigger: triggerManualSync,
    syncMatters: syncMattersRoute,
    unified: unifiedSync,
    getStatus: getSyncStatus,
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
  dashboard: {
    getStats: getDashboardStats,
    getAssigneeStats: getAssigneeStats,
    getRecentMatters: getRecentMatters,
    getStatusDistribution: getMatterStatusDistribution,
    getTypeDistribution: getMatterTypeDistribution,
    getDistribution: getMatterDistribution,
    getMonthlyTrends: getMonthlyTrends,
    getStatusByCategory: getStatusDistribution,
    getMatterStatusesByType: getMatterStatusesByType,
  },
  reports: {
    generate: generateReport,
  },
  team: {
    get: getTeamMembers,
    getList: getTeamMembersList,
    getById: getTeamMemberById,
  },
  statusGroups: {
    get: getStatusGroups,
    getActive: getActiveStatusGroups,
    getById: getStatusGroupById,
    create: createStatusGroup,
    update: updateStatusGroup,
    delete: deleteStatusGroup,
  },
  matterStatuses: {
    get: getMatterStatuses,
  },
};
