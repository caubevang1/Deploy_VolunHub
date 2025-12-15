import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Button, message, Select } from 'antd';
import { debounce } from 'lodash';
import { GetUsers, UpdateUserStatus, UpdateUserRole } from '../../../services/AdminService';
import { ReloadOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';

const { Search } = Input;

export default function Users() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await GetUsers();
      if (res.status === 200) {
        setData(res.data);
        setOriginalData(res.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng:', error);
      message.error('Không thể tải danh sách người dùng');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
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

      let filtered = [...originalData];

      // Lọc theo role
      if (filters.role) {
        filtered = filtered.filter(user => user.role === filters.role);
      }

      // Lọc theo status
      if (filters.status) {
        filtered = filtered.filter(user => user.status === filters.status);
      }

      // Lọc theo keyword
      if (keyword) {
        filtered = filtered.filter(user => {
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
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Áp dụng filter khi filters thay đổi
  useEffect(() => {
    searchKeyword('');
  }, [filters, searchKeyword]);

  const handleUpdateStatus = async (user) => {
    const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const result = await Swal.fire({
      title: `Bạn có chắc muốn ${newStatus === 'LOCKED' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản này?`,
      text: `Tài khoản: ${user.username}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DDB958',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await UpdateUserStatus(user._id, newStatus);

      if (res.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: res.data.message || 'Cập nhật trạng thái thành công',
          timer: 1500,
          showConfirmButton: false,
        });
        fetchUsers();
      } else {
        Swal.fire('Lỗi', 'Không thể cập nhật trạng thái', 'error');
      }
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật trạng thái:', error);
      Swal.fire('Lỗi', 'Đã xảy ra lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const handleUpdateRole = async (user, newRole) => {
    if (user.role === newRole) return;

    const result = await Swal.fire({
      title: `Xác nhận thay đổi quyền?`,
      text: `${user.username}: ${user.role} → ${newRole}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DDB958',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await UpdateUserRole(user._id, newRole);

      if (res.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Đã cập nhật quyền!',
          timer: 1500,
          showConfirmButton: false,
        });

        fetchUsers();
      } else {
        Swal.fire('Lỗi', 'Không thể cập nhật quyền', 'error');
      }
    } catch (error) {
      console.error('❌ Lỗi cập nhật quyền:', error);
      Swal.fire('Lỗi', 'Đã xảy ra lỗi khi cập nhật quyền', 'error');
    }
  };

  const columns = [
    {
      title: 'Tài khoản',
      dataIndex: 'username',
      sorter: (a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
      render: text => text.length > 80 ? text.slice(0, 80) + '...' : text,
    },
    {
      title: 'Tên người dùng',
      dataIndex: 'name',
      sorter: (a, b) => (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase()),
      render: text => text?.length > 50 ? text.slice(0, 50) + '...' : text,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: text => text?.length > 80 ? text.slice(0, 80) + '...' : text,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      sorter: (a, b) => (a.phone ?? '').localeCompare(b.phone ?? ''),
      render: text => text || '—'
    },
    {
      title: 'Loại người dùng',
      dataIndex: 'role',
      sorter: (a, b) => (a.role ?? '').localeCompare(b.role ?? ''),
      align: 'center',
      render: (_, user) => (
        <Select
          value={user.role}
          style={{ width: 150 }}
          onChange={(newRole) => handleUpdateRole(user, newRole)}
          options={[
            { value: 'VOLUNTEER', label: 'VOLUNTEER' },
            { value: 'EVENTMANAGER', label: 'EVENTMANAGER' },
            { value: 'ADMIN', label: 'ADMIN' },
          ]}
        />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      align: 'center',
      sorter: (a, b) => a.status.localeCompare(b.status),
      sortDirections: ['ascend', 'descend'],
      render: (_, user) => (
        <div
          className="flex items-center justify-center gap-2 cursor-pointer select-none transition-transform duration-300 hover:scale-110"
          onClick={() => handleUpdateStatus(user)}
        >
          {user.status === 'ACTIVE' ? (
            <>
              <UnlockOutlined style={{ color: 'green', fontSize: 18 }} />
              <span style={{ color: 'green', fontWeight: 500 }}>ACTIVE</span>
            </>
          ) : (
            <>
              <LockOutlined style={{ color: 'red', fontSize: 18 }} />
              <span style={{ color: 'red', fontWeight: 500 }}>LOCKED</span>
            </>
          )}
        </div>
      ),
    }

  ];


  return (
    <div className="adminUsers">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Quản lý người dùng</h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          type="default"
        >
          Tải lại
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Search
          className="flex-1"
          placeholder="Tìm kiếm theo tài khoản hoặc tên"
          size="large"
          onChange={e => searchKeyword(e.target.value)}
        />

        <Select
          placeholder="Loại người dùng"
          size="large"
          style={{ width: 180 }}
          allowClear
          value={filters.role || undefined}
          onChange={(value) => handleFilterChange('role', value)}
          options={[
            { value: 'VOLUNTEER', label: 'VOLUNTEER' },
            { value: 'EVENTMANAGER', label: 'EVENTMANAGER' },
            { value: 'ADMIN', label: 'ADMIN' },
          ]}
        />

        <Select
          placeholder="Trạng thái"
          size="large"
          style={{ width: 150 }}
          allowClear
          value={filters.status || undefined}
          onChange={(value) => handleFilterChange('status', value)}
          options={[
            { value: 'ACTIVE', label: 'ACTIVE' },
            { value: 'LOCKED', label: 'LOCKED' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        className='shadow shadow-md rounded-md'
      />
    </div>
  );
}
