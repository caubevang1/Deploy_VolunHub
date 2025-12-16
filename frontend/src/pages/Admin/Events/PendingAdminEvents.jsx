import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, message, Select, AutoComplete } from "antd";
import { debounce } from "lodash";
import { GetPendingEvents, ApproveEvent } from "../../../services/AdminService";
import {
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

const { Search } = Input;

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

export default function PendingAdminEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  var navigate = useNavigate();
  const [filters, setFilters] = useState({
    category: "",
  });
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");

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

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const removeVietnameseTones = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const handleSearchChange = (value) => {
    setSearchValue(value);

    if (!value || value.trim() === "") {
      setSearchOptions([]);
      searchKeyword("");
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
            <span className="text-xs text-gray-500 ml-2">
              {categoryMapping[event.category]}
            </span>
          </div>
        ),
      }));

    setSearchOptions(suggestions);
    searchKeyword(value);
  };

  const searchKeyword = useCallback(
    debounce((value) => {
      const keyword = removeVietnameseTones(value.trim().toLowerCase());

      let filtered = [...originalData];

      // Lọc theo category
      if (filters.category) {
        filtered = filtered.filter(
          (event) => event.category === filters.category
        );
      }

      // Lọc theo keyword
      if (keyword) {
        filtered = filtered.filter((event) => {
          const name = removeVietnameseTones(event.name || "");
          return name.includes(keyword);
        });
      }

      setData(filtered);
    }, 300),
    [originalData, filters]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Áp dụng filter khi filters thay đổi
  useEffect(() => {
    searchKeyword(searchValue);
  }, [filters, searchKeyword]);

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

  // Từ chối sự kiện
  const handleRejectEvent = async (eventId, name) => {
    const result = await Swal.fire({
      title: `Từ chối sự kiện?`,
      text: name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#DDB958",
      confirmButtonText: "Từ chối",
      cancelButtonText: "Hủy",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await ApproveEvent(eventId); // Sử dụng API tương tự, backend sẽ xử lý
      if (res.status === 200) {
        Swal.fire("Đã từ chối!", "", "success");
        fetchPendingEvents();
      } else {
        Swal.fire("Lỗi", "Không thể từ chối sự kiện", "error");
      }
    } catch (error) {
      console.error("❌ Lỗi khi từ chối sự kiện:", error);
      Swal.fire("Lỗi", "Đã xảy ra lỗi khi từ chối sự kiện", "error");
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
      render: (category) => categoryMapping[category] || category,
    },
    {
      title: "Thao tác",
      align: "center",
      render: (_, event) => (
        <div className="flex flex-col gap-2 items-center">
          <div
            className="flex items-center justify-center gap-2 cursor-pointer select-none transition-transform duration-300 hover:scale-110 hover:text-green-700"
            onClick={() => handleApproveEvent(event._id, event.name)}
            style={{ fontWeight: 500 }}
          >
            <CheckOutlined style={{ color: "green", fontSize: 18 }} />
            <span style={{ color: "green" }}>DUYỆT</span>
          </div>

          <div
            className="flex items-center justify-center gap-2 cursor-pointer select-none transition-transform duration-300 hover:scale-110 hover:text-red-700"
            onClick={() => handleRejectEvent(event._id, event.name)}
            style={{ fontWeight: 500 }}
          >
            <CloseOutlined style={{ color: "red", fontSize: 18 }} />
            <span style={{ color: "red" }}>TỪ CHỐI</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="pendingEvents">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Duyệt sự kiện</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchPendingEvents}
          type="default"
        >
          Tải lại
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <AutoComplete
          className="flex-1"
          value={searchValue}
          options={searchOptions}
          onChange={handleSearchChange}
          onSelect={handleSearchChange}
          placeholder="Tìm kiếm theo tên sự kiện"
          size="large"
          allowClear
          onClear={() => {
            setSearchValue("");
            setSearchOptions([]);
            searchKeyword("");
          }}
        />

        <Select
          placeholder="Loại sự kiện"
          size="large"
          style={{ width: 180 }}
          allowClear
          value={filters.category || undefined}
          onChange={(value) => handleFilterChange("category", value)}
          options={[
            { value: "Community", label: "Cộng đồng" },
            { value: "Education", label: "Giáo dục" },
            { value: "Healthcare", label: "Sức khỏe" },
            { value: "Environment", label: "Môi trường" },
            { value: "EventSupport", label: "Sự kiện" },
            { value: "Technical", label: "Kỹ thuật" },
            { value: "Emergency", label: "Cứu trợ khẩn cấp" },
            { value: "Online", label: "Trực tuyến" },
            { value: "Corporate", label: "Doanh nghiệp" },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        className="shadow shadow-md rounded-md"
      />
    </div>
  );
}
