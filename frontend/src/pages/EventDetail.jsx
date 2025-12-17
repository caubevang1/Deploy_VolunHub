import { useEffect, useState } from "react";
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

// Ánh xạ từ tiếng Anh sang tiếng Việt cho category
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

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await GetUserInfo();
        if (res.status === 200) {
          setCurrentUser(res.data);
        }
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
        // Kiểm tra dữ liệu tồn tại trước khi set
        if (res.status === 200 && res.data) {
          setEvent(res.data);

          // Lấy thống kê và trạng thái song song để tối ưu tốc độ
          const [statsRes, likeRes] = await Promise.allSettled([
            GetEventActionStats(eventId),
            CheckEventStatus(eventId)
          ]);

          if (statsRes.status === "fulfilled" && statsRes.value.status === 200) {
            setStats(statsRes.value.data);
          }

          if (likeRes.status === "fulfilled" && likeRes.value.status === 200) {
            setIsLiked(likeRes.value.data.hasLiked);
          }

          // Tăng lượt xem
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
      // Chỉ kiểm tra nếu event đã load xong để tránh lỗi id của null
      if (!event?._id) return;

      try {
        const res = await GetMyEvent();
        if (res.status === 200 && Array.isArray(res.data)) {
          const eventData = res.data.find(
            (e) => String(e.event?._id || e.event) === String(eventId)
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
    if (registrationStatus && registrationStatus !== "") {
      Swal.fire({
        icon: "warning",
        title: "Thông báo",
        text: "Bạn không thể đăng ký lại vào lúc này.",
        confirmButtonText: "OK",
        confirmButtonColor: "#DDB958",
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
          text: "Bạn đã đăng ký tham gia sự kiện và đang chờ duyệt.",
          confirmButtonText: "OK",
          confirmButtonColor: "#DDB958",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Đăng ký thất bại",
        text: err.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.",
        confirmButtonText: "OK",
        confirmButtonColor: "#DDB958",
      });
    }
  };

  const handleCancelRegistration = async () => {
    const result = await Swal.fire({
      title: "Bạn có chắc chắn muốn hủy đăng ký?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy đăng ký",
      confirmButtonColor: "#DDB958",
      cancelButtonText: "Thôi",
      cancelButtonColor: "#d33",
    });

    if (result.isConfirmed) {
      try {
        const res = await CancelRegistration(eventId);
        if (res.status === 200) {
          setRegistrationStatus("");
          Swal.fire({
            icon: "success",
            title: "Hủy đăng ký thành công",
            confirmButtonText: "OK",
            confirmButtonColor: "#DDB958",
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "Thất bại",
          text: "Không thể hủy đăng ký vào lúc này.",
          confirmButtonText: "OK",
          confirmButtonColor: "#DDB958",
        });
      }
    }
  };

  const handleLike = async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setStats((prev) => ({
        ...prev,
        likesCount: prev.likesCount + (newLikedState ? 1 : -1),
      }));

      await EventActions(eventId, { type: "LIKE" });
    } catch (error) {
      console.error("Lỗi khi thực hiện Like:", error);
      // Rollback UI nếu lỗi
      setIsLiked(isLiked);
    }
  };

  const handleShare = async () => {
    try {
      const res = await EventActions(eventId, { type: "SHARE" });
      const shareLink = res.data?.link || `${window.location.origin}/su-kien/${eventId}`;

      await navigator.clipboard.writeText(shareLink);
      Swal.fire({
        icon: "success",
        title: "Đã sao chép liên kết!",
        timer: 1500,
        showConfirmButton: false,
      });

      setStats((prev) => ({ ...prev, sharesCount: prev.sharesCount + 1 }));
    } catch (error) {
      console.error("Lỗi khi chia sẻ:", error);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[400px]">
      <p className="text-lg animate-pulse">Đang tải thông tin sự kiện...</p>
    </div>
  );

  if (!event) return (
    <div className="text-center mt-20">
      <p className="text-xl text-red-500 mb-4">Không tìm thấy sự kiện!</p>
      <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">Quay lại</button>
    </div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN");
  };

  const renderDescription = (description, galleryImages) => {
    if (!description) return "";
    let html = description;
    if (Array.isArray(galleryImages)) {
      galleryImages.forEach((img, index) => {
        const realUrl = `http://localhost:5000${img}`;
        const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
        const imgTag = `
          <div style="text-align: center; margin: 20px 0;">
            <img src="${realUrl}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
          </div>`;
        html = html.replaceAll(placeholder, imgTag);
      });
    }
    return html;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto mt-6 lg:mt-10 my-4 px-4">
      {/* Nội dung chính */}
      <div className="flex-1 bg-white shadow-lg rounded-2xl overflow-hidden">
        <h1 className="text-2xl md:text-4xl font-bold px-4 md:px-6 pt-6 md:pt-8 text-gray-900">
          {event.name}
        </h1>

        <div className="px-4 md:px-6 py-4 md:py-6">
          <img
            src={event.coverImage ? `http://localhost:5000${event.coverImage}` : "/default-event.png"}
            alt={event.name}
            className="w-full max-h-[500px] object-cover rounded-xl"
          />
        </div>

        <div className="px-4 md:px-12 py-6 text-gray-700 flex flex-col sm:flex-row gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-500" size={20} />
              <span><strong>Ngày tổ chức:</strong> {formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Tag className="text-orange-500" size={20} />
              <span><strong>Loại:</strong> {categoryMapping[event.category] || event.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="text-red-500" size={20} />
              <span><strong>Địa điểm:</strong> {event.location}</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-500" size={20} />
              <span><strong>Ngày kết thúc:</strong> {formatDate(event.endDate)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="text-green-500" size={20} />
              <span><strong>Tham gia:</strong> {event.currentParticipants || 0}/{event.maxParticipants}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-purple-500 mt-1" size={20} />
              <span>
                <strong>Liên hệ:</strong> {event.createdBy?.phone || "N/A"} ({event.createdBy?.name || "Người quản lý"})
              </span>
            </div>
          </div>
        </div>

        {/* Trạng thái đăng ký */}
        {registrationStatus && (
          <div className="px-6 pb-6 text-center">
             <div className={`inline-block px-6 py-2 rounded-full font-bold text-sm shadow-sm
              ${registrationStatus === "pending" ? "bg-amber-100 text-amber-700" : ""}
              ${registrationStatus === "approved" ? "bg-green-100 text-green-700" : ""}
              ${registrationStatus === "completed" ? "bg-blue-100 text-blue-700" : ""}
              ${registrationStatus === "rejected" ? "bg-red-100 text-red-700" : ""}`}>
                {registrationStatus === "pending" && "Đang chờ duyệt hồ sơ"}
                {registrationStatus === "approved" && "Đã được chấp nhận tham gia"}
                {registrationStatus === "completed" && "Bạn đã hoàn thành sự kiện này"}
                {registrationStatus === "rejected" && "Yêu cầu tham gia bị từ chối"}
             </div>
          </div>
        )}

        <div className="px-4 md:px-12 pb-12 border-t pt-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Mô tả chi tiết</h2>
          <div
            className="prose prose-blue max-w-none text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderDescription(event.description, event.galleryImages),
            }}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-6">
        <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-100 sticky top-24">
          <h3 className="text-lg font-bold mb-6 pb-2 border-b">Thao tác</h3>
          <div className="space-y-3">
            <button onClick={() => navigate(-1)} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              <ArrowLeft size={18} /> <span>Trở về</span>
            </button>

            <button onClick={handleLike} className={`w-full flex items-center justify-center gap-2 py-3 border rounded-xl transition
              ${isLiked ? "bg-red-50 border-red-200 text-red-600" : "border-gray-300 hover:bg-gray-50"}`}>
              <Heart size={18} className={isLiked ? "fill-current" : ""} /> <span>Yêu thích</span>
            </button>

            <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              <Share2 size={18} /> <span>Chia sẻ</span>
            </button>

            {/* Kênh trao đổi */}
            {(registrationStatus === "approved" || currentUser?.role === "ADMIN") && event.status === "approved" && (
              <button onClick={() => navigate(`/su-kien/${eventId}/trao-doi`)} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition">
                <MessageSquare size={18} /> <span>Kênh Trao Đổi</span>
              </button>
            )}

            {/* Đăng ký */}
            {registrationStatus === "" && (
              <button onClick={handleRegister} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#DDB958] text-white rounded-xl hover:bg-[#c9a74d] shadow-md transition font-bold">
                <CheckCircle size={18} /> <span>Đăng ký tham gia</span>
              </button>
            )}

            {/* Hủy đăng ký */}
            {(registrationStatus === "pending" || registrationStatus === "approved") && (
              <button onClick={handleCancelRegistration} className="w-full py-3 text-red-500 hover:text-red-700 text-sm font-medium transition">
                Hủy đăng ký tham gia
              </button>
            )}
          </div>

          <div className="mt-8 pt-6 border-t space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><Heart size={16} className="text-red-500"/> Yêu thích</span>
              <span className="font-bold">{stats.likesCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><Share2 size={16} className="text-green-500"/> Chia sẻ</span>
              <span className="font-bold">{stats.sharesCount}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><Eye size={16} className="text-blue-500"/> Lượt xem</span>
              <span className="font-bold">{stats.viewsCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}