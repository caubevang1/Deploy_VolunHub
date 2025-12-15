import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Button, message, Tag, Select } from 'antd';
import { debounce } from 'lodash';
import { GetEvents, DeleteEvent } from '../../../services/AdminService';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

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
    category: '',
    status: '',
  });

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
      console.error('Lỗi khi lấy danh sách sự kiện:', error);
      message.error('Không thể tải danh sách sự kiện');
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

      let filtered = [...originalData];

      // Lọc theo category
      if (filters.category) {
        filtered = filtered.filter(event => event.category === filters.category);
      }

      // Lọc theo status
      if (filters.status) {
        filtered = filtered.filter(event => event.status === filters.status);
      }

      // Lọc theo keyword
      if (keyword) {
        filtered = filtered.filter(event => {
          const name = removeVietnameseTones(event.name || "");
          return name.includes(keyword);
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

  const handleDeleteEvent = async (eventId, name) => {
    const result = await Swal.fire({
      title: `Xác nhận xóa sự kiện?`,
      text: name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DDB958',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await DeleteEvent(eventId);
      if (res.status === 200) {
        Swal.fire('Đã xóa!', '', 'success');
        fetchEvents();
      } else {
        Swal.fire('Lỗi', 'Không thể xóa sự kiện', 'error');
      }
    } catch (error) {
      Swal.fire('Lỗi', 'Đã xảy ra lỗi khi xóa sự kiện', 'error');
    }
  };

  const handleEventDetail = (eventId) => {
    navigate(`/admin/su-kien/${eventId}`);
  };

  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'name',
      sorter: (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
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
      )
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
    },
    {
      title: 'Loại sự kiện',
      dataIndex: 'category',
      render: (category) => categoryMapping[category] || category,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        const color = {
          pending: '!text-[#DDB958]',
          completed: '!text-blue-500',
          approved: '!text-green-500',
          rejected: '!text-red-500'
        }[status] || '!text-gray-500';
        return (
          <Tag className={`ml-0 pl-0 !border-none !bg-transparent !font-semibold !text-[15px] ${color}`}>
            {statusMapping[status] || status}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      align: 'center',
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
      )
    }
  ];

  return (
    <div className="adminEvents">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl uppercase font-bold">Quản lý sự kiện</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchEvents}>
          Tải lại
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Search
          className="flex-1"
          placeholder="Tìm kiếm theo tên sự kiện"
          size="large"
          onChange={(e) => searchKeyword(e.target.value)}
        />

        <Select
          placeholder="Loại sự kiện"
          size="large"
          style={{ width: 180 }}
          allowClear
          value={filters.category || undefined}
          onChange={(value) => handleFilterChange('category', value)}
          options={[
            { value: 'Community', label: 'Cộng đồng' },
            { value: 'Education', label: 'Giáo dục' },
            { value: 'Healthcare', label: 'Sức khỏe' },
            { value: 'Environment', label: 'Môi trường' },
            { value: 'EventSupport', label: 'Sự kiện' },
            { value: 'Technical', label: 'Kỹ thuật' },
            { value: 'Emergency', label: 'Cứu trợ khẩn cấp' },
            { value: 'Online', label: 'Trực tuyến' },
            { value: 'Corporate', label: 'Doanh nghiệp' },
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
            { value: 'approved', label: 'Đã duyệt' },
            { value: 'rejected', label: 'Từ chối' },
            { value: 'completed', label: 'Hoàn thành' },
            { value: 'pending', label: 'Chờ duyệt' },
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
    </div>
  );
}
