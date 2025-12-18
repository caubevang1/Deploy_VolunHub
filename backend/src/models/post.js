import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
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
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { 
    timestamps: true,
    // Cấu hình chốt chặn cuối cùng để dữ liệu luôn trả về 'id' thay vì '_id'
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

// Tạo virtual field 'id' ánh xạ từ '_id' để đồng bộ với logic "Data Independence"
postSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const Post = mongoose.model("Post", postSchema);
export default Post;