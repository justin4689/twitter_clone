import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../context/SocketContext";

const useNotifications = () => {
	const socket = useSocket();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!socket) return;

		const handleNewNotification = (notification) => {
			// Ajoute en tête de liste si le cache existe déjà
			queryClient.setQueryData(["notifications"], (old) =>
				old ? [notification, ...old] : [notification]
			);
			// Incrémente le badge "non lu"
			queryClient.setQueryData(["notificationsUnreadCount"], (old) => ({
				count: (old?.count ?? 0) + 1,
			}));
		};

		socket.on("newNotification", handleNewNotification);
		return () => socket.off("newNotification", handleNewNotification);
	}, [socket, queryClient]);
};

export default useNotifications;
