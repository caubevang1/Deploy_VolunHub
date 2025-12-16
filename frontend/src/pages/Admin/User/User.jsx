import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Input,
  Button,
  message,
  Select,
  Modal,
  DatePicker,
  Space,
  AutoComplete,
} from "antd";
import { debounce } from "lodash";
import {
  GetUsers,
  UpdateUserStatus,
  UpdateUserRole,
  ExportUsers,
  ExportVolunteers,
} from "../../../services/AdminService";
import {
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
  DownloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const { Search } = Input;

export default function Users() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: "",
    status: "",
  });
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportDateRange, setExportDateRange] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportUserType, setExportUserType] = useState("all");
  const [searchOptions, setSearchOptions] = useState([]);
  const [searchValue, setSearchValue] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await GetUsers();
      if (res.status === 200) {
        setData(res.data);
        setOriginalData(res.data);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      message.error("Không thể tải danh sách người dùng");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExportUsers = async () => {
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

      // Choose export function based on user type
      const response =
        exportUserType === "volunteers"
          ? await ExportVolunteers(queryParams)
          : await ExportUsers(queryParams);

      const filenamePrefix =
        exportUserType === "volunteers" ? "volunteers" : "users";
      const filename = `${filenamePrefix}-export-${timestamp}.${extension}`;

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
      .filter((user) => {
        const name = removeVietnameseTones(user.name || "");
        const username = removeVietnameseTones(user.username || "");
        return name.includes(keyword) || username.includes(keyword);
      })
      .slice(0, 10)
      .map((user) => ({
        value: user.name || user.username,
        label: (
          <div className="flex justify-between items-center">
            <span>{user.name}</span>
            <span className="text-xs text-gray-500">@{user.username}</span>
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

      // Lọc theo role
      if (filters.role) {
        filtered = filtered.filter((user) => user.role === filters.role);
      }

      // Lọc theo status
      if (filters.status) {
        filtered = filtered.filter((user) => user.status === filters.status);
      }

      // Lọc theo keyword
      if (keyword) {
        filtered = filtered.filter((user) => {
          const name = removeVietnameseTones(user.name || "");
          const username = removeVietnameseTones(user.username || "");
          return name.includes(keyword) || username.includes(keyword);
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

  const handleUpdateStatus = async (user) => {
    const newStatus = user.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    const result = await Swal.fire({
      title: `Bạn có chắc muốn ${
        newStatus === "LOCKED" ? "KHÓA" : "MỞ KHÓA"
      } tài khoản này?`,
      text: `Tài khoản: ${user.username}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DDB958",
      cancelButtonColor: "#d33",
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await UpdateUserStatus(user._id, newStatus);

      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          text: res.data.message || "Cập nhật trạng thái thành công",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchUsers();
      } else {
        Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
      }
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật trạng thái:", error);
      Swal.fire("Lỗi", "Đã xảy ra lỗi khi cập nhật trạng thái", "error");
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    if (user.role === newRole) return;

    const result = await Swal.fire({
      title: `Xác nhận thay đổi quyền?`,
      text: `${user.username}: ${user.role} → ${newRole}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DDB958",
      cancelButtonColor: "#d33",
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await UpdateUserRole(user._id, newRole);

      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Đã cập nhật quyền!",
          timer: 1500,
          showConfirmButton: false,
        });

        fetchUsers();
      } else {
        Swal.fire("Lỗi", "Không thể cập nhật quyền", "error");
      }
    } catch (error) {
      console.error("❌ Lỗi cập nhật quyền:", error);
      Swal.fire("Lỗi", "Đã xảy ra lỗi khi cập nhật quyền", "error");
    }
  };

  const columns = [
    {
      title: "Tài khoản",
      dataIndex: "username",
      sorter: (a, b) =>
        a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
      render: (text) => (text.length > 80 ? text.slice(0, 80) + "..." : text),
    },
    {
      title: "Tên người dùng",
      dataIndex: "name",
      sorter: (a, b) =>
        (a.name ?? "")
          .toLowerCase()
          .localeCompare((b.name ?? "").toLowerCase()),
      render: (text) => (text?.length > 50 ? text.slice(0, 50) + "..." : text),
    },
    {
      title: "Email",
      dataIndex: "email",
      render: (text) => (text?.length > 80 ? text.slice(0, 80) + "..." : text),
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      sorter: (a, b) => (a.phone ?? "").localeCompare(b.phone ?? ""),
      render: (text) => text || "—",
    },
    {
      title: "Loại người dùng",
      dataIndex: "role",
      sorter: (a, b) => (a.role ?? "").localeCompare(b.role ?? ""),
      align: "center",
      render: (_, user) => (
        <Select
          value={user.role}
          style={{ width: 150 }}
          onChange={(newRole) => handleUpdateRole(user, newRole)}
          options={[
            { value: "VOLUNTEER", label: "VOLUNTEER" },
            { value: "EVENTMANAGER", label: "EVENTMANAGER" },
            { value: "ADMIN", label: "ADMIN" },
          ]}
        />
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center",
      sorter: (a, b) => a.status.localeCompare(b.status),
      sortDirections: ["ascend", "descend"],
      render: (_, user) => (
        <div
          className="flex items-center justify-center gap-2 cursor-pointer select-none transition-transform duration-300 hover:scale-110"
          onClick={() => handleUpdateStatus(user)}
        >
          {user.status === "ACTIVE" ? (
            <>
              <UnlockOutlined style={{ color: "green", fontSize: 18 }} />
              <span style={{ color: "green", fontWeight: 500 }}>ACTIVE</span>
            </>
          ) : (
            <>
              <LockOutlined style={{ color: "red", fontSize: 18 }} />
              <span style={{ color: "red", fontWeight: 500 }}>LOCKED</span>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="adminUsers">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Quản lý người dùng</h2>
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => setExportModalVisible(true)}
            className="bg-green-600 hover:bg-green-700 border-green-600"
          >
            Xuất Dữ Liệu
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} type="default">
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
          placeholder="Tìm kiếm theo tài khoản hoặc tên"
          size="large"
          allowClear
          onClear={() => {
            setSearchValue("");
            setSearchOptions([]);
            searchKeyword("");
          }}
        />

        <Select
          placeholder="Loại người dùng"
          size="large"
          style={{ width: 180 }}
          allowClear
          value={filters.role || undefined}
          onChange={(value) => handleFilterChange("role", value)}
          options={[
            { value: "VOLUNTEER", label: "VOLUNTEER" },
            { value: "EVENTMANAGER", label: "EVENTMANAGER" },
            { value: "ADMIN", label: "ADMIN" },
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
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "LOCKED", label: "LOCKED" },
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

      {/* Export Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined style={{ color: "#1890ff" }} />
            <span className="font-semibold">Xuất Dữ Liệu Người Dùng</span>
          </Space>
        }
        open={exportModalVisible}
        onOk={handleExportUsers}
        onCancel={() => setExportModalVisible(false)}
        okText="Xuất dữ liệu"
        cancelText="Hủy"
        confirmLoading={exportLoading}
        width={500}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại người dùng
            </label>
            <Select
              value={exportUserType}
              onChange={setExportUserType}
              style={{ width: "100%" }}
              size="large"
            >
              <Select.Option value="all">
                <Space>
                  <UserOutlined />
                  <span>Toàn bộ người dùng</span>
                </Space>
              </Select.Option>
              <Select.Option value="volunteers">
                <Space>
                  <UserOutlined />
                  <span>Chỉ tình nguyện viên</span>
                </Space>
              </Select.Option>
            </Select>
          </div>

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
              thông tin{" "}
              {exportUserType === "volunteers"
                ? "tất cả tình nguyện viên và số sự kiện đã hoàn thành"
                : "tất cả người dùng trong hệ thống"}
              .
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
