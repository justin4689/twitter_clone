import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { v2 as cloudinary } from "cloudinary";
import { emitToUser } from "../socket/socket.js";

export const createPost = async (req, res) => {
	const { text } = req.body;
	let { img } = req.body;
	const userId = req.user._id.toString();

	const user = await User.findById(userId);
	if (!user) return res.status(404).json({ message: "User not found" });

	if (!text && !img) {
		return res.status(400).json({ error: "Post must have text or image" });
	}

	if (img) {
		const uploadedResponse = await cloudinary.uploader.upload(img);
		img = uploadedResponse.secure_url;
	}

	const newPost = new Post({ user: userId, text, img });
	await newPost.save();
	res.status(201).json(newPost);
};

export const deletePost = async (req, res) => {
	const post = await Post.findById(req.params.id);
	if (!post) return res.status(404).json({ error: "Post not found" });

	if (post.user.toString() !== req.user._id.toString()) {
		return res.status(401).json({ error: "You are not authorized to delete this post" });
	}

	if (post.img) {
		const imgId = post.img.split("/").pop().split(".")[0];
		await cloudinary.uploader.destroy(imgId);
	}

	await Post.findByIdAndDelete(req.params.id);
	res.status(200).json({ message: "Post deleted successfully" });
};

export const commentOnPost = async (req, res) => {
	const { text } = req.body;
	const postId = req.params.id;
	const userId = req.user._id;

	if (!text) return res.status(400).json({ error: "Text field is required" });

	const post = await Post.findById(postId);
	if (!post) return res.status(404).json({ error: "Post not found" });

	post.comments.push({ user: userId, text });
	await post.save();
	res.status(200).json(post);
};

export const likeUnlikePost = async (req, res) => {
	const userId = req.user._id;
	const { id: postId } = req.params;

	const post = await Post.findById(postId);
	if (!post) return res.status(404).json({ error: "Post not found" });

	const userLikedPost = post.likes.includes(userId);

	if (userLikedPost) {
		await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
		await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
		const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
		res.status(200).json(updatedLikes);
	} else {
		post.likes.push(userId);
		await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
		await post.save();

		// N'envoie pas de notif si on like son propre post
		if (post.user.toString() !== userId.toString()) {
			const notification = new Notification({ from: userId, to: post.user, type: "like" });
			await notification.save();

			const populated = await notification.populate("from", "username profileImg");
			emitToUser(post.user, "newNotification", populated);
		}

		res.status(200).json(post.likes);
	}
};

export const getAllPosts = async (req, res) => {
	const posts = await Post.find()
		.sort({ createdAt: -1 })
		.populate({ path: "user", select: "-password" })
		.populate({ path: "comments.user", select: "-password" });

	res.status(200).json(posts);
};

export const getLikedPosts = async (req, res) => {
	const userId = req.params.id;

	const user = await User.findById(userId);
	if (!user) return res.status(404).json({ error: "User not found" });

	const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
		.populate({ path: "user", select: "-password" })
		.populate({ path: "comments.user", select: "-password" });

	res.status(200).json(likedPosts);
};

export const getFollowingPosts = async (req, res) => {
	const userId = req.user._id;
	const user = await User.findById(userId);
	if (!user) return res.status(404).json({ error: "User not found" });

	const feedPosts = await Post.find({ user: { $in: user.following } })
		.sort({ createdAt: -1 })
		.populate({ path: "user", select: "-password" })
		.populate({ path: "comments.user", select: "-password" });

	res.status(200).json(feedPosts);
};

export const getUserPosts = async (req, res) => {
	const { username } = req.params;

	const user = await User.findOne({ username });
	if (!user) return res.status(404).json({ error: "User not found" });

	const posts = await Post.find({ user: user._id })
		.sort({ createdAt: -1 })
		.populate({ path: "user", select: "-password" })
		.populate({ path: "comments.user", select: "-password" });

	res.status(200).json(posts);
};
