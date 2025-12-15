import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, Tag, message, Modal, Tooltip } from "antd";
import { debounce } from "lodash";
import {
    GetParticipants,
    UpdateParticipantStatus,
    MarkCompletedParticipants,
} from "../../../services/EventManagerService";
import {
    ReloadOutlined,
    SmileFilled,
    FrownFilled,
    UserDeleteOutlined,
    MehFilled
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

const { Search } = Input;

// Cấu hình UI cho các mức đánh giá
const PERFORMANCE_OPTIONS = [
    {
        key: "GOOD",
        label: "Tốt",
        description: "Hoàn thành tốt nhiệm vụ, thái độ tích cực.",
        icon: <SmileFilled className="text-4xl mb-2 !text-white" />,
        color: "bg-[#189438] !text-white",
        tagColor: "gold"
    },
    {
        key: "AVERAGE",
        label: "Trung bình",
        description: "Hoàn thành nhiệm vụ ở mức cơ bản.",
        icon: <MehFilled className="text-4xl mb-2 !text-white" />,
        color: "bg-[#E2A800] !text-white",
        tagColor: "blue"
    },
    {
        key: "BAD",
        label: "Kém",
        description: "Thái độ không tốt hoặc không hoàn thành nhiệm vụ.",
        icon: <FrownFilled className="text-4xl mb-2 !text-white" />,
        color: "bg-[#E41D13] !text-white",
        tagColor: "orange"
    },
    {
        key: "NO_SHOW",
        label: "Vắng mặt",
        description: "Đăng ký nhưng không tham gia.",
        icon: <UserDeleteOutlined className="text-4xl mb-2 !text-white" />,
        color: "bg-gray-500 !text-white",
        tagColor: "default"
    }
];

export default function Participants() {
    const { eventId } = useParams();

    const [data, setData] = useState([]);
    const [originalData, setOriginalData] = useState([]);
    const [loading, setLoading] = useState(false);

    // State cho Modal đánh giá
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [submittingRating, setSubmittingRating] = useState(false);

    const fetchParticipants = async () => {
        setLoading(true);
        try {
            const res = await GetParticipants(eventId);
            if (res.status === 200) {
                setData(res.data);
                setOriginalData(res.data);
            }
        } catch (error) {
            message.error("Không thể tải danh sách tình nguyện viên");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchParticipants();
    }, [eventId]);

    const removeVietnameseTones = (str) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase();
    };

    const searchKeyword = useCallback(
        debounce((value) => {
            const keyword = removeVietnameseTones(value.trim().toLowerCase());
            if (!keyword) {
                setData(originalData);
                return;
            }
            const filtered = originalData.filter((item) => {
                const name = removeVietnameseTones(item.volunteer?.name || "");
                return name.includes(keyword);
            });
            setData(filtered);
        }, 300),
        [originalData]
    );

    // --- XỬ LÝ TRẠNG THÁI PENDING ---
    const handleUpdateStatus = async (registrationId, status, name) => {
        const actionText = status === "approved" ? "duyệt" : "từ chối";
        const result = await Swal.fire({
            title: `Bạn có chắc muốn ${actionText}?`,
            html: `Tình nguyện viên: <strong>${name}</strong>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xác nhận",
            cancelButtonText: "Hủy",
            confirmButtonColor: status === "approved" ? "#22C55E" : "#EA4343",
            cancelButtonColor: "#d33",
        });

        if (!result.isConfirmed) return;

        try {
            const res = await UpdateParticipantStatus(registrationId, status);
            if (res.status === 200) {
                Swal.fire("Thành công", "Cập nhật trạng thái thành công", "success");
                fetchParticipants();
            } else {
                Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
            }
        } catch (error) {
            Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
        }
    };

    // --- XỬ LÝ ĐÁNH GIÁ (MỞ MODAL) ---
    const openRatingModal = (record) => {
        setSelectedParticipant(record);
        setIsRatingModalOpen(true);
    };

    // --- GỌI API MARK COMPLETED (CÓ CONFIRM SWAL) ---
    const handleSubmitRating = async (performance) => {
        if (!selectedParticipant) return;

        // 1. Lấy thông tin option đã chọn để hiển thị tên đẹp hơn
        const selectedOption = PERFORMANCE_OPTIONS.find(o => o.key === performance);

        // 2. Hiện Swal xác nhận
        const confirmResult = await Swal.fire({
            title: 'Xác nhận đánh giá',
            html: `
                Bạn có chắc chắn muốn đánh giá: <br/>
                <strong>${selectedParticipant.volunteer?.name}</strong> <br/>
                <strong style="color: #DDB958; font-size: 1.2em;">${selectedOption?.label}</strong>?
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Đồng ý',
            cancelButtonText: 'Xem lại',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33'
        });

        // Nếu người dùng bấm Hủy -> Dừng lại
        if (!confirmResult.isConfirmed) return;

        // 3. Tiến hành gọi API
        setSubmittingRating(true);

        console.log('Sending to API:', {
            participantId: selectedParticipant._id,
            performance: performance
        });

        try {
            const res = await MarkCompletedParticipants(selectedParticipant._id, { performance });

            console.log('API Response:', res.data);

            if (res.status === 200) {
                setIsRatingModalOpen(false);
                Swal.fire({
                    icon: 'success',
                    title: 'Đánh giá thành công!',
                    text: `Đã ghi nhận kết quả: ${selectedOption?.label}`,
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchParticipants();
            }
        } catch (error) {
            console.error(error);
            message.error("Có lỗi xảy ra khi đánh giá.");
        } finally {
            setSubmittingRating(false);
        }
    };

    const columns = [
        {
            title: "Tình nguyện viên",
            dataIndex: ["volunteer", "name"],
            render: (text, record) => (
                <div>
                    <div className="font-semibold text-gray-800">{text}</div>
                    {/* <div className="text-xs text-gray-500">{record.volunteer?.email || "—"}</div> */}
                </div>
            ),
            sorter: (a, b) => (a.volunteer?.name || "").localeCompare(b.volunteer?.name || ""),
        },
        {
            title: "Email",
            dataIndex: ["volunteer", "email"],
            render: (text) => (
                <div className="font-semibold text-gray-500 text-sm">{text || "—"}</div>
            ),
            sorter: (a, b) => (a.volunteer?.email || "").localeCompare(b.volunteer?.email || ""),
        },

        {
            title: "Trạng thái",
            dataIndex: "status",
            width: 150,
            render: (status) => {
                let color = "#999";
                let text = status?.toUpperCase();

                if (status === 'pending') {
                    color = "#DDB958";
                    text = "Chờ duyệt";
                }
                if (status === 'approved') {
                    color = "#00C950";
                    text = "Đã duyệt";
                }
                if (status === 'rejected') {
                    color = "red";
                    text = "Từ chối";
                }
                if (status === 'completed') {
                    color = "#2B7FFF";
                    text = "Hoàn thành";
                }

                return (
                    <Tag
                        style={{ color }}
                        className="!font-semibold !bg-transparent !border-none !text-[14px] !pl-0 !ml-0"
                    >
                        {text}
                    </Tag>
                );
            },
        },
        {
            title: "Đánh giá",
            dataIndex: "performance",
            align: "center",
            width: 160,
            render: (perf) => {
                console.log('Performance value:', perf); // Debug: xem giá trị thực tế

                if (!perf) return <span className="text-gray-400">—</span>;
                const option = PERFORMANCE_OPTIONS.find(o => o.key === perf);

                console.log('Found option:', option); // Debug: xem option có tìm thấy không

                if (!option) return <span className="text-gray-500">{perf}</span>;

                // Tạo icon phù hợp cho từng loại đánh giá
                const iconMap = {
                    "GOOD": <SmileFilled className="text-lg" />,
                    "AVERAGE": <MehFilled className="text-lg" />,
                    "BAD": <FrownFilled className="text-lg" />,
                    "NO_SHOW": <UserDeleteOutlined className="text-lg" />
                };

                return (
                    <div className={`${option.color} px-3 py-1 rounded-md flex items-center justify-center gap-2 w-[130px] mx-auto whitespace-nowrap`}>
                        {iconMap[option.key]}
                        <span className="font-semibold">{option.label}</span>
                    </div>
                );
            }
        },
        {
            title: "Thao tác",
            align: "center",
            width: 200,
            render: (_, record) => (
                <div className="flex flex-col justify-center items-center gap-2">
                    {/* CASE 1: Đang chờ duyệt -> Hiện nút Duyệt / Từ chối */}
                    {record.status === "pending" && (
                        <>
                            <Tooltip title="Duyệt tham gia">
                                <Button
                                    type="primary"
                                    className="!bg-green-500 !hover:bg-green-600 !border-none !font-semibold w-18"
                                    size="small"
                                    onClick={() => handleUpdateStatus(record._id, "approved", record.volunteer?.name)}
                                >
                                    Duyệt
                                </Button>
                            </Tooltip>
                            <Tooltip title="Từ chối tham gia">
                                <Button

                                    size="small"
                                    className="!bg-red-500 !hover:bg-red-600 !border-none !text-white !font-semibold w-18"
                                    onClick={() => handleUpdateStatus(record._id, "rejected", record.volunteer?.name)}
                                >
                                    Từ chối
                                </Button>
                            </Tooltip>
                        </>
                    )}

                    {/* CASE 2: Đã duyệt -> Hiện nút Hoàn thành (Mở Modal đánh giá) */}
                    {record.status === "approved" && (
                        <Button
                            type="primary"
                            className="!bg-blue-500 !hover:bg-blue-700 !border-none !shadow-md !shadow-blue-200 !font-semibold"
                            onClick={() => openRatingModal(record)}
                        >
                            Đánh giá
                        </Button>
                    )}

                    {/* CASE 3: Đã hoàn thành -> Có thể hiện nút sửa đánh giá nếu cần (Option) */}
                    {record.status === "completed" && (
                        <span className="text-green-600 font-medium text-xs">Đã kết thúc</span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl uppercase font-bold text-gray-800">Quản lý Tình Nguyện Viên</h2>
                <Button icon={<ReloadOutlined />} onClick={fetchParticipants}>
                    Tải lại
                </Button>
            </div>

            <Search
                placeholder="Tìm kiếm theo tên tình nguyện viên..."
                allowClear
                size="large"
                onChange={(e) => searchKeyword(e.target.value)}
                className="mb-6 w-full"
            />

            <Table
                columns={columns}
                dataSource={data}
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                className="shadow-sm border border-gray-100 rounded-md"
            />

            {/* --- MODAL ĐÁNH GIÁ  --- */}
            <Modal
                title={null}
                footer={null}
                open={isRatingModalOpen}
                onCancel={() => setIsRatingModalOpen(false)}
                width={700}
                centered
                className="rating-modal"
            >
                <div className="text-center mb-8 mt-4">
                    <h3 className="text-2xl font-bold text-gray-800">Đánh giá Tình Nguyện Viên</h3>
                    <p className="text-gray-500 mt-2">
                        Hãy chọn mức độ hoàn thành nhiệm vụ của: <br />
                        <span className="text-[#001529] font-bold text-3xl">{selectedParticipant?.volunteer?.name}</span>
                        <p className="text-gray-500 font-md text-md">({selectedParticipant?.volunteer?.email})</p>
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 px-4 pb-6">
                    {PERFORMANCE_OPTIONS.map((option) => (
                        <div
                            key={option.key}
                            onClick={() => !submittingRating && handleSubmitRating(option.key)}
                            className={`
                                group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200
                                flex flex-col items-center text-center
                                ${option.color}
                                ${submittingRating ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-1 hover:shadow-lg'}
                            `}
                        >
                            <div className="transition-transform group-hover:scale-110 duration-300">
                                {option.icon}
                            </div>
                            <div className="font-bold text-lg mb-1">{option.label}</div>
                            <div className="text-sm opacity-80">{option.description}</div>

                            {/* Loading spinner overlay nếu đang submit */}
                            {submittingRating && (
                                <div className="absolute inset-0 bg-white/50 rounded-xl flex items-center justify-center">
                                    <ReloadOutlined spin className="text-2xl text-gray-600" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}