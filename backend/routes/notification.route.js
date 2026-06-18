import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	deleteNotifications,
	deleteOneNotification,
	getNotifications,
	getUnreadCount,
	markAllAsRead,
	markOneAsRead,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Routes spécifiques AVANT /:id pour éviter les conflits
router.get("/unread-count", protectRoute, getUnreadCount);
router.patch("/read-all", protectRoute, markAllAsRead);

router.get("/", protectRoute, getNotifications);
router.patch("/:id/read", protectRoute, markOneAsRead);
router.delete("/", protectRoute, deleteNotifications);
router.delete("/:id", protectRoute, deleteOneNotification);

export default router;
