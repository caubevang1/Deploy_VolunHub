import { useState, useEffect, useRef } from "react";
import { Table, Input, Button, message, Tag, AutoComplete } from "antd";
import { debounce } from "lodash";
import {
  GetManagerEvents,
  DeleteEvents,
  GetEventDetail,
} from "../../../services/EventManagerService";
import { ReloadOutlined, EditOutlined, CloseOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react"; // ✅ Import icon

const { Search } = Input;

// Bảng ánh xạ trạng thái
const statusMapping = {
  approved: "Đã duyệt",
  rejected: "Từ chối",
  completed: "Hoàn thành",
  pending: "Chờ duyệt",
};

export default function EventManagerEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const searchKeywordRef = useRef(null);

  const removeVietnameseTones = (str = "") => {
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const resList = await GetManagerEvents();
      if (resList.status === 200) {
        const listEvents = resList.data;

        const detailedEvents = await Promise.all(
          listEvents.map(async (event) => {
            try {
              const resDetail = await GetEventDetail(event._id);
              if (resDetail.status === 200) {
                return {
                  ...event,
                  stats: resDetail.data.stats || {
                    totalRegistrations: 0,
                    approvedCount: 0,
                  },
                };
              }
            } catch (err) {
              console.error(`Lỗi lấy chi tiết sự kiện ${event._id}:`, err);
            }
            return {
              ...event,
              stats: { totalRegistrations: 0, approvedCount: 0 },
            };
          })
        );

        setData(detailedEvents);
        setOriginalData(detailedEvents);
      }
    } catch (err) {
      console.error("Lỗi khi lấy danh sách sự kiện:", err);
      message.error("Không thể tải danh sách sự kiện");
    } finally {
      setLoading(false);
    }
  };

  // create debounced fn and keep in ref; recreate when originalData changes
  useEffect(() => {
    const fn = debounce((value) => {
      try {
        const keyword = removeVietnameseTones(value.trim().toLowerCase());
        if (!keyword) {
          setData(originalData);
          return;
        }
        const filtered = originalData.filter((event) => {
          const name = removeVietnameseTones(event.name || "");
          return name.includes(keyword);
        });
        setData(filtered);
      } catch (err) {
        console.warn("Debounced search error:", err);
      }
    }, 300);

    searchKeywordRef.current = fn;
    return () => {
      if (fn && typeof fn.cancel === "function") fn.cancel();
    };
  }, [originalData]);

  // call fetchEvents on mount (fetchEvents is defined above)
  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearchChange = (value) => {
    setSearchValue(value);

    if (!value || value.trim() === "") {
      setSearchOptions([]);
      setData(originalData);
      return;
    }

    const keyword = removeVietnameseTones(value.trim().toLowerCase());
    const suggestions = originalData
      .filter((event) => {
        const name = removeVietnameseTones(event.name || "");
        return name.includes(keyword);
      })
      .slice(0, 10)
      .map((event) => ({
        value: event.name,
        label: (
          <div className="flex justify-between items-center">
            <span className="truncate flex-1">{event.name}</span>
            <Tag
              color={
                event.status === "approved"
                  ? "green"
                  : event.status === "pending"
                    ? "orange"
                    : "red"
              }
            >
              {statusMapping[event.status]}
            </Tag>
          </div>
        ),
      }));

    setSearchOptions(suggestions);
    if (searchKeywordRef.current) searchKeywordRef.current(value);
  };

  // onSelect từ autocomplete -> navigate tới trang detail manager
  const handleSelectEvent = (value) => {
    const found = originalData.find((e) => (e.name || "") === value);
    if (found) {
      navigate(`/quanlisukien/su-kien/${found._id}`);
    }
  };

  const handleDeleteEvent = async (eventId, name) => {
    const result = await Swal.fire({
      title: `Xác nhận xóa sự kiện?`,
      text: name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DDB958",
      cancelButtonColor: "#d33",
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await DeleteEvents(eventId);
      if (res.status === 200) {
        Swal.fire("Đã xóa!", "", "success");
        fetchEvents();
      } else {
        Swal.fire("Lỗi", "Không thể xóa sự kiện", "error");
      }
    } catch (err) {
      console.error("Lỗi khi xóa sự kiện:", err);
      Swal.fire("Lỗi", "Đã xảy ra lỗi khi xóa sự kiện", "error");
    }
  };

  const handleEditEvent = (eventId) => {
    navigate(`/quanlisukien/su-kien/sua/${eventId}`);
  };

  const columns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) =>
        a.name?.toLowerCase().localeCompare(b.name?.toLowerCase()),
      render: (text, event) => (
        <Button
          type="link"
          className="!font-semibold !text-blue-600 hover:scale-105 transition-transform duration-150 !p-0 !h-auto text-left"
          onClick={() => navigate(`/quanlisukien/su-kien/${event._id}`)}
          style={{ whiteSpace: "normal", textAlign: "left" }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      width: 120,
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (date) => new Date(date).toLocaleDateString(),
      align: "center",
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
      key: "location",
      width: 150,
      sorter: (a, b) =>
        (a.location ?? "")
          .toLowerCase()
          .localeCompare((b.location ?? "").toLowerCase()),
      render: (text) => (
        <span className="truncate block max-w-[150px]">{text || "—"}</span>
      ),
    },
    {
      title: "SL đăng ký",
      key: "totalRegistrations",
      width: 130,
      render: (_, event) => (
        <Button
          type="link"
          className="!font-semibold !text-blue-600 hover:scale-110 transition-transform duration-150"
          onClick={() =>
            navigate(`/quanlisukien/su-kien/${event._id}/participants`)
          }
        >
          {event.stats?.totalRegistrations ?? 0}
        </Button>
      ),
      sorter: (a, b) =>
        (a.stats?.totalRegistrations ?? 0) - (b.stats?.totalRegistrations ?? 0),
      align: "center",
    },
    {
      title: "SL đã duyệt",
      key: "approvedCount",
      width: 130,
      render: (_, event) => (
        <span className="font-medium text-gray-700">
          {event.stats?.approvedCount ?? 0}
        </span>
      ),
      sorter: (a, b) =>
        (a.stats?.approvedCount ?? 0) - (b.stats?.approvedCount ?? 0),
      align: "center",
    },
    {
      title: "Giới hạn",
      dataIndex: "maxParticipants",
      key: "maxParticipants",
      width: 100,
      sorter: (a, b) => (a.maxParticipants ?? 0) - (b.maxParticipants ?? 0),
      render: (count) => count ?? "—",
      align: "center",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      align: "center",
      render: (status, event) => {
        const color =
          {
            pending: "!text-[#DDB958]",
            completed: "!text-blue-500",
            approved: "!text-green-500",
            rejected: "!text-red-500",
          }[status] || "!text-gray-500";

        return (
          <div className="flex flex-col items-center justify-center gap-1">
            <Tag
              className={`!ml-0 !pl-0 !mr-0 !pr-0 !border-none !bg-transparent !font-semibold !text-[14px] ${color}`}
            >
              {statusMapping[status] || status}
            </Tag>
            {status === "rejected" && event.rejectionReason && (
              <span
                className="text-sm text-red-600 cursor-pointer hover:underline"
                onClick={() => {
                  Swal.fire({
                    title: "<span class='text-red-600'>Lý do từ chối</span>",
                    html: `
                        <div class="text-left bg-gray-50 p-4 rounded-lg">
                          <p class="font-semibold text-gray-800 mb-3 text-base">Sự kiện: <span class="text-blue-600">${event.name}</span></p>
                          <div class="border-l-4 border-red-500 pl-3 py-2 bg-white rounded">
                            <p class="text-gray-700 text-sm leading-relaxed">${event.rejectionReason}</p>
                          </div>
                        </div>
                      `,
                    icon: "warning",
                    iconColor: "#dc2626",
                    confirmButtonText: "Đóng",
                    confirmButtonColor: "#DDB958",
                    customClass: {
                      popup: "rounded-lg",
                      title: "text-lg",
                    },
                  });
                }}
              >
                (Lý do)
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      width: 150, // ✅ Tăng width
      render: (_, event) => {
        const isDisabled =
          event.status === "completed" || event.status === "approved";

        return (
          <div className="flex justify-center gap-2">
            {/* ✅ Thêm nút vào kênh trao đổi */}
            {event.status === "approved" && (
              <Button
                type="text"
                icon={<MessageSquare className="!text-[#DCBA58] !text-lg" />}
                onClick={() =>
                  navigate(`/quanlisukien/su-kien/${event._id}/trao-doi`)
                }
                title="Kênh trao đổi"
              />
            )}

            <Button
              type="text"
              disabled={isDisabled}
              icon={
                <FontAwesomeIcon
                  icon={faTrash}
                  className="!text-red-500 hover:!text-red-700 !text-lg"
                />
              }
              onClick={() =>
                !isDisabled && handleDeleteEvent(event._id, event.name)
              }
              title={
                isDisabled
                  ? "Không thể xóa sự kiện đã duyệt hoặc hoàn thành"
                  : "Xóa sự kiện"
              }
              className={isDisabled ? "cursor-not-allowed opacity-50" : ""}
              style={isDisabled ? { color: "#ef4444" } : {}}
            />
            <Button
              type="text"
              disabled={isDisabled}
              icon={
                <EditOutlined className="!text-blue-500 hover:!text-blue-700 !text-lg" />
              }
              onClick={() => !isDisabled && handleEditEvent(event._id)}
              title={
                isDisabled
                  ? "Không thể chỉnh sửa sự kiện đã duyệt hoặc hoàn thành"
                  : "Chỉnh sửa sự kiện"
              }
              className={isDisabled ? "cursor-not-allowed opacity-50" : ""}
              style={isDisabled ? { color: "#3b82f6" } : {}}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Quản lý sự kiện</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchEvents}>
          Tải lại
        </Button>
      </div>

      <AutoComplete
        value={searchValue}
        options={searchOptions}
        onChange={handleSearchChange}
        onSelect={handleSelectEvent}
        placeholder="Tìm kiếm theo tên sự kiện"
        size="large"
        className="mb-4"
        allowClear
        onClear={() => {
          setSearchValue("");
          setSearchOptions([]);
          setData(originalData);
        }}
        style={{ width: "100%" }}
      />

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        className="shadow shadow-md rounded-md"
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
