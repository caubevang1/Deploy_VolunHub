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
  const [isProcessingShare, setIsProcessingShare] = useState(false);
  const likeTimeout = useRef(null);

  useEffect(() => {
    async function loadEventData() {
      setLoading(true);
      try {
        // Parallel fetch all data
        const [eventRes, userRes, myEventsRes] = await Promise.allSettled([
          GetEventDetail(eventId),
          GetUserInfo(),
          GetMyEvent(),
        ]);

        // Handle event detail
        if (eventRes.status === "fulfilled" && eventRes.value?.data) {
          setEvent(eventRes.value.data);

          // Fetch stats and like status in parallel
          const [statsRes, likeRes] = await Promise.allSettled([
            GetEventActionStats(eventId),
            CheckEventStatus(eventId),
          ]);

          if (
            statsRes.status === "fulfilled" &&
            statsRes.value?.status === 200
          ) {
            setStats(statsRes.value.data);
          }
          if (likeRes.status === "fulfilled" && likeRes.value?.status === 200) {
            setIsLiked(likeRes.value.data.hasLiked);
          }

          // Track view (fire and forget)
          EventActions(eventId, { type: "VIEW" }).catch(console.error);
        }

        // Handle user info
        if (userRes.status === "fulfilled" && userRes.value?.data) {
          setCurrentUser(userRes.value.data);
        }

        // Handle registration status
        if (
          myEventsRes.status === "fulfilled" &&
          Array.isArray(myEventsRes.value?.data)
        ) {
          const eventData = myEventsRes.value.data.find(
            (item) => String(item.event?.id || item.event) === String(eventId)
          );
          setRegistrationStatus(eventData?.status || "");
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    }
    loadEventData();
  }, [eventId]);

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
    if (!description || !Array.isArray(galleryImages)) return description;

    let html = description;

    galleryImages.forEach((img, index) => {
      const realUrl = `http://localhost:5000${img}`;
      const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;

      // Ảnh căn giữa
      const imgTag = `
            <div style="
                text-align: center; 
                margin: 20px 0;
            ">
                <img 
                    src="${realUrl}" 
                    style="
                        max-width: 100%; 
                        height: auto; 
                        border-radius: 8px;
                    "
                />
            </div>
        `;

      html = html.replaceAll(placeholder, imgTag);
    });

    return html;
  };

  if (loading) return <p className="text-center mt-10 text-lg">Đang tải...</p>;
  if (!event)
    return (
      <p className="text-center mt-10 text-lg text-red-500">
        Không tìm thấy sự kiện!
      </p>
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto mt-6 lg:mt-10 my-4 px-4">
      {/* Phần nội dung chính */}
      <div className="flex-1 bg-white shadow-lg rounded-2xl overflow-hidden text-[#111827]">
        {/* Tiêu đề */}
        <h1 className="text-2xl md:text-4xl font-bold px-4 md:px-6 !pt-6 md:!pt-8">
          {event.name}
        </h1>

        {/* Ảnh */}
        <img
          src={
            event.coverImage
              ? `http://localhost:5000${event.coverImage}`
              : "/default-event.png"
          }
          alt={event.name}
          className="w-full max-h-[300px] md:max-h-[500px] object-cover px-4 md:px-6 py-4 md:py-8"
        />

        {/* Thông tin chi tiết */}
        <div className="px-4 md:px-12 py-4 md:py-8 text-gray-700 flex flex-col sm:flex-row gap-6 md:gap-10">
          <div className="flex flex-col gap-4 md:gap-6 flex-1">
            <div className="flex items-center gap-3">
              <Calendar size={20} />
              <span>
                <strong>Ngày tổ chức:</strong> {formatDate(event.date)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Tag size={20} />
              <span>
                <strong>Loại sự kiện:</strong>{" "}
                {categoryMapping[event.category] || event.category || "Khác"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={20} />
              <span>
                <strong>Địa điểm:</strong> {event.location}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:gap-6 flex-1">
            <div className="flex items-center gap-3">
              <Calendar size={20} />
              <span>
                <strong>Ngày kết thúc:</strong> {formatDate(event.endDate)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Users size={20} />
              <span>
                <strong>Số người tham gia:</strong>{" "}
                {event.currentParticipants || 0}/{event.maxParticipants || 50}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Phone size={20} />
              </div>
              <span className="break-words">
                <strong>Thắc mắc liên hệ:</strong>{" "}
                {event.createdBy?.phone || "0123456789"} (
                {event.createdBy?.name || "Nguyễn Trường Nam"})
              </span>
            </div>
          </div>
        </div>

        {/* Hiển thị trạng thái */}
        {registrationStatus && (
          <div className="flex items-center justify-center mt-4 px-4 md:px-6 pb-6 md:pb-8">
            {registrationStatus === "pending" && (
              <span className="text-white bg-gray-500 px-4 py-2 rounded-md font-semibold">
                Đang chờ duyệt
              </span>
            )}
            {registrationStatus === "approved" && (
              <span className="text-green-600 bg-green-50 px-4 py-2 rounded-md font-semibold">
                Đăng ký thành công
              </span>
            )}
            {registrationStatus === "completed" && (
              <span className="text-blue-600 bg-blue-50 px-4 py-2 rounded-md font-semibold">
                Bạn đã hoàn thành sự kiện này
              </span>
            )}
            {registrationStatus === "rejected" && (
              <span className="text-red-600 bg-red-50 px-4 py-2 rounded-md font-semibold">
                Yêu cầu đăng ký tham gia của bạn bị từ chối
              </span>
            )}
          </div>
        )}

        {/* Mô tả sự kiện */}
        <div className="px-4 md:px-6 pb-8 md:pb-12">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-4">
            Mô tả sự kiện
          </h2>
          <div
            className="prose prose-sm md:prose-lg max-w-none"
            dangerouslySetInnerHTML={{
              __html: renderDescription(event.description, event.galleryImages),
            }}
          />
        </div>
      </div>

      {/* Sidebar bên phải */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-24 self-start">
        {/* Box Thao tác */}
        <div className="bg-white shadow-md rounded-2xl p-6 border-1 border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-[#111827]">Thao tác</h3>
          <div className="space-y-4">
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
            >
              <ArrowLeft size={20} />
              <span>Trở về</span>
            </button>

            <button
              onClick={handleLike}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition font-medium"
            >
              <Heart size={20} className={isLiked ? "fill-red-600" : ""} />
              <span>Yêu thích</span>
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition font-medium"
            >
              <Share2 size={20} />
              <span>Chia sẻ</span>
            </button>

            {/* Nút Kênh Trao Đổi - Admin thấy, approved volunteers thấy, và EventManager cũng thấy */}
            {(registrationStatus === "approved" ||
              currentUser?.role === "ADMIN" ||
              String(currentUser?.id) === String(event.createdBy?.id)) && (
                <button
                  onClick={() =>
                    navigate(
                      // Nếu là eventmanager thì vào đường dẫn quản lý, không thì vào đường dẫn user thường
                      String(currentUser?.id) === String(event.createdBy?.id)
                        ? `/quanlisukien/su-kien/${eventId}/trao-doi`
                        : `/su-kien/${eventId}/trao-doi`
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-purple-500 text-purple-600 rounded-lg hover:bg-purple-50 transition font-medium"
                >
                  <MessageSquare size={20} />
                  <span>Kênh Trao Đổi</span>
                </button>
              )}

            {/* Nút Đăng ký tham gia */}
            {registrationStatus === "" && (
              <button
                onClick={handleRegister}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#DDB958] text-[#DDB958] rounded-lg hover:bg-yellow-50 transition font-medium"
              >
                <CheckCircle size={20} />
                <span>Đăng ký tham gia</span>
              </button>
            )}

            {/* Nút Hủy đăng ký */}
            {(registrationStatus === "pending" ||
              registrationStatus === "approved") && (
                <button
                  onClick={handleCancelRegistration}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-500 text-gray-600 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  <X size={20} />
                  <span>Hủy đăng ký</span>
                </button>
              )}
          </div>
        </div>

        {/* Box Thống kê */}
        <div className="bg-white shadow-md rounded-2xl p-6 border-1 border-gray-100">
          <h3 className="text-xl font-bold mb-6 text-[#111827]">Thống kê</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Heart size={20} className="text-red-500" />
              <span className="text-gray-700">
                <strong>Lượt yêu thích:</strong> {stats.likesCount}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Share2 size={20} className="text-green-500" />
              <span className="text-gray-700">
                <strong>Lượt chia sẻ:</strong> {stats.sharesCount}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Eye size={20} className="text-blue-500" />
              <span className="text-gray-700">
                <strong>Lượt xem:</strong> {stats.viewsCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
