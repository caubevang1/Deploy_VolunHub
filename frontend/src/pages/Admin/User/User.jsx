import { useState, useEffect, useCallback } from "react";
import { Table, Input, Button, message, Select } from "antd";
import { debounce } from "lodash";
import {
  GetUsers,
  UpdateUserStatus,
  UpdateUserRole,
} from "../../../services/AdminService";
import {
  ReloadOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import Swal from "sweetalert2";

const { Search } = Input;

export default function Users() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

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

  const removeVietnameseTones = (str) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const applyFilters = useCallback(
    (searchValue = "", role = selectedRole, status = selectedStatus) => {
      let filtered = [...originalData];

      if (role) {
        filtered = filtered.filter((user) => user.role === role);
      }

      if (status) {
        filtered = filtered.filter((user) => user.status === status);
      }

      if (searchValue) {
        const keyword = removeVietnameseTones(searchValue.trim().toLowerCase());
        filtered = filtered.filter((user) => {
          const name = removeVietnameseTones(user.name || "");
          const username = removeVietnameseTones(user.username || "");
          return name.includes(keyword) || username.includes(keyword);
        });
      }

      setData(filtered);
    },
    [originalData, selectedRole, selectedStatus]
  );

  const searchKeyword = useCallback(
    debounce((value) => {
      applyFilters(value);
    }, 300),
    [applyFilters]
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedRole, selectedStatus, applyFilters]);

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
      render: (_, user) => {
        const roleColors = {
          VOLUNTEER: "#3b82f6",
          EVENTMANAGER: "#f59e0b",
          ADMIN: "#ef4444",
        };
        return (
          <Select
            value={user.role}
            style={{
              width: 170,
              fontWeight: 600,
            }}
            onChange={(newRole) => handleUpdateRole(user, newRole)}
            options={[
              { value: "VOLUNTEER", label: "👥 VOLUNTEER" },
              { value: "EVENTMANAGER", label: "📅 EVENTMANAGER" },
              { value: "ADMIN", label: "🔑 ADMIN" },
            ]}
          />
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      align: "center",
      sorter: (a, b) => a.status.localeCompare(b.status),
      sortDirections: ["ascend", "descend"],
      render: (_, user) => (
        <Button
          type="primary"
          icon={
            user.status === "ACTIVE" ? <UnlockOutlined /> : <LockOutlined />
          }
          onClick={() => handleUpdateStatus(user)}
          className="transition-all duration-300 hover:scale-105"
          style={{
            backgroundColor: user.status === "ACTIVE" ? "#52c41a" : "#ff4d4f",
            borderColor: user.status === "ACTIVE" ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
          }}
        >
          {user.status === "ACTIVE" ? "ACTIVE" : "LOCKED"}
        </Button>
      ),
    },
  ];

  return (
    <div className="adminUsers p-6 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-gray-800">
            Quản Lý Người Dùng
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-3">
          <Search
            className="flex-1 shadow-sm"
            placeholder="Tìm kiếm theo tài khoản hoặc tên..."
            size="large"
            onChange={(e) => searchKeyword(e.target.value)}
            allowClear
            style={{ borderRadius: 8 }}
          />
          <select
            className="px-4 py-2 border rounded-lg text-base cursor-pointer hover:border-blue-500 transition-colors"
            style={{ minWidth: 180 }}
            value={selectedRole || ""}
            onChange={(e) => setSelectedRole(e.target.value || null)}
          >
            <option value="">Tất cả vai trò</option>
            <option value="VOLUNTEER">Tình nguyện viên</option>
            <option value="EVENTMANAGER">Quản lý sự kiện</option>
            <option value="ADMIN">Quản trị viên</option>
          </select>
          <select
            className="px-4 py-2 border rounded-lg text-base cursor-pointer hover:border-blue-500 transition-colors"
            style={{ minWidth: 150 }}
            value={selectedStatus || ""}
            onChange={(e) => setSelectedStatus(e.target.value || null)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
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
            showTotal: (total) => `Tổng ${total} người dùng`,
          }}
          className="rounded-md"
        />
      </div>
    </div>
  );
}
