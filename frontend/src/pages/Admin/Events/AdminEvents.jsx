import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, message, Tag } from "antd";
import { debounce } from "lodash";
import { GetEvents, DeleteEvent } from "../../../services/AdminService";
import { ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const { Search } = Input;

export default function AdminEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const navigate = useNavigate();

  // Bảng ánh xạ loại tình nguyện
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

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await GetEvents();
      if (res.status === 200) {
        setData(res.data);
        setOriginalData(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sự kiện:", error);
      message.error("Không thể tải danh sách sự kiện");
    }
    setLoading(false);
  };

  const removeVietnameseTones = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const applyFilters = useCallback(
    (
      searchValue = "",
      category = selectedCategory,
      status = selectedStatus
    ) => {
      let filtered = [...originalData];

      if (category) {
        filtered = filtered.filter((event) => event.category === category);
      }

      if (status) {
        filtered = filtered.filter((event) => event.status === status);
      }

      if (searchValue) {
        const keyword = removeVietnameseTones(searchValue.trim().toLowerCase());
        filtered = filtered.filter((event) => {
          const name = removeVietnameseTones(event.name || "");
          return name.includes(keyword);
        });
      }

      setData(filtered);
    },
    [originalData, selectedCategory, selectedStatus]
  );

  const searchKeyword = useCallback(
    debounce((value) => {
      applyFilters(value);
    }, 300),
    [applyFilters]
  );

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, selectedStatus, applyFilters]);

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
      const res = await DeleteEvent(eventId);
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

  const handleEventDetail = (eventId) => {
    navigate(`/admin/su-kien/${eventId}`);
  };

  const columns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      sorter: (a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
      render: (text, event) => (
        <Button
          type="link"
          className="!font-semibold ml-0 pl-0 !text-blue-600 max-w-[380px] transform transition-transform duration-200 hover:scale-105"
          onClick={() => handleEventDetail(event._id)}
          style={{ whiteSpace: "normal", padding: 0 }}
        >
          <span className="line-clamp-2 text-left block leading-tight py-10">
            {text}
          </span>
        </Button>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "date",
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
    },
    {
      title: "Loại sự kiện",
      dataIndex: "category",
      render: (category) => categoryMapping[category] || category,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status) => {
        const statusConfig = {
          pending: { color: "warning", text: "CHỞ DUYỆT" },
          completed: { color: "processing", text: "HOÀN THÀNH" },
          approved: { color: "success", text: "ĐÃ DUYỆT" },
          rejected: { color: "error", text: "TỪ CHỐI" },
        }[status] || { color: "default", text: status.toUpperCase() };
        return (
          <Tag color={statusConfig.color} className="font-semibold">
            {statusConfig.text}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      align: "center",
      render: (_, event) => (
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
      ),
    },
  ];

  return (
    <div className="adminEvents p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-gray-800">Quản Lý Sự Kiện</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-3">
          <Search
            className="flex-1 shadow-sm"
            placeholder="Tìm kiếm theo tên sự kiện..."
            size="large"
            onChange={(e) => searchKeyword(e.target.value)}
            allowClear
            style={{ borderRadius: 8 }}
          />
          <select
            className="px-4 py-2 border rounded-lg text-base cursor-pointer hover:border-blue-500 transition-colors"
            style={{ minWidth: 180 }}
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
          >
            <option value="">Tất cả loại</option>
            {Object.entries(categoryMapping).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="px-4 py-2 border rounded-lg text-base cursor-pointer hover:border-blue-500 transition-colors"
            style={{ minWidth: 150 }}
            value={selectedStatus || ""}
            onChange={(e) => setSelectedStatus(e.target.value || null)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} sự kiện`,
          }}
          className="rounded-md"
        />
      </div>
    </div>
  );
}
