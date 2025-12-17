import BaseRepository from "./BaseRepository.js";
import Post from "../models/post.js";

const PostRepository = new BaseRepository(Post);

export default PostRepository;
