import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatPostDate } from "../../utils/date";

import { IoSettingsOutline } from "react-icons/io5";
import { FaUser, FaCheck, FaTrash } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";

const NotificationPage = () => {
	const queryClient = useQueryClient();

	const { data: notifications, isLoading } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => {
			const res = await fetch("/api/notifications");
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Something went wrong");
			return data;
		},
	});

	// Marquer une notification comme lue
	const { mutate: markAsRead } = useMutation({
		mutationFn: async (id) => {
			const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: (updated) => {
			queryClient.setQueryData(["notifications"], (old = []) =>
				old.map((n) => (n._id === updated._id ? updated : n))
			);
			queryClient.setQueryData(["notificationsUnreadCount"], (old) => ({
				count: Math.max(0, (old?.count ?? 1) - 1),
			}));
		},
	});

	// Tout marquer comme lu
	const { mutate: markAllRead } = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: () => {
			queryClient.setQueryData(["notifications"], (old = []) =>
				old.map((n) => ({ ...n, read: true }))
			);
			queryClient.setQueryData(["notificationsUnreadCount"], { count: 0 });
			toast.success("All notifications marked as read");
		},
	});

	// Supprimer une notification
	const { mutate: deleteOne } = useMutation({
		mutationFn: async (id) => {
			const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return { id };
		},
		onMutate: (id) => {
			const notifs = queryClient.getQueryData(["notifications"]) ?? [];
			const target = notifs.find((n) => n._id === id);
			return { wasUnread: target && !target.read };
		},
		onSuccess: ({ id }, _, context) => {
			queryClient.setQueryData(["notifications"], (old = []) =>
				old.filter((n) => n._id !== id)
			);
			if (context.wasUnread) {
				queryClient.setQueryData(["notificationsUnreadCount"], (old) => ({
					count: Math.max(0, (old?.count ?? 1) - 1),
				}));
			}
		},
		onError: (error) => toast.error(error.message),
	});

	// Supprimer toutes les notifications
	const { mutate: deleteAll } = useMutation({
		mutationFn: async () => {
			const res = await fetch("/api/notifications", { method: "DELETE" });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			return data;
		},
		onSuccess: () => {
			toast.success("All notifications deleted");
			queryClient.setQueryData(["notifications"], []);
			queryClient.setQueryData(["notificationsUnreadCount"], { count: 0 });
		},
		onError: (error) => toast.error(error.message),
	});

	const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

	return (
		<div className='flex-[4_4_0] border-l border-r border-gray-700 min-h-screen'>
			{/* Header */}
			<div className='flex justify-between items-center p-4 border-b border-gray-700'>
				<div className='flex items-center gap-2'>
					<p className='font-bold'>Notifications</p>
					{unreadCount > 0 && (
						<span className='bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5'>
							{unreadCount} new
						</span>
					)}
				</div>
				<div className='dropdown dropdown-end'>
					<div tabIndex={0} role='button' className='m-1 btn btn-ghost btn-sm btn-circle'>
						<IoSettingsOutline className='w-4' />
					</div>
					<ul
						tabIndex={0}
						className='dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52'
					>
						{unreadCount > 0 && (
							<li>
								<a onClick={() => markAllRead()}>
									<FaCheck className='w-3 h-3' /> Mark all as read
								</a>
							</li>
						)}
						<li>
							<a onClick={() => deleteAll()} className='text-error'>
								<FaTrash className='w-3 h-3' /> Delete all
							</a>
						</li>
					</ul>
				</div>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className='flex justify-center h-full items-center py-10'>
					<LoadingSpinner size='lg' />
				</div>
			)}

			{/* Empty state */}
			{!isLoading && notifications?.length === 0 && (
				<div className='text-center p-8 text-slate-500'>
					<IoSettingsOutline className='w-10 h-10 mx-auto mb-2 opacity-30' />
					<p className='font-bold'>No notifications yet</p>
					<p className='text-sm'>When someone likes or follows you, you'll see it here.</p>
				</div>
			)}

			{/* Liste */}
			{notifications?.map((notification) => (
				<div
					key={notification._id}
					className={`flex items-center justify-between gap-3 p-4 border-b border-gray-700 transition-colors
						${!notification.read ? "bg-gray-900 hover:bg-gray-800" : "hover:bg-[#0f0f0f]"}`}
				>
					{/* Icône type */}
					<div className='shrink-0'>
						{notification.type === "follow" && <FaUser className='w-5 h-5 text-primary' />}
						{notification.type === "like" && <FaHeart className='w-5 h-5 text-red-500' />}
					</div>

					{/* Contenu */}
					<Link
						to={`/profile/${notification.from.username}`}
						className='flex items-center gap-3 flex-1 min-w-0'
						onClick={() => !notification.read && markAsRead(notification._id)}
					>
						<div className='avatar shrink-0'>
							<div className='w-9 rounded-full'>
								<img
									src={notification.from.profileImg || "/avatar-placeholder.png"}
									alt={notification.from.username}
								/>
							</div>
						</div>
						<div className='min-w-0'>
							<span className='font-bold'>@{notification.from.username}</span>{" "}
							<span className='text-slate-300'>
								{notification.type === "follow" ? "followed you" : "liked your post"}
							</span>
							<p className='text-xs text-slate-500 mt-0.5'>
								{formatPostDate(notification.createdAt)}
							</p>
						</div>
					</Link>

					{/* Actions */}
					<div className='flex items-center gap-1 shrink-0'>
						{!notification.read && (
							<>
								<div className='w-2 h-2 bg-primary rounded-full' />
								<button
									className='btn btn-ghost btn-xs text-primary tooltip tooltip-left'
									data-tip='Mark as read'
									onClick={() => markAsRead(notification._id)}
								>
									<FaCheck className='w-3 h-3' />
								</button>
							</>
						)}
						<button
							className='btn btn-ghost btn-xs text-error tooltip tooltip-left'
							data-tip='Delete'
							onClick={() => deleteOne(notification._id)}
						>
							<FaTrash className='w-3 h-3' />
						</button>
					</div>
				</div>
			))}
		</div>
	);
};
export default NotificationPage;
