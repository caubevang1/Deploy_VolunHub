import { http } from "../utils/BaseUrl";

//Auth
export const DangNhap = (userLogin) => http.post(`/auth/login`, userLogin);
export const DangKy = (formData) => {
  // FormData tự động set Content-Type: multipart/form-data
  return http.post(`/auth/register`, formData);
};
export const OTPDangKy = (email) =>
  http.post(`/auth/register/send-otp`, { email });
export const OTPResetPassword = (email) =>
  http.post(`/auth/otp/reset/send-otp`, { email });
export const ResetPassword = (data) => http.post(`/auth/otp/reset-password`, data);

//UserInfo
export const GetUserInfo = () => http.get(`/auth/me`);
export const UpdateUser = (formData) => {
  return http.put("/auth/me", formData); // hoặc http.put('/users/me', formData)
};

export const ChangePassword = (data) => http.put(`/auth/change-password`, data);
export const ChangeEmail = (data) => http.put(`/auth/change-email`, data);

//User Events
export const Registration = (eventId) => http.post(`/registrations/${eventId}`);
export const CancelRegistration = (eventId) =>
  http.delete(`/registrations/${eventId}`);
export const GetMyEvent = () => http.get(`/registrations/history/my`);
export const EventActions = (eventId, data) =>
  http.post(`/actions/${eventId}`, data);
export const CheckEventStatus = (eventId) =>
  http.get(`/actions/${eventId}/status`);

//Ranking
export const GetVolunteerRanking = () => http.get(`/users/ranking`);
export const GetEventManagerRanking = () => http.get(`/users/ranking/managers`);
