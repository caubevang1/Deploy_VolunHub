import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Table,
  Progress,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Tabs,
  Badge,
  Empty,
  Skeleton,
  Tooltip,
  Popconfirm,
  Modal,
  Radio,
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FireOutlined,
  SearchOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  TrophyOutlined,
  BellOutlined,
} from "@ant-design/icons";
import {
  GetDashboardStats,
  GetEvents,
  GetUsers,
  GetPendingEvents,
  ApproveEvent,
  RejectEvent,
  DeleteEvent,
  UpdateUserStatus,
  GetTrendingEvents,
  GetRecentActivity,
  ExportUsers,
  ExportEvents,
  ExportVolunteers,
} from "../../services/AdminService";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function EnhancedDashboard() {
  // States
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    pendingEventsCount: 0,
    approvedEventsCount: 0,
    rejectedEventsCount: 0,
    completedEventsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);

  // Filters
  const [timeRange, setTimeRange] = useState(7); // days
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Loading states
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Export modal states
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportDataType, setExportDataType] = useState("users");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDateRange, setExportDateRange] = useState(null);

  // Reject modal states
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Danh sách lý do từ chối thường gặp
  const rejectReasons = [
    "Nội dung sự kiện không phù hợp với chính sách cộng đồng",
    "Thông tin sự kiện không đầy đủ hoặc không rõ ràng",
    "Thời gian tổ chức không hợp lý hoặc trùng lặp",
    "Địa điểm tổ chức không phù hợp hoặc không an toàn",
    "Mục tiêu sự kiện không mang tính tình nguyện",
    "Sự kiện có dấu hiệu lừa đảo hoặc vi phạm pháp luật",
  ];

  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentEvents(),
        fetchRecentUsers(),
        fetchPendingEvents(),
        fetchTrendingEvents(),
        fetchRecentActivity(),
      ]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await GetDashboardStats();
      if (res.status === 200) {
        console.log("Dashboard Stats:", res.data);
        setStats(res.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      throw error;
    }
  };

  const fetchRecentEvents = async () => {
    try {
      const res = await GetEvents();
      if (res.status === 200) {
        setRecentEvents(res.data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const res = await GetUsers();
      if (res.status === 200) {
        setRecentUsers(res.data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPendingEvents = async () => {
    setLoadingPending(true);
    try {
      const res = await GetPendingEvents();
      if (res.status === 200) {
        setPendingEvents(res.data);
      }
    } catch (error) {
      console.error("Error fetching pending events:", error);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchTrendingEvents = async () => {
    setLoadingTrending(true);
    try {
      const res = await GetTrendingEvents(timeRange);
      if (res.status === 200) {
        setTrendingEvents(res.data);
      }
    } catch (error) {
      console.error("Error fetching trending events:", error);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await GetRecentActivity();
      if (res.status === 200) {
        setRecentActivity(res.data);
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Actions
  const handleApproveEvent = async (eventId) => {
    try {
      await ApproveEvent(eventId);
      message.success("Đã phê duyệt sự kiện");
      fetchPendingEvents();
      fetchDashboardStats();
    } catch (error) {
      message.error("Không thể phê duyệt sự kiện");
    }
  };

  const handleRejectEventClick = (record) => {
    setSelectedEvent(record);
    setRejectModalVisible(true);
    setRejectReason("");
    setCustomReason("");
  };

  const confirmRejectEvent = async () => {
    if (!rejectReason && !customReason) {
      message.warning("Vui lòng chọn hoặc nhập lý do từ chối");
      return;
    }

    const finalReason = rejectReason === "custom" ? customReason : rejectReason;

    if (!finalReason.trim()) {
      message.warning("Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      await RejectEvent(selectedEvent._id, finalReason);
      message.success("Đã từ chối sự kiện");
      setRejectModalVisible(false);
      fetchPendingEvents();
      fetchDashboardStats();
    } catch (error) {
      message.error("Không thể từ chối sự kiện");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await DeleteEvent(eventId);
      message.success("Đã xóa sự kiện");
      fetchPendingEvents();
      fetchDashboardStats();
    } catch (error) {
      message.error("Không thể xóa sự kiện");
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "LOCKED" : "ACTIVE";
    try {
      await UpdateUserStatus(userId, newStatus);
      message.success(
        `Đã ${newStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản`
      );
      fetchRecentUsers();
    } catch (error) {
      message.error("Không thể cập nhật trạng thái người dùng");
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      let response;
      let filename;
      const timestamp = new Date().toISOString().split("T")[0];
      const extension = exportFormat === "json" ? "json" : "csv";

      // Build query params for date range
      let queryParams = exportFormat;
      if (exportDateRange && exportDateRange[0] && exportDateRange[1]) {
        const startDate = exportDateRange[0].format("YYYY-MM-DD");
        const endDate = exportDateRange[1].format("YYYY-MM-DD");
        queryParams = `${exportFormat}&startDate=${startDate}&endDate=${endDate}`;
      }

      // Determine which export function to call
      switch (exportDataType) {
        case "users":
          response = await ExportUsers(queryParams);
          filename = `users-export-${timestamp}.${extension}`;
          break;
        case "events":
          response = await ExportEvents(queryParams);
          filename = `events-export-${timestamp}.${extension}`;
          break;
        case "volunteers":
          response = await ExportVolunteers(queryParams);
          filename = `volunteers-export-${timestamp}.${extension}`;
          break;
        default:
          throw new Error("Invalid export type");
      }

      // Create download link
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

  // Mappings
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

  const statusConfig = {
    pending: { text: "Chờ duyệt", color: "warning" },
    approved: { text: "Đã duyệt", color: "success" },
    rejected: { text: "Từ chối", color: "error" },
    completed: { text: "Hoàn thành", color: "processing" },
  };

  const roleMapping = {
    VOLUNTEER: "Tình nguyện viên",
    EVENTMANAGER: "Quản lý sự kiện",
    ADMIN: "Quản trị viên",
  };

  // Calculations
  const approvedCount =
    stats.totalEvents - stats.rejectedEventsCount - stats.pendingEventsCount;
  const approvalRate =
    stats.totalEvents > 0
      ? Math.round((approvedCount / stats.totalEvents) * 100)
      : 0;
  const completionRate =
    stats.totalEvents > 0
      ? Math.round((stats.completedEventsCount / stats.totalEvents) * 100)
      : 0;
  const rejectionRate =
    stats.totalEvents > 0
      ? Math.round((stats.rejectedEventsCount / stats.totalEvents) * 100)
      : 0;

  // Table Columns
  const pendingColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      filteredValue: [searchText],
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()),
      render: (text, record) => (
        <a
          onClick={() => navigate(`/admin/su-kien/${record._id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Loại",
      dataIndex: "category",
      key: "category",
      filters: Object.keys(categoryMapping).map((key) => ({
        text: categoryMapping[key],
        value: key,
      })),
      onFilter: (value, record) => record.category === value,
      render: (category) => categoryMapping[category] || category,
    },
    {
      title: "Người tạo",
      dataIndex: ["createdBy", "name"],
      key: "createdBy",
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Phê duyệt">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              onClick={() => handleApproveEvent(record._id)}
            />
          </Tooltip>
          <Tooltip title="Từ chối">
            <Button
              danger
              icon={<CloseCircleOutlined />}
              size="small"
              onClick={() => handleRejectEventClick(record)}
            />
          </Tooltip>
          <Tooltip title="Xem chi tiết">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => navigate(`/admin/su-kien/${record._id}`)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa sự kiện này?"
              onConfirm={() => handleDeleteEvent(record._id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const trendingColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          <TrophyOutlined style={{ color: "#faad14" }} />
          <a onClick={() => navigate(`/admin/su-kien/${record._id}`)}>{text}</a>
        </Space>
      ),
    },
    {
      title: "Đăng ký",
      dataIndex: "recentRegistrations",
      key: "recentRegistrations",
      render: (count) => <Badge count={count} showZero color="blue" />,
    },
    {
      title: "Lượt thích",
      dataIndex: "recentLikes",
      key: "recentLikes",
      render: (count) => <Badge count={count} showZero color="magenta" />,
    },
    {
      title: "Lượt chia sẻ",
      dataIndex: "recentShares",
      key: "recentShares",
      render: (count) => <Badge count={count} showZero color="cyan" />,
    },
    {
      title: "Điểm xu hướng",
      dataIndex: "trendingScore",
      key: "trendingScore",
      render: (score) => <Tag color="volcano">{score}</Tag>,
      sorter: (a, b) => a.trendingScore - b.trendingScore,
    },
  ];

  const userColumns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      filters: [
        { text: "Tình nguyện viên", value: "VOLUNTEER" },
        { text: "Quản lý sự kiện", value: "EVENTMANAGER" },
        { text: "Quản trị viên", value: "ADMIN" },
      ],
      onFilter: (value, record) => record.role === value,
      render: (role) => (
        <Tag
          color={
            role === "ADMIN"
              ? "red"
              : role === "EVENTMANAGER"
              ? "blue"
              : "default"
          }
        >
          {roleMapping[role] || role}
        </Tag>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Badge
          status={status === "ACTIVE" ? "success" : "error"}
          text={status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
        />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_, record) => (
        <Tooltip title={record.status === "ACTIVE" ? "Khóa" : "Mở khóa"}>
          <Button
            type={record.status === "ACTIVE" ? "default" : "primary"}
            icon={
              record.status === "ACTIVE" ? <LockOutlined /> : <UnlockOutlined />
            }
            size="small"
            onClick={() => handleToggleUserStatus(record._id, record.status)}
          />
        </Tooltip>
      ),
    },
  ];

  // Error State
  if (error && !loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[500px]">
        <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
        <p className="text-gray-600 mt-4">{error}</p>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={fetchAllData}
          className="mt-4"
        >
          Thử lại
        </Button>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="dashboard-container p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <Row justify="space-between" align="middle" className="mb-6">
        <Col>
          <h2 className="text-3xl font-bold text-gray-800">
            Dashboard Quản Trị Viên
          </h2>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => setExportModalVisible(true)}
              className="bg-green-600 hover:bg-green-700 border-green-600"
            >
              Xuất Dữ Liệu
            </Button>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 150 }}
            >
              <Option value={7}>7 ngày qua</Option>
              <Option value={30}>30 ngày qua</Option>
              <Option value={90}>90 ngày qua</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchAllData}>
              Làm mới
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #1890ff" }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Tổng Người Dùng
                </span>
              }
              value={stats.totalUsers}
              prefix={<UserOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #52c41a" }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Tổng Sự Kiện</span>
              }
              value={stats.totalEvents}
              prefix={<CalendarOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #faad14" }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Chờ Duyệt
                </span>
              }
              value={stats.pendingEventsCount}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #52c41a" }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Đã Duyệt
                </span>
              }
              value={approvedCount}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Progress Bars */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                <span className="font-semibold">Tỷ Lệ Phê Duyệt</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #52c41a" }}
          >
            <Progress
              percent={approvalRate}
              strokeColor={{ "0%": "#52c41a", "100%": "#95de64" }}
              format={(percent) => `${percent}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-green-600">{approvedCount}</span>{" "}
              / {stats.totalEvents} sự kiện
            </p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: "#1890ff" }} />
                <span className="font-semibold">Tỷ Lệ Hoàn Thành</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #1890ff" }}
          >
            <Progress
              percent={completionRate}
              strokeColor={{ "0%": "#1890ff", "100%": "#69c0ff" }}
              format={(percent) => `${percent}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-blue-600">
                {stats.completedEventsCount || 0}
              </span>{" "}
              / {stats.totalEvents} sự kiện
            </p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                <span className="font-semibold">Tỷ Lệ Từ Chối</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #ff4d4f" }}
          >
            <Progress
              percent={rejectionRate}
              strokeColor={{ "0%": "#ff4d4f", "100%": "#ff7875" }}
              format={(percent) => `${percent}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-red-600">
                {stats.rejectedEventsCount || 0}
              </span>{" "}
              / {stats.totalEvents} sự kiện
            </p>
          </Card>
        </Col>
      </Row>

      {/* Pending Approvals Section */}
      <div className="mt-8">
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <span className="font-semibold text-lg">Sự Kiện Chờ Duyệt</span>
              <Badge count={pendingEvents.length} showZero />
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
          extra={
            <Input
              placeholder="Tìm kiếm sự kiện..."
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
          }
        >
          {loadingPending ? (
            <Skeleton active />
          ) : pendingEvents.length === 0 ? (
            <Empty description="Không có sự kiện chờ duyệt" />
          ) : (
            <Table
              dataSource={pendingEvents}
              columns={pendingColumns}
              rowKey="_id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          )}
        </Card>
      </div>

      {/* Trending Events */}
      <div className="mt-8">
        <Card
          title={
            <Space>
              <FireOutlined style={{ color: "#ff4d4f" }} />
              <span className="font-semibold text-lg">
                Sự Kiện Đang Trending
              </span>
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
        >
          {loadingTrending ? (
            <Skeleton active />
          ) : trendingEvents.length === 0 ? (
            <Empty description="Chưa có sự kiện trending" />
          ) : (
            <Table
              dataSource={trendingEvents}
              columns={trendingColumns}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <BellOutlined style={{ color: "#52c41a" }} />
                  <span className="font-semibold">Sự Kiện Mới Công Bố</span>
                </Space>
              }
              className="shadow-md hover:shadow-lg transition-shadow"
              style={{ minHeight: 300, borderRadius: 8 }}
            >
              {loadingActivity ? (
                <Skeleton active />
              ) : !recentActivity?.recentlyPublished?.length ? (
                <Empty description="Chưa có sự kiện mới" />
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {recentActivity.recentlyPublished.map((event) => (
                    <li key={event._id}>
                      <a
                        onClick={() => navigate(`/admin/su-kien/${event._id}`)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        {event.name}
                      </a>
                      <span className="text-gray-500 text-sm ml-2">
                        {dayjs(event.updatedAt).format("DD/MM HH:mm")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <BellOutlined style={{ color: "#1890ff" }} />
                  <span className="font-semibold">Bài Đăng Thảo Luận Mới</span>
                </Space>
              }
              className="shadow-md hover:shadow-lg transition-shadow"
              style={{ minHeight: 300, borderRadius: 8 }}
            >
              {loadingActivity ? (
                <Skeleton active />
              ) : !recentActivity?.recentPosts?.length ? (
                <Empty description="Chưa có bài đăng mới" />
              ) : (
                <ul className="list-disc pl-5 space-y-2">
                  {recentActivity.recentPosts.slice(0, 5).map((post) => (
                    <li key={post._id}>
                      <span className="font-medium">{post.event?.name}</span>
                      <br />
                      <span className="text-gray-500 text-sm">
                        {post.author?.name} -{" "}
                        {dayjs(post.createdAt).format("DD/MM HH:mm")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Recent Users Table */}
      <div className="mt-8">
        <Card
          title={
            <Space>
              <UserOutlined style={{ color: "#1890ff" }} />
              <span className="font-semibold text-lg">Người Dùng Mới Nhất</span>
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
          extra={
            <Button
              type="link"
              onClick={() => navigate("/admin/nguoi-dung")}
              className="text-blue-600 hover:text-blue-800"
            >
              Xem tất cả →
            </Button>
          }
        >
          <Table
            dataSource={recentUsers}
            columns={userColumns}
            rowKey="_id"
            pagination={false}
            size="small"
          />
        </Card>
      </div>

      {/* Export Modal */}
      <Modal
        title={
          <Space>
            <DownloadOutlined style={{ color: "#1890ff" }} />
            <span className="font-semibold">Xuất Dữ Liệu</span>
          </Space>
        }
        open={exportModalVisible}
        onOk={handleExportData}
        onCancel={() => setExportModalVisible(false)}
        okText="Xuất dữ liệu"
        cancelText="Hủy"
        confirmLoading={exportLoading}
        width={500}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại dữ liệu
            </label>
            <Select
              value={exportDataType}
              onChange={setExportDataType}
              style={{ width: "100%" }}
              size="large"
            >
              <Option value="users">
                <Space>
                  <UserOutlined />
                  <span>Tất cả người dùng</span>
                </Space>
              </Option>
              <Option value="events">
                <Space>
                  <CalendarOutlined />
                  <span>Danh sách sự kiện</span>
                </Space>
              </Option>
              <Option value="volunteers">
                <Space>
                  <TrophyOutlined />
                  <span>Tình nguyện viên</span>
                </Space>
              </Option>
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
              <Option value="csv">
                <Space>
                  <DownloadOutlined />
                  <span>CSV (Excel)</span>
                </Space>
              </Option>
              <Option value="json">
                <Space>
                  <DownloadOutlined />
                  <span>JSON</span>
                </Space>
              </Option>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> File sẽ được tải về máy tính của bạn
              {exportDataType === "users" &&
                " với thông tin tất cả người dùng trong hệ thống."}
              {exportDataType === "events" && " với thông tin tất cả sự kiện."}
              {exportDataType === "volunteers" &&
                " với thông tin tình nguyện viên và số sự kiện đã hoàn thành."}
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal từ chối sự kiện */}
      <Modal
        title={<span className="text-lg font-semibold">Từ chối sự kiện</span>}
        open={rejectModalVisible}
        onOk={confirmRejectEvent}
        onCancel={() => setRejectModalVisible(false)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        width={600}
      >
        {selectedEvent && (
          <div className="mb-4">
            <p className="font-medium text-gray-700">
              Sự kiện: {selectedEvent.name}
            </p>
          </div>
        )}

        <p className="mb-3 font-medium">Vui lòng chọn lý do từ chối:</p>

        <Radio.Group
          onChange={(e) => {
            setRejectReason(e.target.value);
            if (e.target.value !== "custom") {
              setCustomReason("");
            }
          }}
          value={rejectReason}
          className="w-full"
        >
          <Space direction="vertical" className="w-full">
            {rejectReasons.map((reason, index) => (
              <Radio key={index} value={reason} className="text-sm">
                {reason}
              </Radio>
            ))}
            <Radio value="custom">Lý do khác (nhập bên dưới)</Radio>
          </Space>
        </Radio.Group>

        {rejectReason === "custom" && (
          <Input.TextArea
            className="mt-3"
            rows={3}
            placeholder="Nhập lý do từ chối..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            maxLength={200}
            showCount
          />
        )}
      </Modal>
    </div>
  );
}
