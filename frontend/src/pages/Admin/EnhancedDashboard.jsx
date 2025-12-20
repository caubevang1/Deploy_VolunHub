import { useState, useEffect, useCallback } from "react";
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
  Badge,
  Empty,
  Skeleton,
  Tooltip,
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
  DownloadOutlined,
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
  const [errorState, setErrorState] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]); // Sẽ chứa TOÀN BỘ danh sách
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState(null);

  // Filters
  const [timeRange, setTimeRange] = useState(7); // days

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

  const rejectReasons = [
    "Nội dung sự kiện không phù hợp với chính sách cộng đồng",
    "Thông tin sự kiện không đầy đủ hoặc không rõ ràng",
    "Thời gian tổ chức không hợp lý hoặc trùng lặp",
    "Địa điểm tổ chức không phù hợp hoặc không an toàn",
    "Mục tiêu sự kiện không mang tính tình nguyện",
    "Sự kiện có dấu hiệu lừa đảo hoặc vi phạm pháp luật",
  ];

  const navigate = useNavigate();

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

  const roleMapping = {
    VOLUNTEER: "Tình nguyện viên",
    EVENTMANAGER: "Quản lý sự kiện",
    ADMIN: "Quản trị viên",
  };

  // --- Fetch Functions ---
  const fetchDashboardStats = async () => {
    try {
      const res = await GetDashboardStats();
      if (res.status === 200) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Lỗi tải stats:", err);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const res = await GetUsers();
      if (res.status === 200) {
        setRecentUsers(res.data.slice(0, 5));
      }
    } catch (err) {
      console.error("Lỗi tải người dùng:", err);
    }
  };

  const fetchPendingEvents = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await GetPendingEvents();
      if (res.status === 200) {
        // FIX: Lưu toàn bộ danh sách để có tổng số lượng chính xác
        setPendingEvents(res.data);
      }
    } catch (err) {
      console.error("Lỗi tải sự kiện chờ duyệt:", err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchTrendingEvents = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const res = await GetTrendingEvents(timeRange);
      if (res.status === 200) {
        setTrendingEvents(res.data);
      }
    } catch (err) {
      console.error("Lỗi tải trending:", err);
    } finally {
      setLoadingTrending(false);
    }
  }, [timeRange]);

  const fetchRecentActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await GetRecentActivity();
      if (res.status === 200) {
        setRecentActivity(res.data);
      }
    } catch (err) {
      console.error("Lỗi tải hoạt động:", err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setErrorState(null);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchRecentUsers(),
        fetchPendingEvents(),
        fetchTrendingEvents(),
        fetchRecentActivity(),
      ]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setErrorState("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }, [fetchPendingEvents, fetchTrendingEvents, fetchRecentActivity]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Actions ---
  const handleApproveEvent = async (eventId) => {
    try {
      await ApproveEvent(eventId);
      message.success("Đã phê duyệt sự kiện");
      fetchPendingEvents();
      fetchDashboardStats();
    } catch (err) {
      console.error("Approve error:", err);
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
      await RejectEvent(selectedEvent.id, finalReason);
      message.success("Đã từ chối sự kiện");
      setRejectModalVisible(false);
      fetchPendingEvents();
      fetchDashboardStats();
    } catch (err) {
      console.error("Reject error:", err);
      message.error("Không thể từ chối sự kiện");
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
    } catch (err) {
      console.error("Toggle status error:", err);
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

      let queryParams = exportFormat;
      if (exportDateRange && exportDateRange[0] && exportDateRange[1]) {
        const startDate = exportDateRange[0].format("YYYY-MM-DD");
        const endDate = exportDateRange[1].format("YYYY-MM-DD");
        queryParams = `${exportFormat}&startDate=${startDate}&endDate=${endDate}`;
      }

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
    } catch (err) {
      console.error("Export error:", err);
      message.error("Không thể xuất dữ liệu.");
    } finally {
      setExportLoading(false);
    }
  };

  const approvalRate =
    stats.totalEvents > 0
      ? Math.round(
          ((stats.approvedEventsCount + stats.completedEventsCount) /
            stats.totalEvents) *
            100
        )
      : 0;

  const completionRate =
    stats.approvedEventsCount + stats.completedEventsCount > 0
      ? Math.round(
          (stats.completedEventsCount /
            (stats.approvedEventsCount + stats.completedEventsCount)) *
            100
        )
      : 0;

  const rejectionRate =
    stats.rejectedEventsCount +
      stats.approvedEventsCount +
      stats.completedEventsCount >
    0
      ? Math.round(
          (stats.rejectedEventsCount /
            (stats.rejectedEventsCount +
              stats.approvedEventsCount +
              stats.completedEventsCount)) *
            100
        )
      : 0;

  const pendingColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/admin/su-kien/${record.id}`)}
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
    },
    {
      title: "Hành động",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <div className="flex flex-col gap-2 items-center">
          <Button
            type="primary"
            className="!bg-green-500 !hover:bg-green-600 !border-none !font-semibold w-24"
            size="small"
            onClick={() => handleApproveEvent(record.id)}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            className="!bg-red-500 !hover:bg-red-600 !border-none !text-white !font-semibold w-24"
            onClick={() => handleRejectEventClick(record)}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  const trendingColumns = [
    {
      title: "STT",
      key: "index",
      align: "center",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a onClick={() => navigate(`/admin/su-kien/${record.id}`)} className="font-semibold">
          {text}
        </a>
      ),
    },
    {
      title: "Đăng ký",
      dataIndex: "recentRegistrations",
      align: "center",
      render: (count) => <Badge count={count} showZero color="blue" />,
    },
    {
      title: "Lượt thích",
      dataIndex: "recentLikes",
      align: "center",
      render: (count) => <Badge count={count} showZero color="magenta" />,
    },
    {
      title: "Lượt chia sẻ",
      dataIndex: "recentShares",
      align: "center",
      render: (count) => <Badge count={count} showZero color="cyan" />,
    },
    {
      title: "Điểm xu hướng",
      dataIndex: "trendingScore",
      align: "center",
      render: (score) => <Tag color="volcano">{score}</Tag>,
    },
  ];

  const userColumns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="font-medium">{text}</span>,
    },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "ADMIN" ? "red" : role === "EVENTMANAGER" ? "blue" : "default"}>
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
            icon={record.status === "ACTIVE" ? <LockOutlined /> : <UnlockOutlined />}
            size="small"
            onClick={() => handleToggleUserStatus(record.id, record.status)}
          />
        </Tooltip>
      ),
    },
  ];

  if (errorState && !loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[500px]">
        <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
        <p className="text-gray-600 mt-4">{errorState}</p>
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

  if (loading) {
    return (
      <div className="dashboard-container p-6 bg-gray-50 min-h-screen">
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-container p-6 bg-gray-50 min-h-screen">
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

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={12}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #1890ff", borderRadius: 8 }}
            onClick={() => navigate("/admin/nguoi-dung")}
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
        <Col xs={24} sm={12} lg={12}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien")}
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
      </Row>
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #faad14", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien/cho-duyet")}
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
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien?status=approved")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Đã Duyệt
                </span>
              }
              value={stats.approvedEventsCount}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #ff4d4f", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien?status=rejected")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Bị Từ Chối
                </span>
              }
              value={stats.rejectedEventsCount}
              prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
              valueStyle={{ color: "#ff4d4f", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #722ed1", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien?status=completed")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Đã Hoàn Thành
                </span>
              }
              value={stats.completedEventsCount}
              prefix={<TrophyOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1", fontWeight: "bold" }}
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
              format={(p) => `${p}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-green-600">
                {stats.approvedEventsCount + stats.completedEventsCount}
              </span>{" "}
              / {stats.totalEvents} sự kiện
            </p>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: "#1890ff" }} />
                <span className="font-semibold">Tỷ Lệ Hoàn Thành</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #1890ff" }}
          >
            <Progress
              percent={completionRate}
              strokeColor={{ "0%": "#1890ff", "100%": "#69c0ff" }}
              format={(p) => `${p}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-blue-600">
                {stats.completedEventsCount || 0}
              </span>{" "}
              / {stats.approvedEventsCount + stats.completedEventsCount} sự kiện
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
              format={(p) => `${p}%`}
              strokeWidth={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-red-600">
                {stats.rejectedEventsCount || 0}
              </span>{" "}
              /{" "}
              {stats.rejectedEventsCount +
                stats.approvedEventsCount +
                stats.completedEventsCount}{" "}
              sự kiện
            </p>
          </Card>
        </Col>
      </Row>

      {/* Pending Table */}
      <div className="mt-8">
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <span className="font-semibold text-lg">Sự Kiện Chờ Duyệt</span>
              {/* FIX: Sử dụng pendingEvents.length để hiển thị con số chính xác */}
              <Badge
                count={pendingEvents.length}
                showZero
                style={{ marginLeft: 8 }}
              />
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
          extra={
            <Button
              type="link"
              onClick={() => navigate("/admin/su-kien/cho-duyet")}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Xem tất cả →
            </Button>
          }
        >
          {loadingPending ? (
            <Skeleton active />
          ) : (
            <Table
              dataSource={pendingEvents.slice(0, 5)}
              columns={pendingColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>

      {/* Trending Table */}
      <div className="mt-8">
        <Card
          title={
            <Space>
              <FireOutlined style={{ color: "#ff4d4f" }} />
              <span className="font-semibold text-lg">Sự Kiện Đang Trending</span>
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
        >
          {loadingTrending ? (
            <Skeleton active />
          ) : (
            <Table
              dataSource={trendingEvents}
              columns={trendingColumns}
              rowKey="id"
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
                    <li key={event.id}>
                      <a
                        onClick={() => navigate(`/admin/su-kien/${event.id}`)}
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
                    <li key={post.id}>
                      <a
                        onClick={() => {
                          if (post.event?.id) {
                            navigate(`/admin/su-kien/${post.event.id}/trao-doi#${post.id}`);
                          }
                        }}
                        className="cursor-pointer hover:text-blue-600"
                      >
                        <span className="font-medium">{post.event?.name || "Sự kiện không xác định"}</span>
                        <br />
                        <span className="text-gray-500 text-sm">
                          {post.author?.name} -{" "}
                          {dayjs(post.createdAt).format("DD/MM HH:mm")}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Recent Users */}
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
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      </div>

      {/* Modals */}
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
                <UserOutlined /> Tất cả người dùng
              </Option>
              <Option value="events">
                <CalendarOutlined /> Danh sách sự kiện
              </Option>
              <Option value="volunteers">
                <TrophyOutlined /> Tình nguyện viên
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
                <DownloadOutlined /> CSV (Excel)
              </Option>
              <Option value="json">
                <DownloadOutlined /> JSON
              </Option>
            </Select>
          </div>
        </div>
      </Modal>

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
            <p className="font-medium text-gray-700">Sự kiện: {selectedEvent.name}</p>
          </div>
        )}
        <p className="mb-3 font-medium">Vui lòng chọn lý do từ chối:</p>
        <Radio.Group
          onChange={(e) => {
            setRejectReason(e.target.value);
            if (e.target.value !== "custom") setCustomReason("");
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