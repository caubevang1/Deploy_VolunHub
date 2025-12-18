import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GetEventDetail } from "../../../services/AdminService";
import {
  Calendar,
  Users,
  MapPin,
  Tag,
  Phone,
  MessageSquare,
  ArrowLeft,
  AlertTriangle
} from "lucide-react";

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

export default function AdminEventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = "http://localhost:5000";

  useEffect(() => {
    async function load() {
      try {
        const res = await GetEventDetail(eventId);
        if (res.status === 200) {
          // Repo transform trả về object sạch, không cần [0] hay xử lý phức tạp
          setEvent(res.data);
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết sự kiện:", err);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center mt-20 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-lg text-gray-500">Đang tải dữ liệu sự kiện...</p>
    </div>
  );

  if (!event) return (
    <div className="text-center mt-20">
      <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
      <p className="text-xl font-semibold text-red-500">Không tìm thấy sự kiện!</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Quay lại danh sách</button>
    </div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "Chưa cập nhật";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getFullUrl = (path) => {
    if (!path || path === "default-event-image.jpg") return "/default-event.png";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const renderDescription = (description, galleryImages) => {
    if (!description) return "Không có mô tả.";
    let html = description;
    if (Array.isArray(galleryImages)) {
      galleryImages.forEach((img, index) => {
        const realUrl = getFullUrl(img);
        const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
        const imgTag = `
          <div style="text-align: center; margin: 24px 0;">
            <img src="${realUrl}" style="max-width: 100%; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />
          </div>
        `;
        html = html.split(placeholder).join(imgTag);
      });
    }
    return html;
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen pb-10">
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 shadow-sm flex items-center gap-4">
         <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
         </button>
         <h2 className="text-xl font-bold text-gray-800">Chi tiết sự kiện Admin</h2>
      </div>

      <div className="max-w-6xl mx-auto mt-6 bg-white rounded-2xl overflow-hidden shadow-lg">
        {/* Banner Image */}
        <div className="relative h-96 w-full">
          <img
            src={getFullUrl(event.coverImage)}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <h1 className="text-white text-4xl font-bold p-8 drop-shadow-md">{event.name}</h1>
          </div>
        </div>

        {/* Action Buttons Area */}
        <div className="px-8 py-6 flex flex-wrap gap-4 items-center bg-white border-b">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${
            event.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            Trạng thái: {event.status}
          </span>
          
          {event.status === "approved" && (
            <button
              onClick={() => navigate(`/admin/su-kien/${event.id}/trao-doi`)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md transition-all"
            >
              <MessageSquare size={20} />
              Kênh Trao Đổi
            </button>
          )}
        </div>

        {/* Info Grid */}
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12 border-b">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Ngày bắt đầu</p>
                <p className="text-lg font-bold text-gray-800">{formatDate(event.date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Tag size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Loại sự kiện</p>
                <p className="text-lg font-bold text-gray-800">{categoryMapping[event.category] || event.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg"><MapPin size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Địa điểm</p>
                <p className="text-lg font-bold text-gray-800">{event.location}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Calendar size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Ngày kết thúc</p>
                <p className="text-lg font-bold text-gray-800">{formatDate(event.endDate)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Users size={24} /></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Tình nguyện viên</p>
                <p className="text-lg font-bold text-gray-800">
                  {event.currentParticipants || 0} / {event.maxParticipants} (Đã đăng ký)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <Phone className="text-gray-400 mt-1" size={20} />
              <div>
                <p className="text-sm text-gray-500 font-medium">Liên hệ tổ chức</p>
                <p className="font-bold text-gray-800">{event.createdBy?.name || "N/A"}</p>
                <p className="text-blue-600 font-mono">{event.createdBy?.phone || "0123.456.789"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="p-10">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
             <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
             Mô tả sự kiện
          </h3>
          <div
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: renderDescription(event.description, event.galleryImages),
            }}
          />
        </div>

        {/* Rejection Notification */}
        {event.status === 'rejected' && (
          <div className="m-10 p-6 bg-red-50 border-l-8 border-red-500 rounded-lg">
             <p className="text-red-800 font-bold text-lg mb-1">Sự kiện đã bị từ chối</p>
             <p className="text-red-600 italic">Lý do: {event.rejectionReason || "Không có lý do cụ thể."}</p>
          </div>
        )}
      </div>
    </div>
  );
}