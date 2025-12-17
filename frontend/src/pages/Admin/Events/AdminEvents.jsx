import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Input,
  Button,
  message,
  Tag,
  Select,
  Modal,
  DatePicker,
  Space,
  AutoComplete,
} from "antd";
import { debounce } from "lodash";
import {
  GetEvents,
  DeleteEvent,
  ExportEvents,
} from "../../../services/AdminService";
import {
  ReloadOutlined,
  DownloadOutlined,
  CalendarOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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

// Bảng ánh xạ trạng thái
const statusMapping = {
  approved: "Đã duyệt",
  rejected: "Từ chối",
  completed: "Hoàn thành",
  pending: "Chờ duyệt",
};

export default function AdminEvents() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    category: "",
    status: "",
  });
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportDateRange, setExportDateRange] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");

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

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleExportEvents = async () => {
    setExportLoading(true);
    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const extension = exportFormat === "json" ? "json" : "csv";

      let queryParams = exportFormat;
      if (exportDateRange && exportDateRange[0] && exportDateRange[1]) {
        const startDate = exportDateRange[0].format("YYYY-MM-DD");
        const endDate = exportDateRange[1].format("YYYY-MM-DD");
        queryParams = `${exportFormat}&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await ExportEvents(queryParams);
      const filename = `events-export-${timestamp}.${extension}`;

      const blob = new Blob([response.data], {
        type: exportFormat === "json" ? "application/json" : "text/csv",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Xuất dữ liệu thành công!");
      setExportModalVisible(false);
    } catch (error) {
      console.error("Export error:", error);
      message.error("Không thể xuất dữ liệu. Vui lòng thử lại!");
    } finally {
      setExportLoading(false);
    }
  };

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
        const location = removeVietnameseTones(event.location || "");
        return name.includes(keyword) || location.includes(keyword);
      })
      .slice(0, 10)
      .map((event) => ({
        value: event.name,
        label: (
          <div className="flex justify-between items-center">
            <span className="truncate">{event.name}</span>
            <span className="text-xs text-gray-500 ml-2">{event.location}</span>
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

      // Lọc theo status
      if (filters.status) {
        filtered = filtered.filter((event) => event.status === filters.status);
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
          <div className="flex flex-col items-center gap-2">
            <Tag
              className={`ml-0 pl-0 !border-none !bg-transparent !font-semibold !text-[15px] ${color}`}
            >
              {statusMapping[status] || status}
            </Tag>
            {status === "rejected" && event.rejectionReason && (
              <Button
                type="default"
                size="small"
                icon={<CloseOutlined />}
                className="!text-red-600 !border-red-300 hover:!bg-red-50 hover:!border-red-400 !rounded-md !px-3 !py-1 !h-7 !text-xs !font-medium shadow-sm transition-all duration-200"
                onClick={() => {
                  Swal.fire({
                    title: "<span class='text-red-600'>⚠️ Lý do từ chối</span>",
                    html: `
                      <div class="text-left bg-gray-50 p-4 rounded-lg">
                        <p class="font-semibold text-gray-800 mb-3 text-base">📌 Sự kiện: <span class="text-blue-600">${event.name}</span></p>
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
                Xem lý do
              </Button>
            )}
          </div>
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
    <div className="adminEvents">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Quản lý sự kiện</h2>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => setExportModalVisible(true)}
            className="bg-green-600 hover:bg-green-700 border-green-600"
          >
            Xuất Dữ Liệu
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchEvents}>
            Tải lại
          </Button>
        </Space>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <AutoComplete
          className="flex-1"
          value={searchValue}
          options={searchOptions}
          onChange={handleSearchChange}
          onSelect={handleSearchChange}
          placeholder="Tìm kiếm theo tên sự kiện hoặc địa điểm"
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

        <Select
          placeholder="Trạng thái"
          size="large"
          style={{ width: 150 }}
          allowClear
          value={filters.status || undefined}
          onChange={(value) => handleFilterChange("status", value)}
          options={[
            { value: "approved", label: "Đã duyệt" },
            { value: "rejected", label: "Từ chối" },
            { value: "completed", label: "Hoàn thành" },
            { value: "pending", label: "Chờ duyệt" },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        className="shadow-md rounded-md"
      />

      {/* Export Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined style={{ color: "#1890ff" }} />
            <span className="font-semibold">Xuất Dữ Liệu Sự Kiện</span>
          </Space>
        }
        open={exportModalVisible}
        onOk={handleExportEvents}
        onCancel={() => setExportModalVisible(false)}
        okText="Xuất dữ liệu"
        cancelText="Hủy"
        confirmLoading={exportLoading}
        width={500}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Khoảng thời gian (tùy chọn)
            </label>
            <RangePicker
              value={exportDateRange}
              onChange={setExportDateRange}
              style={{ width: "100%" }}
              size="large"
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              allowClear
            />
            <p className="text-xs text-gray-500 mt-1">
              Để trống để xuất toàn bộ dữ liệu
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Định dạng file
            </label>
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              style={{ width: "100%" }}
              size="large"
            >
              <Select.Option value="csv">
                <Space>
                  <DownloadOutlined />
                  <span>CSV (Excel)</span>
                </Space>
              </Select.Option>
              <Select.Option value="json">
                <Space>
                  <DownloadOutlined />
                  <span>JSON</span>
                </Space>
              </Select.Option>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> File sẽ được tải về máy tính của bạn với
              thông tin tất cả sự kiện trong hệ thống.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
