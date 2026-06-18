import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
	const notifications = await Notification.find({ to: req.user._id })
		.populate({ path: "from", select: "username profileImg" })
		.sort({ createdAt: -1 });

	res.status(200).json(notifications);
};

export const getUnreadCount = async (req, res) => {
	const count = await Notification.countDocuments({ to: req.user._id, read: false });
	res.status(200).json({ count });
};

export const markOneAsRead = async (req, res) => {
	const notification = await Notification.findOneAndUpdate(
		{ _id: req.params.id, to: req.user._id },
		{ read: true },
		{ new: true }
	);
	if (!notification) return res.status(404).json({ error: "Notification not found" });
	res.status(200).json(notification);
};

export const markAllAsRead = async (req, res) => {
	await Notification.updateMany({ to: req.user._id, read: false }, { read: true });
	res.status(200).json({ message: "All notifications marked as read" });
};

export const deleteOneNotification = async (req, res) => {
	const notification = await Notification.findOneAndDelete({
		_id: req.params.id,
		to: req.user._id,
	});
	if (!notification) return res.status(404).json({ error: "Notification not found" });
	res.status(200).json({ message: "Notification deleted" });
};

export const deleteNotifications = async (req, res) => {
	await Notification.deleteMany({ to: req.user._id });
	res.status(200).json({ message: "Notifications deleted successfully" });
};
