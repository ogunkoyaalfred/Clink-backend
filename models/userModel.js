const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const postScema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount: { type: Number, default: 0 },
  comments:[
    {
      userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      commentText: {type: String, required: true},
      createdAt: {type: Date, default: Date.now}
    }
  ]
})

const profileSchema = new mongoose.Schema({
  profileUserId: {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  public_id: {type: String, required: true},
  fullname: { type: String },
  bio: {type: String},
  profilePicture: {type: String},
})

let saltRound = 10
userSchema.pre("save", function(next){
  bcrypt.hash(this.password, saltRound, (err, hashedPassword) => {
    if (err) {
      console.log(err, "Unable to hash Password");
    } else {
      this.password = hashedPassword;
      next()
    }
  });
});

userSchema.methods.validatePassword = function(password, callback, next){
    console.log(password, this.password);
    bcrypt.compare(password, this.password, (err,same) => {
      if(!err){
        console.log(same)
        callback(err,same)
      } else {
        next()
      }
    })
    
}

const UserModel = mongoose.model("User", userSchema);
const PostModel = mongoose.model("Post", postScema);
const ProfileModel = mongoose.model("Profile", profileSchema)

module.exports = { UserModel, PostModel, ProfileModel };