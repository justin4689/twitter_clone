import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

dotenv.config();

const USERS = [
	{ fullName: "Alice Martin",   username: "alice",   email: "alice@demo.com",   bio: "Frontend dev 🎨", link: "https://github.com" },
	{ fullName: "Bob Dupont",     username: "bob",     email: "bob@demo.com",     bio: "Backend engineer ⚙️" },
	{ fullName: "Clara Nguyen",   username: "clara",   email: "clara@demo.com",   bio: "Designer & coffee lover ☕" },
	{ fullName: "David Kowalski", username: "david",   email: "david@demo.com",   bio: "DevOps enthusiast 🐳" },
	{ fullName: "Emma Leroy",     username: "emma",    email: "emma@demo.com",    bio: "Open source contributor 🌍" },
];

const POSTS_CONTENT = [
	{ user: "alice",  text: "Just shipped a new feature using React 19 🚀 Loving the new concurrent features!" },
	{ user: "bob",    text: "Express 5 is finally out. Async error handling is so much cleaner now 🙌" },
	{ user: "clara",  text: "Working on a new design system. Tailwind CSS makes everything faster ✨" },
	{ user: "alice",  text: "Hot take: TypeScript should be the default for all new projects. No exceptions." },
	{ user: "david",  text: "Docker compose down && docker compose up —build. My daily morning ritual ☕" },
	{ user: "emma",   text: "Just opened my 100th PR this year. Open source is life 🌍" },
	{ user: "bob",    text: "MongoDB aggregation pipelines are underrated. They can do so much more than people think." },
	{ user: "clara",  text: "Design tip: whitespace is not empty space. It's breathing room for your UI 🤍" },
	{ user: "david",  text: "Finally migrated our CI/CD to GitHub Actions. Never going back." },
	{ user: "emma",   text: "If your README doesn't have a quick-start in under 5 steps, you're losing contributors." },
];

const seed = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("✅ Connected to MongoDB");

		// Nettoyage
		await Promise.all([
			User.deleteMany({}),
			Post.deleteMany({}),
			Notification.deleteMany({}),
		]);
		console.log("🗑  Collections cleared");

		// Création des users
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash("password123", salt);

		const createdUsers = await User.insertMany(
			USERS.map((u) => ({ ...u, password: hashedPassword }))
		);
		console.log(`👤 ${createdUsers.length} users created`);

		// Index userId par username pour la résolution rapide
		const userMap = Object.fromEntries(createdUsers.map((u) => [u.username, u]));

		// Création des posts
		const postsToInsert = POSTS_CONTENT.map(({ user, text }) => ({
			user: userMap[user]._id,
			text,
		}));
		const createdPosts = await Post.insertMany(postsToInsert);
		console.log(`📝 ${createdPosts.length} posts created`);

		// Relations follow : alice ↔ bob, alice → clara, bob → emma, david → alice, emma → clara
		const follows = [
			["alice", "bob"], ["bob", "alice"],
			["alice", "clara"],
			["bob", "emma"],
			["david", "alice"],
			["emma", "clara"],
			["clara", "david"],
		];

		for (const [followerName, followeeName] of follows) {
			const follower = userMap[followerName];
			const followee = userMap[followeeName];
			await User.findByIdAndUpdate(follower._id, { $addToSet: { following: followee._id } });
			await User.findByIdAndUpdate(followee._id, { $addToSet: { followers: follower._id } });
		}
		console.log(`🔗 ${follows.length} follow relations created`);

		// Likes : bob like posts d'alice, clara like posts de bob
		const likes = [
			{ liker: "bob",   postIndex: 0 },
			{ liker: "bob",   postIndex: 3 },
			{ liker: "clara", postIndex: 1 },
			{ liker: "alice", postIndex: 7 },
			{ liker: "david", postIndex: 4 },
			{ liker: "emma",  postIndex: 0 },
		];

		for (const { liker, postIndex } of likes) {
			const likerUser = userMap[liker];
			const post = createdPosts[postIndex];
			if (post.user.toString() === likerUser._id.toString()) continue; // skip self-like
			await Post.findByIdAndUpdate(post._id, { $addToSet: { likes: likerUser._id } });
			await User.findByIdAndUpdate(likerUser._id, { $addToSet: { likedPosts: post._id } });
		}
		console.log(`❤️  ${likes.length} likes applied`);

		// Notifications de demo (follow + like)
		const notifications = [
			{ from: userMap["bob"]._id,   to: userMap["alice"]._id, type: "follow", read: false },
			{ from: userMap["david"]._id, to: userMap["alice"]._id, type: "follow", read: true  },
			{ from: userMap["emma"]._id,  to: userMap["alice"]._id, type: "like",   read: false },
			{ from: userMap["clara"]._id, to: userMap["bob"]._id,   type: "like",   read: false },
			{ from: userMap["alice"]._id, to: userMap["clara"]._id, type: "follow", read: true  },
		];
		await Notification.insertMany(notifications);
		console.log(`🔔 ${notifications.length} notifications created`);

		console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("🌱 Seed completed successfully!");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log("Demo accounts (password: password123)");
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		USERS.forEach((u) => console.log(`  ${u.username.padEnd(10)} → ${u.email}`));
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

		process.exit(0);
	} catch (error) {
		console.error("❌ Seed failed:", error.message);
		process.exit(1);
	}
};

seed();
