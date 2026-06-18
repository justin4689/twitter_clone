import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, authenticated }) => {
	const [socket, setSocket] = useState(null);

	useEffect(() => {
		if (!authenticated) return;

		const s = io({
			withCredentials: true,        // envoie le cookie JWT automatiquement
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
		});

		s.on("connect_error", (err) => {
			console.warn("[Socket] connection error:", err.message);
		});

		setSocket(s);

		return () => {
			s.disconnect();
			setSocket(null);
		};
	}, [authenticated]);

	return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
