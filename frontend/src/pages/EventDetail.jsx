import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GetEventDetail, GetEventActionStats } from "../services/EventService";
import { Calendar, Users, MapPin, Tag, Phone, MessageSquare, Heart, Share2, Eye, ArrowLeft } from "lucide-react";
import { Registration, CancelRegistration, GetMyEvent, CheckEventStatus, EventActions } from "../services/UserService";
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
    Corporate: "Doanh nghiệp"
};

export default function EventDetail() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registrationStatus, setRegistrationStatus] = useState("");
    const [stats, setStats] = useState({ likesCount: 0, sharesCount: 0, viewsCount: 0 });
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const res = await GetEventDetail(eventId);
                if (res.status === 200) setEvent(res.data);

                // Lấy thống kê
                const statsRes = await GetEventActionStats(eventId);
                if (statsRes.status === 200) {
                    setStats(statsRes.data);
                }

                // Check trạng thái Like
                const likeRes = await CheckEventStatus(eventId);
                if (likeRes.status === 200) {
                    setIsLiked(likeRes.data.hasLiked);
                }

                // Tăng lượt xem
                await EventActions(eventId, { type: "VIEW" });
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        load();
    }, [eventId]);

    useEffect(() => {
        async function checkRegistrationStatus() {
            try {
                const res = await GetMyEvent();
                if (res.status === 200) {
                    const eventData = res.data.find(
                        e => String(e.event._id) === String(eventId)
                    );

                    if (eventData) {
                        setRegistrationStatus(eventData.status);
                    } else {
                        setRegistrationStatus("");
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
        checkRegistrationStatus();
    }, [eventId]);

    const handleRegister = async () => {
        // Chặn đăng ký nếu đã có trạng thái (bao gồm cả rejected/completed nếu muốn chặt chẽ hơn)
        if (registrationStatus && registrationStatus !== "") {
            Swal.fire({
                icon: "warning",
                title: "Thông báo",
                text: "Bạn không thể đăng ký lại vào lúc này.",
                confirmButtonText: "OK",
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
                    confirmButtonColor: "#DDB958"
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Đăng ký thất bại",
                    text: "Có lỗi xảy ra khi đăng ký sự kiện.",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#DDB958"
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Đăng ký thất bại",
                text: "Đã xảy ra lỗi. Vui lòng thử lại.",
                confirmButtonText: "OK",
                confirmButtonColor: "#DDB958"
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
            cancelButtonColor: "#d33"
        });

        if (result.isConfirmed) {
            try {
                const res = await CancelRegistration(eventId);
                if (res.status === 200) {
                    setRegistrationStatus("");
                    Swal.fire({
                        icon: "success",
                        title: "Hủy đăng ký thành công",
                        text: "Bạn đã hủy đăng ký tham gia sự kiện.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#DDB958"
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Hủy đăng ký thất bại",
                        text: "Có lỗi xảy ra khi hủy đăng ký.",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#DDB958"
                    });
                }
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: "error",
                    title: "Hủy đăng ký thất bại",
                    text: "Đã xảy ra lỗi. Vui lòng thử lại.",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#DDB958"
                });
            }
        }
    };

    const handleLike = async () => {
        try {
            const newLikedState = !isLiked;
            setIsLiked(newLikedState);
            setStats(prev => ({
                ...prev,
                likesCount: prev.likesCount + (newLikedState ? 1 : -1)
            }));

            await EventActions(eventId, { type: "LIKE" });

            // Cập nhật lại stats từ server
            const statsRes = await GetEventActionStats(eventId);
            if (statsRes.status === 200) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error("Lỗi khi thực hiện Like:", error);
            setIsLiked(!isLiked);
            setStats(prev => ({
                ...prev,
                likesCount: prev.likesCount + (isLiked ? 1 : -1)
            }));
        }
    };

    const handleShare = async () => {
        try {
            setStats(prev => ({
                ...prev,
                sharesCount: prev.sharesCount + 1
            }));

            const res = await EventActions(eventId, { type: "SHARE" });
            const shareLink = res.data?.link || `${window.location.origin}/su-kien/${eventId}`;

            navigator.clipboard.writeText(shareLink);
            Swal.fire({
                icon: 'success',
                title: 'Đã sao chép!',
                text: 'Liên kết sự kiện đã được sao chép vào bộ nhớ tạm.',
                confirmButtonText: 'OK',
                confirmButtonColor: '#DDB958',
                timer: 2000,
                timerProgressBar: true
            });

            // Cập nhật lại stats từ server
            const statsRes = await GetEventActionStats(eventId);
            if (statsRes.status === 200) {
                setStats(statsRes.data);
            }
        } catch (error) {
            console.error("Lỗi khi chia sẻ:", error);
        }
    };

    if (loading) return <p className="text-center mt-10 text-lg">Đang tải...</p>;
    if (!event) return <p className="text-center mt-10 text-lg text-red-500">Không tìm thấy sự kiện!</p>;

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
        <div className="flex gap-6 max-w-7xl mx-auto mt-10 my-4">
            {/* Phần nội dung chính */}
            <div className="flex-1 bg-white shadow-lg rounded-2xl overflow-hidden text-[#111827]">
                {/* Tiêu đề */}
                <h1 className="text-4xl sm:text-4xl font-bold px-6 !pt-8">{event.name}</h1>

                {/* Ảnh */}
                <img
                    src={event.coverImage ? `http://localhost:5000${event.coverImage}` : "/default-event.png"}
                    alt={event.name}
                    className="w-full max-h-[500px] object-cover px-6 py-8"
                />

                {/* Thông tin chi tiết */}
                <div className="px-12 py-8 text-gray-700 flex flex-col sm:flex-row gap-10">
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
                                <strong>Loại sự kiện:</strong> {categoryMapping[event.category] || event.category || "Khác"}
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
                                <strong>Số người tham gia:</strong> {event.currentParticipants || 0}/{event.maxParticipants || 50}
                            </span>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                <Phone size={20} />
                            </div>
                            <span className="break-words">
                                <strong>Thắc mắc liên hệ:</strong> {event.createdBy?.phone || "0123456789"} ({event.createdBy?.name || "Nguyễn Trường Nam"})
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mô tả sự kiện */}
                <div className="px-6 pb-12">
                    <h2 className="text-3xl font-semibold mb-4">Mô tả sự kiện</h2>
                    <div
                        className="prose prose-lg max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: renderDescription(event.description, event.galleryImages)
                        }}
                    />
                </div>

                {/* Xử lý hiển thị trạng thái và nút bấm */}
                <div className="flex items-center justify-center mt-4 px-6 pb-8 relative">

                    {/* --- CASE: PENDING --- */}
                    {registrationStatus === "pending" && (
                        <span className="text-white bg-gray-500 p-2 rounded-md font-semibold">
                            Đang chờ duyệt
                        </span>
                    )}

                    {/* --- CASE: APPROVED --- */}
                    {registrationStatus === "approved" && (
                        <span className="text-green-600 font-medium">
                            Đăng ký thành công
                        </span>
                    )}

                    {/* --- CASE: COMPLETED (MỚI) --- */}
                    {registrationStatus === "completed" && (
                        <span className="text-blue-500 font-medium">
                            Bạn đã hoàn thành sự kiện này
                        </span>
                    )}

                    {/* --- CASE: REJECTED (MỚI) --- */}
                    {registrationStatus === "rejected" && (
                        <span className="text-red-500 font-medium">
                            Yêu cầu đăng ký tham gia của bạn bị từ chối
                        </span>
                    )}

                    {/* --- BUTTON: ĐĂNG KÝ (Chỉ hiện khi chưa đăng ký) --- */}
                    {registrationStatus === "" && (
                        <button
                            onClick={handleRegister}
                            className="px-4 py-2 bg-[#DDB958] text-white rounded-md hover:bg-[#CDA550] font-semibold"
                        >
                            Đăng ký tham gia
                        </button>
                    )}

                    {/* --- BUTTON: HỦY ĐĂNG KÝ (Chỉ hiện khi Pending hoặc Approved) --- */}
                    {(registrationStatus === "pending" || registrationStatus === "approved") && (
                        <button
                            onClick={handleCancelRegistration}
                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold absolute right-6"
                        >
                            Hủy đăng ký
                        </button>
                    )}
                </div>
            </div>

            {/* Sidebar bên phải */}
            <div className="w-80 flex-shrink-0 space-y-6 sticky top-24 self-start">
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
                            <Heart
                                size={20}
                                className={isLiked ? "fill-red-600" : ""}
                            />
                            <span>Yêu thích</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition font-medium"
                        >
                            <Share2 size={20} />
                            <span>Chia sẻ</span>
                        </button>

                        {/* Nút Kênh Trao Đổi */}
                        {registrationStatus === "approved" && event.status === 'approved' && (
                            <button
                                onClick={() => navigate(`/su-kien/${eventId}/trao-doi`)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#DCBA58] text-[#DCBA58] rounded-lg hover:bg-[#DCBA58]/10 transition font-medium"
                            >
                                <MessageSquare size={20} />
                                <span>Kênh Trao Đổi</span>
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