import BaseRepository from "./BaseRepository.js";
import Comment from "../models/comment.js";

const CommentRepository = new BaseRepository(Comment);

export default CommentRepository;
