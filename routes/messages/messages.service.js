import { replyToThread, sendNewMessage } from "./services/sendMessage.js"
import { getInbox } from "./services/getInbox.js";
import { getConversation } from "./services/getConversation.js";
import { markThreadAsRead } from "./services/markThread.js";
import { getMessageUsers } from "./services/getMessageUsers.js";
import { getUnreadCount } from "./services/getUnreadCount.js";
import { getThreadWithUser } from "./services/getThreadWithUser.js";

export const MessageService = {
sendNewMessage,
replyToThread,
getInbox,
getConversation,
markThreadAsRead,
getMessageUsers,
getUnreadCount,
getThreadWithUser,
};