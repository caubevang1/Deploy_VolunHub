import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    event: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    likes: [ 
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { 
    timestamps: true,
    // Cấu hình để tự động map _id -> id khi trả về dữ liệu
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
    toObject: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      },
    },
  }
);

// Tạo virtual field 'id' ánh xạ từ '_id'
commentSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;