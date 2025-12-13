import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GetEventDetail } from "../../../services/AdminService";
import { Calendar, Users, MapPin, Tag, Phone } from "lucide-react";

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

  useEffect(() => {
    async function load() {
      try {
        const res = await GetEventDetail(eventId);
        if (res.status === 200) setEvent(res.data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

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

  return (
    <div className="w-full bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
        {/* Tiêu đề */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            {event.name}
          </h1>
        </div>

        {/* Ảnh */}
        <div className="px-8 py-6">
          <img
            src={
              event.coverImage
                ? `http://localhost:5000${event.coverImage}`
                : "/default-event.png"
            }
            alt={event.name}
            className="w-full h-auto object-cover rounded-lg shadow-md"
            style={{ maxHeight: "500px", objectFit: "cover" }}
          />
        </div>

        {/* Nút quay lại */}
        <div className="px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <span>←</span>
            <span>Quay lại</span>
          </button>
        </div>

        {/* Thông tin chi tiết */}
        <div className="mx-8 mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <h2 className="text-2xl font-semibold mb-6 text-blue-900 flex items-center gap-2">
            Thông Tin Sự Kiện
          </h2>
          <div className="flex flex-col sm:flex-row gap-10 text-gray-700 text-lg">
            <div className="flex flex-col gap-6 flex-1">
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

            <div className="flex flex-col gap-6 flex-1">
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
        </div>

        {/* Mô tả sự kiện */}
        <div className="px-8 pb-8">
          <h2 className="text-2xl font-semibold mb-4 text-blue-900 flex items-center gap-2">
            Mô Tả Sự Kiện
          </h2>
          <div
            className="prose prose-lg max-w-none prose-img:m-auto bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200"
            dangerouslySetInnerHTML={{
              __html: renderDescription(event.description, event.galleryImages),
            }}
          />
        </div>
      </div>
    </div>
  );
}
