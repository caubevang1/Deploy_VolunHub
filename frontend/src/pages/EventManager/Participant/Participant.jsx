import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Input,
  Button,
  Tag,
  message,
  Modal,
  Tooltip,
  AutoComplete,
} from "antd";
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
  MehFilled,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

// --- UTILS (Đưa ra ngoài để tránh dependency và hoisting) ---
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
};

const PERFORMANCE_OPTIONS = [
  {
    key: "GOOD",
    label: "Tốt",
    description: "Hoàn thành tốt nhiệm vụ, thái độ tích cực.",
    icon: <SmileFilled className="text-4xl mb-2 !text-white" />,
    color: "bg-[#189438] !text-white",
    tagColor: "gold",
  },
  {
    key: "AVERAGE",
    label: "Trung bình",
    description: "Hoàn thành nhiệm vụ ở mức cơ bản.",
    icon: <MehFilled className="text-4xl mb-2 !text-white" />,
    color: "bg-[#E2A800] !text-white",
    tagColor: "blue",
  },
  {
    key: "BAD",
    label: "Kém",
    description: "Thái độ không tốt hoặc không hoàn thành nhiệm vụ.",
    icon: <FrownFilled className="text-4xl mb-2 !text-white" />,
    color: "bg-[#E41D13] !text-white",
    tagColor: "orange",
  },
  {
    key: "NO_SHOW",
    label: "Vắng mặt",
    description: "Đăng ký nhưng không tham gia.",
    icon: <UserDeleteOutlined className="text-4xl mb-2 !text-white" />,
    color: "bg-gray-500 !text-white",
    tagColor: "default",
  },
];

export default function Participants() {
  const { eventId } = useParams();

  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");

  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedForRejection, setSelectedForRejection] = useState(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetParticipants(eventId);
      if (res.status === 200) {
        setData(res.data);
        setOriginalData(res.data);
      }
    } catch (err) {
      console.error(err);
      message.error("Không thể tải danh sách tình nguyện viên");
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value, list) => {
        const keyword = removeVietnameseTones(value.trim().toLowerCase());
        if (!keyword) {
          setData(list);
          return;
        }
        const filtered = list.filter((item) => {
          const name = removeVietnameseTones(item.volunteer?.name || "");
          return name.includes(keyword);
        });
        setData(filtered);
      }, 300),
    []
  );

  const handleSearchChange = (value) => {
    setSearchValue(value);

    if (!value || value.trim() === "") {
      setSearchOptions([]);
      setData(originalData);
      return;
    }

    const keyword = removeVietnameseTones(value.trim().toLowerCase());
    const suggestions = originalData
      .filter((item) => {
        const name = removeVietnameseTones(item.volunteer?.name || "");
        return name.includes(keyword);
      })
      .slice(0, 10)
      .map((item) => ({
        value: item.volunteer?.name || "",
        label: (
          <div className="flex justify-between items-center">
            <span>{item.volunteer?.name}</span>
            <Tag
              color={
                item.status === "approved"
                  ? "green"
                  : item.status === "pending"
                    ? "orange"
                    : "default"
              }
            >
              {item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
            </Tag>
          </div>
        ),
      }));

    setSearchOptions(suggestions);
    debouncedSearch(value, originalData);
  };

  const handleUpdateStatus = async (registrationId, status, name) => {
    // Nếu từ chối, hiển thị modal chọn lý do
    if (status === "rejected") {
      setSelectedForRejection({ id: registrationId, name });
      setIsRejectModalOpen(true);
      return;
    }

    // Nếu duyệt, xử lý như cũ
    const actionText = "duyệt";
    const result = await Swal.fire({
      title: `Bạn có chắc muốn ${actionText}?`,
      html: `Tình nguyện viên: <strong>${name}</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#22C55E",
      cancelButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await UpdateParticipantStatus(registrationId, status);
      if (res.status === 200) {
        Swal.fire("Thành công", "Cập nhật trạng thái thành công", "success");
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedRejectionReason) {
      message.warning("Vui lòng chọn lý do từ chối");
      return;
    }

    setIsRejectModalOpen(false);

    try {
      const res = await UpdateParticipantStatus(
        selectedForRejection.id,
        "rejected",
        selectedRejectionReason
      );
      if (res.status === 200) {
        Swal.fire(
          "Thành công",
          "Đã từ chối đăng ký và gửi thông báo",
          "success"
        );
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
    } finally {
      setSelectedRejectionReason("");
      setSelectedForRejection(null);
    }
  };

  const openRatingModal = (record) => {
    setSelectedParticipant(record);
    setIsRatingModalOpen(true);
  };

  const handleSubmitRating = async (performance) => {
    if (!selectedParticipant) return;

    const selectedOption = PERFORMANCE_OPTIONS.find(
      (o) => o.key === performance
    );
    const confirmResult = await Swal.fire({
      title: "Xác nhận đánh giá",
      html: `Bạn có chắc chắn muốn đánh giá: <br/><strong>${selectedParticipant.volunteer?.name}</strong> <br/> <strong style="color: #DDB958; font-size: 1.2em;">${selectedOption?.label}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
    });

    if (!confirmResult.isConfirmed) return;

    setSubmittingRating(true);
    try {
      const res = await MarkCompletedParticipants(selectedParticipant.id, {
        performance,
      });
      if (res.status === 200) {
        setIsRatingModalOpen(false);
        Swal.fire({
          icon: "success",
          title: "Đánh giá thành công!",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
      message.error("Có lỗi xảy ra khi đánh giá.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const columns = [
    {
      title: "Tình nguyện viên",
      dataIndex: ["volunteer", "name"],
      render: (text) => (
        <div className="font-semibold text-gray-800">{text}</div>
      ),
      sorter: (a, b) =>
        (a.volunteer?.name || "").localeCompare(b.volunteer?.name || ""),
    },
    {
      title: "Email",
      dataIndex: ["volunteer", "email"],
      render: (text) => (
        <div className="font-semibold text-gray-500 text-sm">{text || "—"}</div>
      ),
      sorter: (a, b) =>
        (a.volunteer?.email || "").localeCompare(b.volunteer?.email || ""),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      width: 150,
      render: (status) => {
        const colors = {
          pending: "#DDB958",
          approved: "#00C950",
          rejected: "red",
          completed: "#2B7FFF",
        };
        const labels = {
          pending: "Chờ duyệt",
          approved: "Đã duyệt",
          rejected: "Từ chối",
          completed: "Hoàn thành",
        };
        return (
          <Tag
            style={{ color: colors[status] || "#999" }}
            className="!font-semibold !bg-transparent !border-none !text-[14px] !pl-0"
          >
            {labels[status] || status?.toUpperCase()}
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
        if (!perf) return <span className="text-gray-400">—</span>;
        const option = PERFORMANCE_OPTIONS.find((o) => o.key === perf);
        if (!option) return <span className="text-gray-500">{perf}</span>;

        const iconMap = {
          GOOD: <SmileFilled className="text-lg" />,
          AVERAGE: <MehFilled className="text-lg" />,
          BAD: <FrownFilled className="text-lg" />,
          NO_SHOW: <UserDeleteOutlined className="text-lg" />,
        };

        return (
          <div
            className={`${option.color} px-3 py-1 rounded-md flex items-center justify-center gap-2 w-[130px] mx-auto whitespace-nowrap`}
          >
            {iconMap[option.key]}
            <span className="font-semibold">{option.label}</span>
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      align: "center",
      width: 200,
      render: (_, record) => (
        <div className="flex flex-col justify-center items-center gap-2">
          {record.status === "pending" && (
            <>
              <Button
                type="primary"
                className="!bg-green-500 w-18"
                size="small"
                onClick={() =>
                  handleUpdateStatus(
                    record.id,
                    "approved",
                    record.volunteer?.name
                  )
                }
              >
                Duyệt
              </Button>
              <Button
                size="small"
                className="!bg-red-500 !text-white w-18"
                onClick={() =>
                  handleUpdateStatus(
                    record.id,
                    "rejected",
                    record.volunteer?.name
                  )
                }
              >
                Từ chối
              </Button>
            </>
          )}
          {record.status === "approved" && (
            <Button
              type="primary"
              className="!bg-blue-500"
              onClick={() => openRatingModal(record)}
            >
              Đánh giá
            </Button>
          )}
          {record.status === "completed" && (
            <span className="text-green-600 font-medium text-xs">
              Đã kết thúc
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl uppercase font-bold text-gray-800">
          Quản lý Tình Nguyện Viên
        </h2>
        <Button icon={<ReloadOutlined />} onClick={fetchParticipants}>
          Tải lại
        </Button>
      </div>

      <AutoComplete
        value={searchValue}
        options={searchOptions}
        onChange={handleSearchChange}
        placeholder="Tìm kiếm theo tên tình nguyện viên..."
        size="large"
        className="mb-6 w-full"
        allowClear
        onClear={() => {
          setSearchValue("");
          setData(originalData);
        }}
      />

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* Modal từ chối với lý do */}
      <Modal
        title={
          <div className="text-xl font-bold text-red-500">Từ chối đăng ký</div>
        }
        open={isRejectModalOpen}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setSelectedRejectionReason("");
          setSelectedForRejection(null);
        }}
        onOk={handleConfirmRejection}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
      >
        <div className="my-4">
          <p className="mb-4">
            Tình nguyện viên:{" "}
            <strong className="text-lg">{selectedForRejection?.name}</strong>
          </p>
          <p className="mb-2 font-semibold">Vui lòng chọn lý do từ chối:</p>
          <div className="space-y-2">
            {[
              "Không đủ điều kiện tham gia",
              "Đã đủ số lượng tình nguyện viên",
              "Không phù hợp với yêu cầu sự kiện",
              "Lịch trình không phù hợp",
              "Điểm uy tín không đủ",
              "Lý do khác",
            ].map((reason) => (
              <div
                key={reason}
                className={`p-3 border rounded cursor-pointer transition-all ${selectedRejectionReason === reason
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-red-300 hover:bg-gray-50"
                  }`}
                onClick={() => setSelectedRejectionReason(reason)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedRejectionReason === reason}
                    onChange={() => setSelectedRejectionReason(reason)}
                    className="mr-2"
                  />
                  <span>{reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        footer={null}
        open={isRatingModalOpen}
        onCancel={() => setIsRatingModalOpen(false)}
        width={700}
        centered
      >
        <div className="text-center mb-8 mt-4">
          <h3 className="text-2xl font-bold text-gray-800">
            Đánh giá Tình Nguyện Viên
          </h3>
          <p className="text-gray-500 mt-2">
            Chọn mức độ hoàn thành của: <br />
            <span className="text-[#001529] font-bold text-3xl">
              {selectedParticipant?.volunteer?.name}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 px-4 pb-6">
          {PERFORMANCE_OPTIONS.map((option) => (
            <div
              key={option.key}
              onClick={() =>
                !submittingRating && handleSubmitRating(option.key)
              }
              className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all ${option.color
                } ${submittingRating
                  ? "opacity-50 pointer-events-none"
                  : "hover:-translate-y-1 hover:shadow-lg"
                }`}
            >
              {option.icon}
              <div className="font-bold text-lg mb-1">{option.label}</div>
              <div className="text-sm opacity-80">{option.description}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
