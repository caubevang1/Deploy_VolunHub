import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GetEventDetail, GetEventActionStats } from "../services/EventService";
import {
  Calendar,
  Users,
  MapPin,
  Tag,
  Phone,
  MessageSquare,
  Heart,
  Share2,
  Eye,
  ArrowLeft,
  X,
  CheckCircle,
} from "lucide-react";
import {
  Registration,
  CancelRegistration,
  GetMyEvent,
  CheckEventStatus,
  EventActions,
  GetUserInfo,
} from "../services/UserService";
import Swal from "sweetalert2";

const categoryMapping = {
  Community: "Cộng đồng",
  Education: "Giáo dục",
  Healthcare: "Sức khỏe",
  Environment: "Môi trường",
  EventSupport: "Sự kiện",
  Technical: "Kỹ thuật",
  Emergency: "Cứu trợ khẩn cấp",
  Online: "Trực tuyến",
  Corporate: "Doanh nghiệp",
};

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [stats, setStats] = useState({
    likesCount: 0,
    sharesCount: 0,
    viewsCount: 0,
  });
  const [isLiked, setIsLiked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isProcessingLike, setIsProcessingLike] = useState(false);
  const [isProcessingShare, setIsProcessingShare] = useState(false);
  const likeTimeout = useRef(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await GetUserInfo();
        if (res.status === 200) setCurrentUser(res.data);
      } catch (err) {
        console.error("Lỗi lấy thông tin user:", err);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await GetEventDetail(eventId);
        if (res.status === 200 && res.data) {
          setEvent(res.data);

          const [statsRes, likeRes] = await Promise.allSettled([
            GetEventActionStats(eventId),
            CheckEventStatus(eventId),
          ]);

          if (
            statsRes.status === "fulfilled" &&
            statsRes.value.status === 200
          ) {
            setStats(statsRes.value.data);
          }
          if (likeRes.status === "fulfilled" && likeRes.value.status === 200) {
            setIsLiked(likeRes.value.data.hasLiked);
          }

          await EventActions(eventId, { type: "VIEW" });
        }
      } catch (err) {
        console.error("Lỗi khi tải chi tiết sự kiện:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  useEffect(() => {
    async function checkRegistrationStatus() {
      if (!event || !event.id) return;
      try {
        const res = await GetMyEvent();
        if (res.status === 200 && Array.isArray(res.data)) {
          const eventData = res.data.find(
            (item) => String(item.event?.id || item.event) === String(eventId)
          );
          if (eventData) {
            setRegistrationStatus(eventData.status);
          } else {
            setRegistrationStatus("");
          }
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trạng thái đăng ký:", err);
      }
    }
    checkRegistrationStatus();
  }, [eventId, event]);

  const handleRegister = async () => {
    if (registrationStatus) {
      Swal.fire({
        icon: "warning",
        title: "Thông báo",
        text: "Bạn không thể đăng ký lại vào lúc này.",
      });
      return;
    }
    try {
      const res = await Registration(eventId);
      if (res.status === 201) {
        setRegistrationStatus("pending");
        Swal.fire({
          icon: "success",
          title: "Đăng ký thành công",
          text: "Đang chờ duyệt.",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Thất bại",
        text: err.response?.data?.message || "Lỗi server.",
      });
    }
  };

  const handleCancelRegistration = async () => {
    const result = await Swal.fire({
      title: "Xác nhận hủy đăng ký?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy đăng ký",
      confirmButtonColor: "#DDB958",
    });

    if (result.isConfirmed) {
      try {
        const res = await CancelRegistration(eventId);
        if (res.status === 200) {
          setRegistrationStatus("");
          Swal.fire({ icon: "success", title: "Hủy thành công" });
        }
      } catch (err) {
        // FIX LỖI ESLINT: Sử dụng err để log
        console.error("Lỗi hủy đăng ký:", err);
        Swal.fire({
          icon: "error",
          title: "Thất bại",
          text: "Không thể hủy đăng ký.",
        });
      }
    }
  };

  const handleLike = async () => {
    const nextLikedState = !isLiked;

    // 1. Optimistic update
    setIsLiked(nextLikedState);
    setStats((p) => ({
      ...p,
      likesCount: Math.max(0, p.likesCount + (nextLikedState ? 1 : -1)),
    }));

    // 2. Debounce API call
    if (likeTimeout.current) {
      clearTimeout(likeTimeout.current);
    }

    likeTimeout.current = setTimeout(async () => {
      try {
        const res = await EventActions(eventId, {
          type: "LIKE",
          value: nextLikedState,
        });
        if (res.status === 200) {
          setIsLiked(res.data.liked);
          setStats((p) => ({ ...p, likesCount: res.data.likesCount }));
        }
      } catch (error) {
        console.error("Lỗi Like:", error);
      } finally {
        likeTimeout.current = null;
      }
    }, 500);
  };

  const handleShare = async () => {
    if (isProcessingShare) return;
    setIsProcessingShare(true);
    try {
      const res = await EventActions(eventId, { type: "SHARE" });
      if (res.status === 200) {
        const shareLink =
          res.data?.shareLink ||
          res.data?.link ||
          `${window.location.origin}/su-kien/${eventId}`;
        await navigator.clipboard.writeText(shareLink);
        Swal.fire({
          icon: "success",
          title: "Đã sao chép liên kết!",
          timer: 1500,
          showConfirmButton: false,
        });
        setStats((p) => ({ ...p, sharesCount: res.data.sharesCount }));
      }
    } catch (error) {
      console.error("Lỗi khi chia sẻ:", error);
    } finally {
      setIsProcessingShare(false);
    }
  };

  const renderDescription = (description, galleryImages) => {
    if (!description) return "";
    let html = description;
    if (Array.isArray(galleryImages)) {
      galleryImages.forEach((img, index) => {
        const realUrl = `http://localhost:5000${img}`;
        const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
        const imgTag = `<div style="text-align: center; margin: 20px 0;"><img src="${realUrl}" style="max-width:100%; height:auto; border-radius:8px;" /></div>`;
        html = html.replaceAll(placeholder, imgTag);
      });
    }
    return html;
  };

  if (loading)
    return <div className="text-center py-20 animate-pulse">Đang tải...</div>;
  if (!event)
    return (
      <div className="text-center mt-20 text-red-500">
        Không tìm thấy sự kiện!
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto mt-6 px-4 mb-10">
      <div className="flex-1 bg-white shadow-lg rounded-2xl overflow-hidden text-[#111827]">
        <h1 className="text-2xl md:text-4xl font-bold px-6 pt-8">
          {event.name}
        </h1>
        <div className="px-6 py-6">
          <img
            src={
              event.coverImage
                ? `http://localhost:5000${event.coverImage}`
                : "/default-event.png"
            }
            className="w-full max-h-[500px] object-cover rounded-xl"
            alt={event.name}
          />
        </div>

        <div className="px-6 md:px-12 py-6 text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-500" size={20} />{" "}
              <span>
                <strong>Ngày tổ chức:</strong>{" "}
                {new Date(event.date).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="text-orange-500" size={20} />{" "}
              <span>
                <strong>Loại:</strong>{" "}
                {categoryMapping[event.category] || event.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="text-red-500" size={20} />{" "}
              <span>
                <strong>Địa điểm:</strong> {event.location}
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-500" size={20} />{" "}
              <span>
                <strong>Ngày kết thúc:</strong>{" "}
                {new Date(event.endDate).toLocaleDateString("vi-VN")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="text-green-500" size={20} />{" "}
              <span>
                <strong>Tham gia:</strong> {event.currentParticipants || 0}/
                {event.maxParticipants}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-purple-500 mt-1" size={20} />{" "}
              <span>
                <strong>Liên hệ:</strong> {event.createdBy?.phone || "N/A"} (
                {event.createdBy?.name || "Người quản lý"})
              </span>
            </div>
          </div>
        </div>

        {registrationStatus && (
          <div className="px-6 pb-6 text-center">
            <div
              className={`inline-block px-6 py-2 rounded-full font-bold text-sm shadow-sm
              ${
                registrationStatus === "pending" ? "bg-gray-500 text-white" : ""
              }
              ${
                registrationStatus === "approved"
                  ? "bg-green-50 text-green-600"
                  : ""
              }
              ${
                registrationStatus === "completed"
                  ? "bg-blue-50 text-blue-600"
                  : ""
              }
              ${
                registrationStatus === "rejected"
                  ? "bg-red-50 text-red-600"
                  : ""
              }`}
            >
              {registrationStatus === "pending" && "Đang chờ duyệt"}
              {registrationStatus === "approved" && "Đăng ký thành công"}
              {registrationStatus === "completed" &&
                "Bạn đã hoàn thành sự kiện này"}
              {registrationStatus === "rejected" &&
                "Yêu cầu tham gia bị từ chối"}
            </div>
          </div>
        )}

        <div className="px-6 md:px-12 pb-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6">Mô tả chi tiết</h2>
          <div
            className="prose prose-blue max-w-none text-gray-800"
            dangerouslySetInnerHTML={{
              __html: renderDescription(event.description, event.galleryImages),
            }}
          />
        </div>
      </div>

      <div className="w-full lg:w-80 space-y-4">
        <div className="bg-white shadow-lg rounded-2xl p-6 sticky top-24 border border-gray-100">
          <h3 className="text-xl font-bold mb-6">Thao tác</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              <ArrowLeft size={20} /> <span>Trở về</span>
            </button>
            <button
              onClick={handleLike}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 font-medium"
            >
              <Heart size={20} className={isLiked ? "fill-red-600" : ""} />{" "}
              <span>Yêu thích</span>
            </button>
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 font-medium"
            >
              <Share2 size={20} /> <span>Chia sẻ</span>
            </button>

            {(registrationStatus === "approved" ||
              currentUser?.role === "ADMIN" ||
              String(event.createdBy?.id || event.createdBy) ===
                String(currentUser?.id)) &&
              event.status === "approved" && (
                <button
                  onClick={() => navigate(`/su-kien/${eventId}/trao-doi`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
                >
                  <MessageSquare size={20} /> <span>Kênh thảo luận</span>
                </button>
              )}

            {!registrationStatus && (
              <button
                onClick={handleRegister}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#DDB958] text-[#DDB958] rounded-lg font-medium"
              >
                <CheckCircle size={20} /> <span>Đăng ký tham gia</span>
              </button>
            )}

            {(registrationStatus === "pending" ||
              registrationStatus === "approved") && (
              <button
                onClick={handleCancelRegistration}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-500 text-gray-600 rounded-lg font-medium"
              >
                <X size={20} /> <span>Hủy đăng ký</span>
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t space-y-4">
            <h3 className="text-lg font-bold mb-2">Thống kê</h3>
            <div className="flex items-center gap-3">
              <Heart size={18} className="text-red-500" />{" "}
              <span>
                <strong>Yêu thích:</strong> {stats.likesCount}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Share2 size={18} className="text-green-500" />{" "}
              <span>
                <strong>Chia sẻ:</strong> {stats.sharesCount}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-blue-500" />{" "}
              <span>
                <strong>Lượt xem:</strong> {stats.viewsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
