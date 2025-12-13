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
  Badge,
  Empty,
  Tag,
  Space,
  Select,
  Tooltip,
  Popconfirm,
  DatePicker,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  GetManagerEvents,
  GetEventDetail,
  GetParticipants,
  UpdateParticipantStatus,
} from "../../../services/EventManagerService";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function EventManagerDashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    pendingEvents: 0,
    approvedEvents: 0,
    rejectedEvents: 0,
    completedEvents: 0,
    totalRegistrations: 0,
    approvedRegistrations: 0,
    pendingRegistrations: 0,
    rejectedRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all"); // 7, 30, all, custom - Changed to "all" by default
  const [dateRange, setDateRange] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter, dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await GetManagerEvents();
      if (res.status === 200) {
        let events = res.data;
        console.log("Total events from API:", events.length, events);
        console.log(
          "Pending events:",
          events.filter((e) => e.status === "pending")
        );

        // Apply time filter
        const now = dayjs();
        if (timeFilter === "7") {
          const weekAgo = now.subtract(7, "day");
          events = events.filter((e) => dayjs(e.createdAt).isAfter(weekAgo));
        } else if (timeFilter === "30") {
          const monthAgo = now.subtract(30, "day");
          events = events.filter((e) => dayjs(e.createdAt).isAfter(monthAgo));
        } else if (timeFilter === "custom" && dateRange) {
          events = events.filter((e) => {
            const eventDate = dayjs(e.createdAt);
            return (
              eventDate.isAfter(dateRange[0]) &&
              eventDate.isBefore(dateRange[1])
            );
          });
        }

        console.log(
          "Events after time filter:",
          events.length,
          "Filter:",
          timeFilter
        );

        // Fetch detailed info for each event
        const detailedEventsData = await Promise.all(
          events.map(async (event) => {
            try {
              const [detailRes, participantsRes] = await Promise.all([
                GetEventDetail(event._id),
                GetParticipants(event._id),
              ]);

              console.log(`Participants API response for ${event.name}:`, {
                status: participantsRes.status,
                data: participantsRes.data,
                dataLength: participantsRes.data?.length,
              });

              const participants =
                participantsRes.status === 200 ? participantsRes.data : [];
              const stats =
                detailRes.status === 200
                  ? detailRes.data.stats
                  : {
                      totalRegistrations: 0,
                      approvedCount: 0,
                      pendingCount: 0,
                      rejectedCount: 0,
                    };

              return {
                ...event,
                stats,
                participants,
              };
            } catch (err) {
              console.error(`Error fetching event ${event._id}:`, err);
              return {
                ...event,
                stats: {
                  totalRegistrations: 0,
                  approvedCount: 0,
                  pendingCount: 0,
                  rejectedCount: 0,
                },
                participants: [],
              };
            }
          })
        );

        // Calculate statistics (chỉ tính completed từ approved events)
        const totalEvents = events.length;
        const pendingEvents = events.filter(
          (e) => e.status === "pending"
        ).length;
        const approvedEvents = events.filter(
          (e) => e.status === "approved" || e.status === "completed"
        ).length;
        const rejectedEvents = events.filter(
          (e) => e.status === "rejected"
        ).length;
        const completedEvents = events.filter(
          (e) => e.status === "completed"
        ).length;

        console.log("Stats calculated:", {
          totalEvents,
          pendingEvents,
          approvedEvents,
          rejectedEvents,
          completedEvents,
        });

        const totalRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.totalRegistrations || 0),
          0
        );
        const approvedRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.approvedCount || 0),
          0
        );
        const pendingRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.pendingCount || 0),
          0
        );
        const rejectedRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.rejectedCount || 0),
          0
        );

        setStats({
          totalEvents,
          pendingEvents,
          approvedEvents,
          rejectedEvents,
          completedEvents,
          totalRegistrations,
          approvedRegistrations,
          pendingRegistrations,
          rejectedRegistrations,
        });

        // Recent events (last 5)
        const recent = detailedEventsData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentEvents(recent);

        // Top events by participants (approved events only)
        const top = detailedEventsData
          .filter((e) => e.status === "approved" || e.status === "completed")
          .sort(
            (a, b) =>
              (b.stats?.totalRegistrations || 0) -
              (a.stats?.totalRegistrations || 0)
          )
          .slice(0, 5);
        setTopEvents(top);

        // Collect all pending registrations
        const allPendingRegistrations = [];
        console.log("=== CHECKING PARTICIPANTS ===");
        detailedEventsData.forEach((event) => {
          console.log(
            `Event: ${event.name}, Participants:`,
            event.participants
          );
          if (event.participants && event.participants.length > 0) {
            const pending = event.participants
              .filter((p) => p.status === "pending")
              .map((p) => ({
                ...p,
                eventName: event.name,
                eventId: event._id,
                eventDate: event.date,
              }));
            console.log(
              `  - Pending registrations in ${event.name}:`,
              pending.length
            );
            allPendingRegistrations.push(...pending);
          } else {
            console.log(`  - No participants for ${event.name}`);
          }
        });

        console.log(
          "Total pending registrations:",
          allPendingRegistrations.length,
          allPendingRegistrations
        );

        // Sort by registration date (newest first)
        allPendingRegistrations.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPendingRegistrations(allPendingRegistrations.slice(0, 10));

        // Upcoming/recent events (approved events within 7 days)
        const upcoming = detailedEventsData
          .filter((e) => {
            if (e.status !== "approved") return false;
            const eventDate = dayjs(e.date);
            const daysDiff = eventDate.diff(now, "day");
            return daysDiff >= -3 && daysDiff <= 7; // 3 days ago to 7 days ahead
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      message.error("Không thể tải dữ liệu dashboard");
    }
    setLoading(false);
  };

  const handleApproveRegistration = async (registrationId) => {
    setActionLoading({ ...actionLoading, [registrationId]: true });
    try {
      const res = await UpdateParticipantStatus(registrationId, "approved");
      if (res.status === 200) {
        message.success("Đã duyệt đăng ký");
        fetchDashboardData();
      }
    } catch (error) {
      message.error("Không thể duyệt đăng ký");
    }
    setActionLoading({ ...actionLoading, [registrationId]: false });
  };

  const handleRejectRegistration = async (registrationId) => {
    setActionLoading({ ...actionLoading, [registrationId]: true });
    try {
      const res = await UpdateParticipantStatus(registrationId, "rejected");
      if (res.status === 200) {
        message.success("Đã từ chối đăng ký");
        fetchDashboardData();
      }
    } catch (error) {
      message.error("Không thể từ chối đăng ký");
    }
    setActionLoading({ ...actionLoading, [registrationId]: false });
  };

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

  const statusMapping = {
    pending: { text: "Chờ duyệt", color: "gold" },
    approved: { text: "Đã duyệt", color: "green" },
    rejected: { text: "Từ chối", color: "red" },
    completed: { text: "Hoàn thành", color: "blue" },
  };

  const eventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/quanlisukien/su-kien/${record._id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category) => (
        <Tag color="blue">{categoryMapping[category] || category}</Tag>
      ),
    },
    {
      title: "Ngày",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      width: 110,
    },
    {
      title: "Đăng ký",
      key: "registrations",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Badge
          count={record.stats?.totalRegistrations || 0}
          showZero
          color="blue"
        />
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status) => {
        const statusInfo = statusMapping[status] || {
          text: status,
          color: "default",
        };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  const topEventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space>
          <TrophyOutlined style={{ color: "#faad14" }} />
          <a
            onClick={() => navigate(`/quanlisukien/su-kien/${record._id}`)}
            className="text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: "Đăng ký",
      key: "totalRegistrations",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Badge
          count={record.stats?.totalRegistrations || 0}
          showZero
          color="blue"
        />
      ),
    },
    {
      title: "Đã duyệt",
      key: "approvedCount",
      width: 100,
      align: "center",
      render: (_, record) => (
        <Badge
          count={record.stats?.approvedCount || 0}
          showZero
          color="green"
        />
      ),
    },
  ];

  // Pending registrations columns
  const pendingRegistrationColumns = [
    {
      title: "Tình nguyện viên",
      key: "volunteer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-medium">{record.user?.name || "N/A"}</span>
          <span className="text-gray-500 text-xs">
            {record.user?.email || ""}
          </span>
        </Space>
      ),
    },
    {
      title: "Sự kiện",
      dataIndex: "eventName",
      key: "eventName",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/quanlisukien/su-kien/${record.eventId}`)}
          className="text-blue-600 hover:text-blue-800 cursor-pointer"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Ngày đăng ký",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Hành động",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="Duyệt">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={actionLoading[record._id]}
              onClick={() => handleApproveRegistration(record._id)}
            >
              Duyệt
            </Button>
          </Tooltip>
          <Tooltip title="Từ chối">
            <Popconfirm
              title="Bạn chắc chắn muốn từ chối?"
              onConfirm={() => handleRejectRegistration(record._id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                loading={actionLoading[record._id]}
              >
                Từ chối
              </Button>
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Upcoming events columns
  const upcomingEventColumns = [
    {
      title: "Sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/quanlisukien/su-kien/${record._id}`)}
          className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Ngày diễn ra",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (date) => {
        const eventDate = dayjs(date);
        const today = dayjs();
        const diff = eventDate.diff(today, "day");
        let color = "blue";
        if (diff < 0) color = "orange"; // Past
        else if (diff <= 2) color = "red"; // Very soon
        else if (diff <= 7) color = "green"; // Soon
        return <Tag color={color}>{eventDate.format("DD/MM/YYYY")}</Tag>;
      },
    },
    {
      title: "Hành động",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() =>
              navigate(`/quanlisukien/su-kien/${record._id}/participants`)
            }
          >
            Điểm danh
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/quanlisukien/su-kien/${record._id}`)}
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  // Calculate rates - FIX LOGIC
  // Tỷ lệ phê duyệt = approved / (pending + approved + rejected)
  const submittedEvents =
    stats.pendingEvents + stats.approvedEvents + stats.rejectedEvents;
  const approvalRate =
    submittedEvents > 0
      ? Math.round((stats.approvedEvents / submittedEvents) * 100)
      : 0;

  // Tỷ lệ hoàn thành = completed / approved
  const completionRate =
    stats.approvedEvents > 0
      ? Math.round((stats.completedEvents / stats.approvedEvents) * 100)
      : 0;

  // Tỷ lệ duyệt người tham gia = approvedRegistrations / totalRegistrations
  const participantApprovalRate =
    stats.totalRegistrations > 0
      ? Math.round(
          (stats.approvedRegistrations / stats.totalRegistrations) * 100
        )
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <Spin size="large">
          <div style={{ marginTop: 8 }}>Đang tải dữ liệu...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div className="dashboard-container p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-3xl font-bold text-gray-800">
          Dashboard Quản Lý Sự Kiện
        </h2>
        <Space>
          <Select
            value={timeFilter}
            onChange={(value) => {
              setTimeFilter(value);
              if (value !== "custom") {
                setDateRange(null);
              }
            }}
            style={{ width: 150 }}
          >
            <Select.Option value="7">7 ngày qua</Select.Option>
            <Select.Option value="30">30 ngày qua</Select.Option>
            <Select.Option value="all">Tất cả</Select.Option>
            <Select.Option value="custom">Tùy chọn</Select.Option>
          </Select>
          {timeFilter === "custom" && (
            <RangePicker
              onChange={(dates) => setDateRange(dates)}
              format="DD/MM/YYYY"
            />
          )}
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchDashboardData}
            size="large"
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #1890ff", borderRadius: 8 }}
            onClick={() => navigate("/quanlisukien/su-kien")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Tổng Sự Kiện</span>
              }
              value={stats.totalEvents}
              prefix={<CalendarOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #faad14", borderRadius: 8 }}
            onClick={() => navigate("/quanlisukien/su-kien")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Chờ Duyệt</span>
              }
              value={stats.pendingEvents}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
            onClick={() => navigate("/quanlisukien/su-kien")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Đã Duyệt</span>
              }
              value={stats.approvedEvents}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #722ed1", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Hoàn Thành</span>
              }
              value={stats.completedEvents}
              prefix={<TrophyOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Registration Statistics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #1890ff", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Tổng Đăng Ký</span>
              }
              value={stats.totalRegistrations}
              prefix={<UserOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Đã Duyệt Tham Gia
                </span>
              }
              value={stats.approvedRegistrations}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #faad14", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Chờ Duyệt Tham Gia
                </span>
              }
              value={stats.pendingRegistrations}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
              valueStyle={{ color: "#faad14", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #ff4d4f", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Từ Chối Tham Gia
                </span>
              }
              value={stats.rejectedRegistrations}
              prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
              valueStyle={{ color: "#ff4d4f", fontWeight: "bold" }}
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
                <span className="font-semibold">Tỷ Lệ Phê Duyệt Sự Kiện</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #52c41a" }}
          >
            <Progress
              percent={approvalRate}
              strokeColor={{ "0%": "#52c41a", "100%": "#95de64" }}
              format={(percent) => `${percent}%`}
              size={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-green-600">
                {stats.approvedEvents}
              </span>{" "}
              / {submittedEvents} sự kiện đã gửi
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
              format={(percent) => `${percent}%`}
              size={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-blue-600">
                {stats.completedEvents}
              </span>{" "}
              / {stats.approvedEvents} sự kiện đã duyệt
            </p>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: "#722ed1" }} />
                <span className="font-semibold">
                  Tỷ Lệ Duyệt Người Tham Gia
                </span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #722ed1" }}
          >
            <Progress
              percent={participantApprovalRate}
              strokeColor={{ "0%": "#722ed1", "100%": "#b37feb" }}
              format={(percent) => `${percent}%`}
              size={10}
            />
            <p className="text-gray-600 mt-3 text-center">
              <span className="font-bold text-purple-600">
                {stats.approvedRegistrations}
              </span>{" "}
              / {stats.totalRegistrations} đăng ký
            </p>
          </Card>
        </Col>
      </Row>

      {/* Pending Registrations - BẮT BUỘC */}
      <div className="mb-6">
        <Card
          title={
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <span className="font-semibold text-lg">
                Đăng Ký Chờ Duyệt ({pendingRegistrations.length})
              </span>
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
        >
          {pendingRegistrations.length === 0 ? (
            <Empty
              description="Không có đăng ký chờ duyệt"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              dataSource={pendingRegistrations}
              columns={pendingRegistrationColumns}
              rowKey="_id"
              pagination={{ pageSize: 5, showSizeChanger: false }}
              size="small"
            />
          )}
        </Card>
      </div>

      {/* Upcoming/Recent Events - BẮT BUỘC */}
      <div className="mb-6">
        <Card
          title={
            <Space>
              <CalendarOutlined style={{ color: "#1890ff" }} />
              <span className="font-semibold text-lg">
                Sự Kiện Sắp Diễn Ra / Vừa Kết Thúc
              </span>
            </Space>
          }
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
        >
          {upcomingEvents.length === 0 ? (
            <Empty
              description="Không có sự kiện sắp diễn ra"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              dataSource={upcomingEvents}
              columns={upcomingEventColumns}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>

      {/* Recent Events & Top Events */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FolderOpenOutlined style={{ color: "#1890ff" }} />
                <span className="font-semibold text-lg">Toàn bộ sự kiện</span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
            extra={
              <Button
                type="link"
                onClick={() => navigate("/quanlisukien/su-kien")}
                className="text-blue-600 hover:text-blue-800"
              >
                Xem tất cả →
              </Button>
            }
          >
            {recentEvents.length === 0 ? (
              <Empty
                description={
                  <Space direction="vertical">
                    <span>Chưa có sự kiện nào</span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate("/quanlisukien/su-kien/tao")}
                    >
                      Tạo sự kiện mới
                    </Button>
                  </Space>
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={recentEvents}
                columns={eventColumns}
                rowKey="_id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: "#ff4d4f" }} />
                <span className="font-semibold text-lg">
                  Sự Kiện Hot Nhất (Nhiều đăng ký)
                </span>
              </Space>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
          >
            {topEvents.length === 0 ? (
              <Empty
                description="Chưa có dữ liệu"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={topEvents}
                columns={topEventColumns}
                rowKey="_id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
