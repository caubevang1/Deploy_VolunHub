import { http } from "../utils/BaseUrl";

export const GetAllEventsStats = () => http.get(`/statistics/events`);

export const GetEventPosts = (eventId) => http.get(`/posts/event/${eventId}`);
