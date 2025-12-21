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
} from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import {
  GetDashboardStats,
  GetEvents,
  GetUsers,
} from "../../services/AdminService";
import { useNavigate } from "react-router-dom";

// Main Dashboard Component

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    pendingEventsCount: 0,
    approvedEventsCount: 0,
    rejectedEventsCount: 0,
    completedEventsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch dashboard stats
        const statsRes = await GetDashboardStats();
        if (statsRes.status === 200) {
          console.log("Dashboard Stats Response:", statsRes.data);
          setStats(statsRes.data);
        }

        // Fetch recent events (top 5)
        const eventsRes = await GetEvents();
        if (eventsRes.status === 200) {
          setRecentEvents(eventsRes.data.slice(0, 5));
        }

        // Fetch recent users (top 5)
        const usersRes = await GetUsers();
        if (usersRes.status === 200) {
          setRecentUsers(usersRes.data.slice(0, 5));
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu dashboard:", error);
        const status = error?.response?.status;
        // If unauthorized or forbidden, redirect to login (likely token missing/expired)
        if (status === 401 || status === 403) {
          message.error(
            "Bạn chưa đăng nhập hoặc không có quyền truy cập. Vui lòng đăng nhập lại."
          );
          navigate("/login");
        } else {
          const errMsg =
            error?.response?.data?.message ||
            error.message ||
            "Không thể tải dữ liệu dashboard";
          message.error(errMsg);
        }
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate]);

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
    pending: { text: "Chờ duyệt", color: "#DDB958" },
    approved: { text: "Đã duyệt", color: "#52c41a" },
    rejected: { text: "Từ chối", color: "#ff4d4f" },
    completed: { text: "Hoàn thành", color: "#1890ff" },
  };

  const roleMapping = {
    VOLUNTEER: "Tình nguyện viên",
    EVENTMANAGER: "Quản lý sự kiện",
    ADMIN: "Quản trị viên",
  };

  const eventColumns = [
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
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusInfo = statusMapping[status] || {
          text: status,
          color: "#000",
        };
        return (
          <span style={{ color: statusInfo.color, fontWeight: "500" }}>
            {statusInfo.text}
          </span>
        );
      },
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
      render: (role) => roleMapping[role] || role,
    },
  ];

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div className="dashboard-container p-6 bg-gray-50 min-h-screen">
      <h2 className="text-center font-bold text-3xl mb-8 text-gray-800">
        Dashboard Quản Trị Viên
      </h2>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={12}>
          <Card
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
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
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #52c41a" }}
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
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #DDB958", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien?status=pending")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Chờ Duyệt
                </span>
              }
              value={stats.pendingEventsCount}
              prefix={<ClockCircleOutlined style={{ color: "#DDB958" }} />}
              valueStyle={{ color: "#DDB958", fontWeight: "bold" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #52c41a" }}
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
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #ff4d4f", borderRadius: 8 }}
            onClick={() => navigate("/admin/su-kien?status=rejected")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">
                  Sự Kiện Đã Từ Chối
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
            className="stat-card shadow-md hover:shadow-lg transition-shadow cursor-pointer"
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

      {/* Event Status Progress Bars */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={8}>
          <Card
            title={
              <span className="font-semibold text-lg">
                Tỷ Lệ Phê Duyệt Sự Kiện
              </span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #52c41a" }}
          >
            <Progress
              percent={approvalRate}
              strokeColor={{
                "0%": "#52c41a",
                "100%": "#95de64",
              }}
              format={(percent) => `${percent}%`}
            />
            <p className="text-gray-600 mt-2">
              {stats.approvedEventsCount + stats.completedEventsCount} /{" "}
              {stats.totalEvents} sự kiện đã được phê duyệt hoặc hoàn thành
            </p>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <span className="font-semibold text-lg">
                Tỷ Lệ Hoàn Thành Sự Kiện
              </span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #1890ff" }}
          >
            <Progress
              percent={completionRate}
              strokeColor={{
                "0%": "#1890ff",
                "100%": "#69c0ff",
              }}
              format={(percent) => `${percent}%`}
            />
            <p className="text-gray-600 mt-2">
              {stats.completedEventsCount || 0} /{" "}
              {stats.approvedEventsCount + stats.completedEventsCount} sự kiện
              đã hoàn thành
            </p>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            title={
              <span className="font-semibold text-lg">
                Tỷ Lệ Từ Chối Sự Kiện
              </span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8, borderTop: "3px solid #ff4d4f" }}
          >
            <Progress
              percent={rejectionRate}
              strokeColor={{
                "0%": "#ff4d4f",
                "100%": "#ff7875",
              }}
              format={(percent) => `${percent}%`}
            />
            <p className="text-gray-600 mt-2">
              {stats.rejectedEventsCount || 0} /{" "}
              {stats.rejectedEventsCount +
                stats.approvedEventsCount +
                stats.completedEventsCount}{" "}
              sự kiện bị từ chối
            </p>
          </Card>
        </Col>
      </Row>

      {/* Recent Events & Users Tables */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-semibold text-lg">Sự Kiện Mới Nhất</span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
            extra={
              <a
                onClick={() => navigate("/admin/su-kien")}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Xem tất cả →
              </a>
            }
          >
            <Table
              dataSource={recentEvents}
              columns={eventColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-semibold text-lg">Người Dùng Mới Nhất</span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
            extra={
              <a
                onClick={() => navigate("/admin/nguoi-dung")}
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                Xem tất cả →
              </a>
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
        </Col>
      </Row>
    </div>
  );
}
