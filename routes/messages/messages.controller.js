// controllers/message.controller.js

import { MessageService } from "./messages.service.js";
import {
  getHandler,
  createHandler,
} from "../../utils/controller.js";

export const MessageController = {
  sendMessage: createHandler(async (req) => {
  const {
    thread_id,
    recipient_profile_id,
    content,
  } = req.body;

  if (thread_id) {
    return MessageService.replyToThread({
      senderId: req.user.id,
      churchId: req.user.active_church_id,
      threadId: thread_id,
      content,
    });
  }

  return MessageService.sendNewMessage({
    senderId: req.user.id,
    churchId: req.user.active_church_id,
    recipientProfileId: recipient_profile_id,
    content,
  });
}),

  getInbox: getHandler(async (req) => ({
    inbox: await MessageService.getInbox({
      profileId: req.user.id,
      churchId: req.user.active_church_id,
    }),
  })),

  getConversation: getHandler(async (req) => ({
    messages: await MessageService.getConversation({
      threadId: req.params.thread_id,
      profileId: req.user.id,
    }),
  })),

  markThreadAsRead: createHandler(async (req) =>
    MessageService.markThreadAsRead({
      threadId: req.body.thread_id,
      profileId: req.user.id,
    })
  ),

  getMessageUsers: getHandler(async (req) => ({
    groups: await MessageService.getMessageUsers({
      churchId: req.user.active_church_id,
      profileId: req.user.id,
    }),
  })),

  getUnreadCount: getHandler(async (req) =>
    MessageService.getUnreadCount({
      churchId: req.user.active_church_id,
      profileId: req.user.id,
    })
  ),

  getThreadWithUser: getHandler(async (req) =>
    MessageService.getThreadWithUser({
      profileId: req.user.id,
      otherProfileId: req.params.userId,
    })
  ),
};