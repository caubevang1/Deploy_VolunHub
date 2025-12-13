import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Table,
  Badge,
  Empty,
  Tag,
  Space,
  Button,
  Tabs,
  List,
  Avatar,
} from "antd";
import {
  CalendarOutlined,
  FireOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ReloadOutlined,
  BellOutlined,
  CommentOutlined,
  LikeOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { GetAllEventsStats, GetEventPosts } from "../services/StatsService";
import { GetMyEvent } from "../services/UserService";
import { http } from "../utils/BaseUrl";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    myRegistrations: 0,
    approvedRegistrations: 0,
    pendingRegistrations: 0,
    rejectedRegistrations: 0,
    completedRegistrations: 0,
  });
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [newEvents, setNewEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [eventsWithActivity, setEventsWithActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all events
      const res = await GetAllEventsStats();
      const allEvents = res?.data?.events || [];
      const approvedEvents = allEvents.filter(
        (ev) => (ev.status || "").toLowerCase() === "approved"
      );
      setEvents(approvedEvents);

      // Calculate stats
      setStats((prev) => ({
        ...prev,
        totalEvents: approvedEvents.length,
      }));

      // Fetch my registrations
      try {
        const myRes = await GetMyEvent();
        const myRegs = myRes?.data || [];
        setMyEvents(myRegs);

        setStats((prev) => ({
          ...prev,
          myRegistrations: myRegs.length,
          approvedRegistrations: myRegs.filter((r) => r.status === "approved")
            .length,
          pendingRegistrations: myRegs.filter((r) => r.status === "pending")
            .length,
          rejectedRegistrations: myRegs.filter((r) => r.status === "rejected")
            .length,
          completedRegistrations: myRegs.filter((r) => r.status === "completed")
            .length,
        }));
      } catch (err) {
        console.error("Error fetching my events:", err);
      }

      // New events (created within 7 days)
      const newEvs = approvedEvents.filter((e) => {
        const created = new Date(e.createdAt);
        const diffDays =
          (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });
      setNewEvents(newEvs.slice(0, 5));

      // Trending events (most registrations)
      const trending = [...approvedEvents]
        .sort(
          (a, b) => (b.totalRegistrations || 0) - (a.totalRegistrations || 0)
        )
        .slice(0, 6);
      setTrendingEvents(trending);

      // Fetch events with recent activity (posts in last 7 days)
      const eventsWithPosts = [];
      await Promise.all(
        approvedEvents.slice(0, 10).map(async (e) => {
          try {
            const r = await GetEventPosts(e._id);
            const posts = r?.data || [];
            const recentPosts = posts.filter((p) => {
              const created = new Date(p.createdAt || p.created_at);
              return (
                (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
              );
            });

            if (recentPosts.length > 0) {
              eventsWithPosts.push({
                ...e,
                recentPosts: recentPosts.length,
                lastActivity:
                  recentPosts[0].createdAt || recentPosts[0].created_at,
              });
            }
          } catch (err) {
            console.error(`Error fetching posts for event ${e._id}:`, err);
          }
        })
      );

      eventsWithPosts.sort(
        (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
      );
      setEventsWithActivity(eventsWithPosts.slice(0, 5));

      // Fetch notifications
      try {
        const notifRes = await http.get("/notifications");
        if (notifRes.status === 200) {
          setNotifications((notifRes.data || []).slice(0, 10));
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        message.error(
          "Bạn chưa đăng nhập. Vui lòng đăng nhập để xem Dashboard."
        );
      } else {
        message.error("Không thể tải dữ liệu dashboard");
      }
    }
    setLoading(false);
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

  const newEventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/su-kien/${record._id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {text || record.title}
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
      width: 110,
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
    },
  ];

  const myEventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: ["event", "name"],
      key: "name",
      render: (text, record) => (
        <a
          onClick={() => navigate(`/su-kien/${record.event?._id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => {
        const statusInfo = statusMapping[status] || {
          text: status,
          color: "default",
        };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: "Ngày đăng ký",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
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
          <a
            onClick={() => navigate(`/su-kien/${record._id}`)}
            className="text-blue-600 hover:text-blue-800 cursor-pointer"
          >
            {text || record.title}
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
        <Badge count={record.totalRegistrations || 0} showZero color="blue" />
      ),
    },
  ];

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Dashboard Tình Nguyện Viên
        </h2>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchDashboardData}
          size="large"
        >
          Làm mới
        </Button>
      </div>

      {/* Statistics Cards - Đăng ký của tôi */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Đã Đăng Ký</span>
              }
              value={stats.myRegistrations}
              prefix={<StarOutlined style={{ color: "#52c41a" }} />}
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
                <span className="text-gray-600 font-medium">Chờ Duyệt</span>
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
            style={{ borderTop: "4px solid #1890ff", borderRadius: 8 }}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Đã Duyệt</span>
              }
              value={stats.approvedRegistrations}
              prefix={<CheckCircleOutlined style={{ color: "#1890ff" }} />}
              valueStyle={{ color: "#1890ff", fontWeight: "bold" }}
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
                <span className="text-gray-600 font-medium">Đã Hoàn Thành</span>
              }
              value={stats.completedRegistrations}
              prefix={<TrophyOutlined style={{ color: "#722ed1" }} />}
              valueStyle={{ color: "#722ed1", fontWeight: "bold" }}
            />
          </Card>
        </Col>
      </Row>

      {/* My Events with Tabs */}
      <div className="mb-6">
        <Card
          title={<span className="font-semibold text-lg">Sự Kiện Của Tôi</span>}
          className="shadow-md hover:shadow-lg transition-shadow"
          style={{ borderRadius: 8 }}
        >
          {myEvents.length === 0 ? (
            <Empty
              description="Bạn chưa đăng ký sự kiện nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                onClick={() => navigate("/hoat-dong")}
                className="!bg-[#1890ff]"
              >
                Khám phá sự kiện
              </Button>
            </Empty>
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "upcoming",
                  label: `Sắp diễn ra (${
                    myEvents.filter((e) => {
                      const eventDate = dayjs(e.event?.date);
                      return (
                        e.status === "approved" && eventDate.isAfter(dayjs())
                      );
                    }).length
                  })`,
                  children: (
                    <Table
                      dataSource={myEvents.filter((e) => {
                        const eventDate = dayjs(e.event?.date);
                        return (
                          e.status === "approved" && eventDate.isAfter(dayjs())
                        );
                      })}
                      columns={myEventColumns}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      locale={{
                        emptyText: (
                          <Empty
                            description="Không có sự kiện sắp diễn ra"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: "completed",
                  label: `Đã tham gia (${stats.completedRegistrations})`,
                  children: (
                    <Table
                      dataSource={myEvents.filter(
                        (e) => e.status === "completed"
                      )}
                      columns={myEventColumns}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      locale={{
                        emptyText: (
                          <Empty
                            description="Chưa hoàn thành sự kiện nào"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: "rejected",
                  label: `Bị từ chối (${stats.rejectedRegistrations})`,
                  children: (
                    <Table
                      dataSource={myEvents.filter(
                        (e) => e.status === "rejected"
                      )}
                      columns={myEventColumns}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      locale={{
                        emptyText: (
                          <Empty
                            description="Không có đăng ký bị từ chối"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ),
                      }}
                    />
                  ),
                },
                {
                  key: "pending",
                  label: `Chờ duyệt (${stats.pendingRegistrations})`,
                  children: (
                    <Table
                      dataSource={myEvents.filter(
                        (e) => e.status === "pending"
                      )}
                      columns={myEventColumns}
                      rowKey="_id"
                      pagination={false}
                      size="small"
                      locale={{
                        emptyText: (
                          <Empty
                            description="Không có đăng ký chờ duyệt"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                          />
                        ),
                      }}
                    />
                  ),
                },
              ]}
            />
          )}
        </Card>
      </div>

      {/* Events with Activity & Notifications */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-semibold text-lg">
                Sự Kiện Có Tin Bài Mới
              </span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
          >
            {eventsWithActivity.length === 0 ? (
              <Empty
                description="Không có hoạt động mới trong 7 ngày qua"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                size="small"
                dataSource={eventsWithActivity}
                renderItem={(event) => (
                  <List.Item
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/su-kien/${event._id}`)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<CommentOutlined />}
                          style={{ backgroundColor: "#52c41a" }}
                        />
                      }
                      title={
                        <a className="text-blue-600 hover:text-blue-800 font-medium">
                          {event.name || event.title}
                        </a>
                      }
                      description={
                        <Space>
                          <Tag color="green">
                            +{event.recentPosts} bài viết mới
                          </Tag>
                          <span className="text-xs text-gray-500">
                            {dayjs(event.lastActivity).fromNow()}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-semibold text-lg">Thông Báo Gần Đây</span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
          >
            {notifications.length === 0 ? (
              <Empty
                description="Không có thông báo mới"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                size="small"
                dataSource={notifications}
                renderItem={(notif) => (
                  <List.Item
                    className={`hover:bg-gray-50 ${
                      !notif.isRead ? "bg-blue-50" : ""
                    }`}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          icon={<BellOutlined />}
                          style={{
                            backgroundColor: notif.isRead
                              ? "#d9d9d9"
                              : "#1890ff",
                          }}
                        />
                      }
                      title={
                        <span className={!notif.isRead ? "font-semibold" : ""}>
                          {notif.title || "Thông báo"}
                        </span>
                      }
                      description={
                        <div>
                          <div className="text-sm">{notif.message}</div>
                          <span className="text-xs text-gray-500">
                            {dayjs(notif.createdAt).fromNow()}
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* New Events & Trending */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-semibold text-lg">
                Sự Kiện Mới (7 ngày qua)
              </span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
            extra={
              <Button
                type="link"
                onClick={() => navigate("/hoat-dong")}
                className="text-blue-600 hover:text-blue-800"
              >
                Xem tất cả →
              </Button>
            }
          >
            {newEvents.length === 0 ? (
              <Empty
                description="Không có sự kiện mới"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Table
                dataSource={newEvents}
                columns={newEventColumns}
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
              <span className="font-semibold text-lg">Sự Kiện Hot Nhất</span>
            }
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{ borderRadius: 8 }}
          >
            {trendingEvents.length === 0 ? (
              <Empty
                description="Chưa có dữ liệu"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
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
        </Col>
      </Row>
    </div>
  );
}
