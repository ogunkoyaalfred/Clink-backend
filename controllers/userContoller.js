const { UserModel, ProfileModel, ConversationModel, MessageModel } = require("../models/userModel");
const { PostModel } = require("../models/userModel");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const welcomeEmail = require("../emails/welcomeEmail");

cloudinary.config({
  cloud_name: "dqnxh0l7u",
  api_key: "219423267979744",
  api_secret: "MVIH2kGN_c5jBsWqWJRxVk9pGQk",
});

const saveUsers = (req, res) => {
  let form = new UserModel(req.body);
  form
    .save()
    .then((data) => {
      res
        .status(201)
        .send({ stat: true, msg: "User saved successfully", data: data });
      console.log(data);

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_EMAIL, // generated ethereal user
          pass: process.env.SMTP_PASSWORD, // generated ethereal password
        },
      });

      // Wrap in an async IIFE so we can use await.
      (async () => {
        const info = await transporter.sendMail({
          from: '"CLINK" <ogunkoyaalfred@gmail.com>', // sender address
          to: `${req.body.email}`, // list of receivers
          subject: `Welcome to CLINK, ${req.body.username}`, // Subject linenow
          html: welcomeEmail(req.body.username), // HTML body
        });

        console.log("Message sent:", info.messageId);
      })();
    })
    .catch((err) => {
      res
        .status(400)
        .send({ stat: false, msg: "Error saving user", error: err });
    });
};

const authenticateUser = (req, res) => {
  const { email, password } = req.body;

  UserModel.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(404).json({
          stat: false,
          msg: "Invalid email or password",
        });
      }

      user.validatePassword(password, (err, same) => {
        if (err) {
          return res.status(500).json({ stat: false, msg: "Server error" });
        }

        if (!same) {
          return res.status(401).json({
            stat: false,
            msg: "Invalid email or password",
          });
        }

        const token = jwt.sign(
          { id: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.status(200).json({
          stat: true,
          msg: "Login successful",
          token,
          user: {
            id: user._id,
            email: user.email,
            username: user.username,
          },
        });
      });
    })
    .catch(() => {
      return res.status(500).json({
        stat: false,
        msg: "Server error, please try again later.",
      });
    });
};


const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email: email });

  if (!user) {
    return res.status(404).send({ stat: false, msg: "User not found" });
  }

  const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

  const resetLink = `http://localhost:5173/reset-password/${token}`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL, // generated ethereal user
      pass: process.env.SMTP_PASSWORD, // generated ethereal password
    },
  });

  (async () => {
    const info = await transporter.sendMail({
      from: `"CLINK" <${process.env.SMTP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "Password Reset Request", // Subject line
      html: `
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetLink}">Reset Password</a>
                <p>This link will expire in 15 minutes.</p>
            `, // HTML body
    });
    console.log("Password reset email sent:", info.messageId);
  })();

  res
    .status(200)
    .send({ stat: true, msg: "Password reset link sent to email" });
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);

    // Find user by email in token payload
    const user = await UserModel.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).send({
        msg: "User not found. Make sure the email matches your registered account.",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = password;
    await user.save();

    res.status(200).send({
      msg: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(400)
        .send({ msg: "Token has expired. Please request a new reset link." });
    }
    if (error.name === "JsonWebTokenError") {
      return res
        .status(400)
        .send({ msg: "Invalid token. Please request a new reset link." });
    }

    console.error("Reset password error:", error);
    return res
      .status(500)
      .send({ msg: "Server error. Please try again later." });
  }
};

const savePost = (req, res) => {
  let file = req.body.postImg;
  cloudinary.uploader.upload(file, { folder: "posts" }, (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ stat: false, msg: "Error uploading image", error: err });
    } else {
      let form = new PostModel({
        title: req.body.postDes,
        content: result.secure_url,
        userId: req.body.userId,
      });

      console.log(result.secure_url);

      form
        .save()
        .then((data) => {
          res
            .status(201)
            .send({ stat: true, msg: "Post saved successfully", data: data });
        })
        .catch((err) => {
          res
            .status(400)
            .send({ stat: false, msg: "Error saving post", error: err });
        });
    }
  });
};

const loadPost = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ stat: false, msg: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET);

    // fetch posts + populate user and comments
    const posts = await PostModel.find()
      .sort({ createdAt: -1 })
      .populate("userId", "username email") // basic user info
      .populate("comments.userId", "username");

    // for each post, attach the profile of the author
    const postsWithProfiles = await Promise.all(
      posts.map(async (post) => {
        const profile = await ProfileModel.findOne({
          profileUserId: post.userId._id,
        }).select("fullname bio profilePicture");

        return {
          ...post.toObject(),
          authorProfile: profile || null, // attach profile
        };
      })
    );

    res.status(200).send({
      stat: true,
      msg: "Posts fetched successfully",
      posts: postsWithProfiles,
    });
  } catch (err) {
    res.status(500).send({
      stat: false,
      msg: "Error fetching posts",
      error: err.message,
    });
  }
};

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    console.log(req.body);
    const userId = req.body.id;

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).send({ message: "Post not found" });
    }

    if (post.likes.includes(userId)) {
      // unlike
      post.likes.pull(userId);
    } else {
      // like
      post.likes.push(userId);
    }

    // update likeCount based on length
    post.likeCount = post.likes.length;

    await post.save();

    res.send(post);
  } catch (error) {
    res.status(500).send({ error, message: "Error occurred" });
  }
};

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, commentText } = req.body;

    if (!commentText || commentText.trim() === "") {
      return res
        .stat(400)
        .send({ stat: false, msg: "Comment cannot be empty" });
    }

    const post = await PostModel.findById(postId);
    if (!post) {
      return res.status(404).send({ stat: false, msg: "Post not found" });
    }

    const newComment = {
      userId,
      commentText,
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    const populatedPost = await PostModel.findById(postId)
      .populate("userId", "username") // populate post author with only `username`
      .populate("comments.userId", "username"); // populate comment authors

    res.status(201).send({
      stat: true,
      msg: "Comment added successfully",
      post: populatedPost,
    });
  } catch (error) {
    res.status(500).send({ stat: false, msg: "Error adding comment", error });
  }
};

// GET /posts/:postId/details
const getPostDetails = async (req, res) => {
  try {
    const { postId } = req.params;

    // 1️⃣ Populate post author, likes, and comment authors
    const post = await PostModel.findById(postId)
      .populate("userId", "username email")
      .populate("likes", "username")
      .populate("comments.userId", "username");

    if (!post) {
      return res.status(404).json({ stat: false, msg: "Post not found" });
    }

    // 2️⃣ Fetch all unique user IDs (author + likers + comment authors)
    const allUserIds = new Set(
      [
        post.userId?._id?.toString(),
        ...post.likes.map((u) => u._id.toString()),
        ...post.comments.map((c) => c.userId?._id?.toString()),
      ].filter(Boolean)
    );

    // 3️⃣ Fetch their profiles in one go
    const profiles = await ProfileModel.find({
      profileUserId: { $in: [...allUserIds] },
    }).select("profileUserId fullname bio profilePicture");

    // 4️⃣ Convert to a map for quick lookup
    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.profileUserId.toString()] = p;
    });

    // 5️⃣ Attach profiles to corresponding users
    const postObj = post.toObject();

    // Attach post author’s profile
    postObj.authorProfile = profileMap[post.userId._id.toString()] || null;

    // Attach comment authors’ profiles
    postObj.comments = postObj.comments.map((comment) => ({
      ...comment,
      userProfile: comment.userId
        ? profileMap[comment.userId._id.toString()] || null
        : null,
    }));

    // Optionally attach likers’ profiles too if you need them:
    postObj.likesWithProfiles = postObj.likes.map((user) => ({
      ...user,
      userProfile: profileMap[user._id.toString()] || null,
    }));

    res.status(200).json({ stat: true, post: postObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ stat: false, msg: "Error fetching post", error });
  }
};

const editProfile = async (req, res) => {
  try {
    const { userId, username, fullname, bio, profilePicture } = req.body;
    const profileUserId = userId;

    // optional: upload to Cloudinary if picture is base64
    let uploadedImg = null;
    let publicId = null;
    if (profilePicture) {
      const result = await cloudinary.uploader.upload(profilePicture, {
        folder: "profiles",
      });
      uploadedImg = result.secure_url;
      publicId = result.public_id;
    }

    // update profile in ProfileModel
    const profile = await ProfileModel.findOneAndUpdate(
      { profileUserId }, // find by username
      {
        public_id: publicId,
        fullname,
        bio,
        profilePicture: uploadedImg || profilePicture, // fallback
      },
      { new: true, upsert: true } // create if doesn't exist
    );

    res.status(200).send({
      stat: true,
      msg: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send({
      stat: false,
      msg: "Error updating profile",
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.params; // this will be the userId

    // find profile for that user
    const profile = await ProfileModel.findOne({ profileUserId: id });

    // find all posts created by this user
    const posts = await PostModel.find({ userId: id })
      .sort({ createdAt: -1 }) // newest first
      .populate("userId", "username");

    const postsWithProfiles = await Promise.all(
      posts.map(async (post) => {
        const profile = await ProfileModel.findOne({
          profileUserId: post.userId._id,
        }).select("fullname bio profilePicture");

        return {
          ...post.toObject(),
          authorProfile: profile || null, // attach profile
        };
      })
    );

    const user = await UserModel.findById(id).select("username"); // populate basic user info if needed

    res.status(200).send({
      stat: true,
      msg: "Profile fetched successfully",
      profile,
      posts: postsWithProfiles,
      user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).send({
      stat: false,
      msg: "Error fetching profile",
      error: error.message,
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!text.trim()) return res.status(400).json({ stat: false, msg: "Message is empty" });

    // find or create conversation
    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [senderId, receiverId],
        lastMessage: text,
        lastSender: senderId,
      });
    }

    // create message
    const message = await MessageModel.create({
      conversationId: conversation._id,
      sender: senderId,
      text,
    });

    // update conversation last message
    conversation.lastMessage = text;
    conversation.lastSender = senderId;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedMsg = await message.populate("sender", "username profilePicture");
    res.status(201).json({ stat: true, message: populatedMsg, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ stat: false, msg: "Error sending message", error: err.message });
  }
};

// Backend example
const createConversation = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    let conversation = await ConversationModel.findOne({
      participants: { $all: [senderId, receiverId] },
    }).populate("participants", "username profilePicture"); // populate participants

    if (!conversation) {
      conversation = await ConversationModel.create({
        participants: [senderId, receiverId],
        lastMessage: "",
        lastSender: senderId,
      });
      conversation = await conversation.populate("participants", "username profilePicture");
    }

    res.status(200).json({ stat: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ stat: false, msg: "Error creating conversation", error: err.message });
  }
};



const getConversations = async (req, res) => {
  try {
    const userId = req.params.userId;

    const conversations = await ConversationModel.find({
      participants: userId,
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "participants",
        select: "username profilePicture", // ensure profilePicture is included
      })
      .populate({
        path: "lastSender",
        select: "username profilePicture", // include profilePicture if needed
      });

    res.status(200).json({ stat: true, conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      stat: false,
      msg: "Error fetching conversations",
      error: err.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await MessageModel.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "username profilePicture");

    res.status(200).json({ stat: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ stat: false, msg: "Error fetching messages", error: err.message });
  }
};



module.exports = {
  saveUsers,
  authenticateUser,
  forgotPassword,
  resetPassword,
  savePost,
  loadPost,
  likePost,
  addComment,
  getPostDetails,
  editProfile,
  getProfile,
  sendMessage,
  createConversation,
  getConversations,
  getMessages,
};
