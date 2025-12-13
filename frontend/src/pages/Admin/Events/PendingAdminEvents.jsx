import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, message } from "antd";
import { debounce } from "lodash";
import { GetPendingEvents, ApproveEvent } from "../../../services/AdminService";
import { ReloadOutlined, CheckOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const { Search } = Input;

export default function PendingAdminEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  var navigate = useNavigate();

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

  const fetchPendingEvents = async () => {
    setLoading(true);
    try {
      const res = await GetPendingEvents();
      if (res.status === 200) {
        setData(res.data);
        setOriginalData(res.data);
      }
    } catch (error) {
      message.error("Không thể tải danh sách sự kiện pending");
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
    (searchValue = "", category = selectedCategory) => {
      let filtered = [...originalData];

      if (category) {
        filtered = filtered.filter((event) => event.category === category);
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
    [originalData, selectedCategory]
  );

  const searchKeyword = useCallback(
    debounce((value) => {
      applyFilters(value);
    }, 300),
    [applyFilters]
  );

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedCategory, applyFilters]);

  // Duyệt sự kiện
  const handleApproveEvent = async (eventId, name) => {
    const result = await Swal.fire({
      title: `Duyệt sự kiện?`,
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
      const res = await ApproveEvent(eventId);
      if (res.status === 200) {
        Swal.fire("Đã duyệt!", "", "success");
        fetchPendingEvents();
      } else {
        Swal.fire("Lỗi", "Không thể duyệt sự kiện", "error");
      }
    } catch (error) {
      console.error("❌ Lỗi khi duyệt sự kiện:", error);
      Swal.fire("Lỗi", "Đã xảy ra lỗi khi duyệt sự kiện", "error");
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
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: "Địa điểm",
      dataIndex: "location",
    },
    {
      title: "Loại sự kiện",
      dataIndex: "category",
    },
    {
      title: "Thao tác",
      align: "center",
      render: (_, event) => (
        <Button
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => handleApproveEvent(event._id, event.name)}
          className="transition-all duration-300 hover:scale-105"
          style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
        >
          DUYỆT
        </Button>
      ),
    },
  ];

  return (
    <div className="pendingEvents p-6 bg-gradient-to-br from-gray-50 to-orange-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-gray-800">Duyệt Sự Kiện</h2>
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
            showTotal: (total) => `Tổng ${total} sự kiện chờ duyệt`,
          }}
          className="rounded-md"
        />
      </div>
    </div>
  );
}
