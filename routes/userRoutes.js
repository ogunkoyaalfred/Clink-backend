const express = require("express");
const { saveUsers, authenticateUser, forgotPassword, resetPassword, savePost, loadPost, likePost, addComment, getPostDetails, editProfile, getProfile } = require("../controllers/userContoller");


const router = express.Router();

router.post("/saveuser", saveUsers);
router.post('/authuser', authenticateUser)
router.post("/forgot-password" , forgotPassword)
router.post("/reset-password/:token", resetPassword)
router.post("/savepost", savePost)
router.get("/posts", loadPost)
router.patch("/likepost/:postId", likePost)
router.post("/addcomment/:postId", addComment)
router.get("/post-details/:postId", getPostDetails)
router.post("/edit-profile", editProfile)
router.get("/get-profile/:id", getProfile)

module.exports = router

