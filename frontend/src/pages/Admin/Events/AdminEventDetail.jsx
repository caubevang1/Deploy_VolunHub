import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  GetEventDetail,
  ApproveEvent,
  RejectEvent,
} from "../../../services/AdminService";
import { getImageUrl } from "../../../utils/imageHelper";
import { message, Modal, Radio, Space, Input } from "antd";
import {
  Calendar,
  Users,
  MapPin,
  Tag,
  Phone,
  MessageSquare,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { GetEventDetail as GetEventDetailForManager } from "../../../services/EventManagerService";

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

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    async function load() {
      try {
        let res = null;
        try {
          res = await GetEventDetail(eventId);
        } catch (adminErr) {
          console.warn(
            "AdminService.GetEventDetail failed, will try EventManagerService:",
            adminErr
          );
        }

        // Chuẩn hoá event object từ response (có thể khác shape)
        const normalize = (r) => {
          if (!r) return null;
          const payload = r.data ?? r;
          if (!payload) return null;
          return payload.event ?? payload;
        };

        let evt = normalize(res);

        // Nếu không có kết quả từ admin service, thử fallback sang manager service
        if (!evt) {
          try {
            const mgrRes = await GetEventDetailForManager(eventId);
            evt = normalize(mgrRes);
            if (evt) {
              console.info("Loaded event via EventManagerService fallback");
            }
          } catch (mgrErr) {
            console.warn(
              "EventManagerService.GetEventDetail also failed:",
              mgrErr
            );
          }
        }

        if (evt) {
          setEvent(evt);
        } else {
          console.warn("No event found for id:", eventId);
          setEvent(null);
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết sự kiện:", err);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center mt-20 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-lg text-gray-500">Đang tải dữ liệu sự kiện...</p>
      </div>
    );

  if (!event)
    return (
      <div className="text-center mt-20">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-xl font-semibold text-red-500">
          Không tìm thấy sự kiện!
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Quay lại danh sách
        </button>
      </div>
    );

  const formatDate = (dateStr) => {
    if (!dateStr) return "Chưa cập nhật";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getFullUrl = (path) => {
    if (!path || path === "default-event-image.jpg")
      return "/default-event.png";
    return getImageUrl(path);
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

  const rejectReasons = [
    "Nội dung sự kiện không phù hợp với chính sách cộng đồng",
    "Thông tin sự kiện không đầy đủ hoặc không rõ ràng",
    "Thời gian tổ chức không hợp lý hoặc trùng lặp",
    "Địa điểm tổ chức không phù hợp hoặc không an toàn",
    "Mục tiêu sự kiện không mang tính tình nguyện",
    "Sự kiện có dấu hiệu lừa đảo hoặc vi phạm pháp luật",
  ];

  const openApproveConfirm = () => {
    Modal.confirm({
      title: "Xác nhận duyệt sự kiện",
      content: "Bạn có chắc muốn duyệt sự kiện này không?",
      okText: "Duyệt",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          const res = await ApproveEvent(event.id);
          message.success(res.data?.message || "Duyệt sự kiện thành công");
          if (res.data?.event) setEvent(res.data.event);
        } catch (err) {
          console.error(err);
          message.error(
            err.response?.data?.message || "Không thể duyệt sự kiện"
          );
        }
      },
    });
  };

  const confirmRejectEvent = async () => {
    const finalReason = rejectReason === "custom" ? customReason : rejectReason;
    if (rejectReason === "custom" && (!finalReason || !finalReason.trim())) {
      message.warning("Vui lòng nhập lý do từ chối hoặc chọn lý do khác.");
      return;
    }
    try {
      const res = await RejectEvent(event.id, finalReason || "");
      message.success(res.data?.message || "Từ chối sự kiện thành công");
      if (res.data?.event) setEvent(res.data.event);
      setRejectModalVisible(false);
      setRejectReason("");
      setCustomReason("");
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể từ chối sự kiện");
    }
  };

  return (
    <>
      {/* Top Navigation */}
      <div className="bg-white px-6 py-4 shadow-sm flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          Chi tiết sự kiện Admin
        </h2>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
        {/* Banner Image */}
        <div className="relative h-96 w-full">
          <img
            src={getFullUrl(event.coverImage)}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
            <h1 className="text-white text-4xl font-bold p-8 drop-shadow-md">
              {event.name}
            </h1>
          </div>
        </div>

        {/* Action Buttons Area */}
        <div className="px-8 py-6 flex flex-wrap gap-4 items-center bg-white border-b">
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${event.status === "approved"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
              }`}
          >
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

          {event.status === "pending" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => openApproveConfirm()}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold shadow-md"
              >
                Duyệt
              </button>

              <button
                onClick={() => setRejectModalVisible(true)}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-md"
              >
                Từ chối
              </button>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="p-10 pl-16 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Ngày bắt đầu
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(event.date)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                <Tag size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Loại sự kiện
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {categoryMapping[event.category] || event.category}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Địa điểm</p>
                <p className="text-lg font-bold text-gray-800">
                  {event.location}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Ngày kết thúc
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(event.endDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Tình nguyện viên
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {event.currentParticipants || 0} / {event.maxParticipants}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Liên hệ tổ chức
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {event.createdBy?.name || "N/A"}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  {event.createdBy?.phone || "0123.456.789"}
                </p>
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

        <Modal
          title={<span className="text-lg font-semibold">Từ chối sự kiện</span>}
          open={rejectModalVisible}
          onOk={confirmRejectEvent}
          onCancel={() => setRejectModalVisible(false)}
          okText="Xác nhận từ chối"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          width={600}
        >
          {event && (
            <div className="mb-4">
              <p className="font-medium text-gray-700">Sự kiện: {event.name}</p>
            </div>
          )}
          <p className="mb-3 font-medium">Vui lòng chọn lý do từ chối:</p>
          <Radio.Group
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (e.target.value !== "custom") setCustomReason("");
            }}
            value={rejectReason}
            className="w-full"
          >
            <Space direction="vertical" className="w-full">
              {rejectReasons.map((reason, index) => (
                <Radio key={index} value={reason} className="text-sm">
                  {reason}
                </Radio>
              ))}
              <Radio value="custom">Lý do khác (nhập bên dưới)</Radio>
            </Space>
          </Radio.Group>
          {rejectReason === "custom" && (
            <Input.TextArea
              className="mt-3"
              rows={3}
              placeholder="Nhập lý do từ chối..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              maxLength={200}
              showCount
            />
          )}
        </Modal>

        {/* Rejection Notification */}
        {event.status === "rejected" && (
          <div className="m-10 p-6 bg-red-50 border-l-8 border-red-500 rounded-lg">
            <p className="text-red-800 font-bold text-lg mb-1">
              Sự kiện đã bị từ chối
            </p>
            <p className="text-red-600 italic">
              Lý do: {event.rejectionReason || "Không có lý do cụ thể."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
