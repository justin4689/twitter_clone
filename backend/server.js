import { fileURLToPath } from "url";
import { createServer } from "http";
import path from "path";
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import connectMongoDB from "./db/connectMongoDB.js";
import { initSocket } from "./socket/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // → .../backend

dotenv.config();

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

initSocket(httpServer);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

if (process.env.NODE_ENV === "production") {
	const frontendDist = path.join(__dirname, "..", "frontend", "dist");
	app.use(express.static(frontendDist));
	app.get(/(.*)/, (req, res) => {
		res.sendFile(path.join(frontendDist, "index.html"));
	});
}

// Global error handler — Express 5 catches async errors automatically
app.use((err, req, res, next) => {
	const statusCode = err.status || err.statusCode || 500;
	console.error(`[${req.method}] ${req.url} →`, err.message);
	res.status(statusCode).json({ error: err.message || "Internal Server Error" });
});

httpServer.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
	connectMongoDB();
});
