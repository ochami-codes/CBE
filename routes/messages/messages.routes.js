import express from "express";
import { MessageController } from "./messages.controller.js";

const router = express.Router();

router.post("/", MessageController.sendMessage);
router.get("/inbox",  MessageController.getInbox);
router.get("/conversation/:thread_id", MessageController.getConversation);
router.post("/read", MessageController.markThreadAsRead);
router.get("/users", MessageController.getMessageUsers);
router.get("/unread-count", MessageController.getUnreadCount);
router.get("/thread-with/user_id", MessageController.getThreadWithUser);

export default router;