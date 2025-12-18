import { http } from "../utils/BaseUrl";

export const GetManagerEvents = () => http.get(`/events/my-events`);

// CẬP NHẬT: Thêm header multipart/form-data để đảm bảo truyền file chính xác
export const CreatEvents = (data) => http.post(`/events`, data, {
    headers: { "Content-Type": "multipart/form-data" }
});

export const UpdateEvents = (eventId, data) => http.put(`/events/${eventId}`, data, {
    headers: { "Content-Type": "multipart/form-data" }
});

export const DeleteEvents = (eventId) => http.delete(`/events/${eventId}`);
export const CompleteEvents = (eventId) => http.put(`/events/${eventId}/complete`);
export const GetApprovedParticipants = (eventId) => http.get(`/events/public/${eventId}/participants`);
export const GetParticipants = (eventId) => http.get(`/registrations/${eventId}/participants`);
export const UpdateParticipantStatus = (registrationId, status) => http.put(`/registrations/${registrationId}/status`, { status });
export const MarkCompletedParticipants = (registrationId, data) => http.put(`/registrations/${registrationId}/complete`, data);
export const GetEventDetail = (eventId) => http.get(`/events/management/${eventId}`);