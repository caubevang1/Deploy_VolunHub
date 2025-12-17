import BaseRepository from "./BaseRepository.js";
import Event from "../models/event.js";

const EventRepository = new BaseRepository(Event);

export default EventRepository;
