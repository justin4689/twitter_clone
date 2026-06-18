import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// userId (string) → socketId
const userSocketMap = new Map();

export let io = null;

const parseCookies = (raw = "") =>
	raw.split(";").reduce((acc, pair) => {
		const [key, ...rest] = pair.trim().split("=");
		if (key) acc[key.trim()] = decodeURIComponent(rest.join("=").trim());
		return acc;
	}, {});

export const initSocket = (httpServer) => {
	io = new Server(httpServer, {
		cors: {
			origin: process.env.NODE_ENV === "development" ? "http://localhost:3000" : false,
			credentials: true,
		},
		connectionStateRecovery: { maxDisconnectionDuration: 30_000 },
	});

	// Auth middleware — vérifie le JWT depuis le cookie
	io.use(async (socket, next) => {
		try {
			const cookies = parseCookies(socket.handshake.headers.cookie);
			const token = cookies.jwt;
			if (!token) return next(new Error("Unauthorized"));

			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const user = await User.findById(decoded.userId).select("_id");
			if (!user) return next(new Error("User not found"));

			socket.userId = user._id.toString();
			next();
		} catch {
			next(new Error("Unauthorized"));
		}
	});

	io.on("connection", (socket) => {
		userSocketMap.set(socket.userId, socket.id);

		socket.on("disconnect", () => {
			userSocketMap.delete(socket.userId);
		});
	});

	return io;
};

// Envoie un event à un user précis s'il est connecté
export const emitToUser = (userId, event, data) => {
	const socketId = userSocketMap.get(userId.toString());
	if (socketId && io) {
		io.to(socketId).emit(event, data);
	}
};
