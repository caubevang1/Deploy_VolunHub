import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, message, Tag } from "antd";
import { debounce } from "lodash";
import {
  GetManagerEvents,
  DeleteEvents,
  GetEventDetail,
} from "../../../services/EventManagerService";
import { ReloadOutlined, EditOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react"; // ✅ Import icon

const { Search } = Input;

export default function EventManagerEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sự kiện:", error);
      message.error("Không thể tải danh sách sự kiện");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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

      const filtered = originalData.filter((event) => {
        const name = removeVietnameseTones(event.name || "");
        return name.includes(keyword);
      });

      setData(filtered);
    }, 300),
    [originalData]
  );

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
    } catch (error) {
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
      width: 120,
      align: "center",
      render: (status) => {
        const color =
          {
            pending: "!text-[#DDB958]",
            completed: "!text-blue-500",
            approved: "!text-green-500",
          }[status] || "!text-red-500";

        return (
          <Tag
            className={`!ml-0 !pl-0 !border-none !bg-transparent !font-semibold !text-[14px] ${color}`}
          >
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      width: 150, // ✅ Tăng width
      render: (_, event) => (
        <div className="flex justify-center gap-2">
          {/* ✅ Thêm nút vào kênh trao đổi */}
          {event.status === "approved" && (
            <Button
              type="text"
              icon={<MessageSquare className="text-green-500 text-lg" />}
              onClick={() =>
                navigate(`/quanlisukien/su-kien/${event._id}/trao-doi`)
              }
              title="Kênh trao đổi"
            />
          )}

          <Button
            type="text"
            danger
            icon={
              <FontAwesomeIcon
                icon={faTrash}
                className="text-red-500 hover:text-red-700 text-lg"
              />
            }
            onClick={() => handleDeleteEvent(event._id, event.name)}
          />
          <Button
            type="text"
            icon={
              <EditOutlined className="!text-blue-500 !hover:text-blue-700 !text-lg" />
            }
            onClick={() => handleEditEvent(event._id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl uppercase font-bold text-gray-800">
          Quản lý sự kiện
        </h2>
        <Button icon={<ReloadOutlined />} onClick={fetchEvents}>
          Tải lại
        </Button>
      </div>

      <Search
        placeholder="Tìm kiếm theo tên sự kiện..."
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
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
