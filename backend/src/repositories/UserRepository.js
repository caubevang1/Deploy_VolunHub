import BaseRepository from "./BaseRepository.js";
import User from "../models/user.js";

const UserRepository = new BaseRepository(User);

export default UserRepository;
