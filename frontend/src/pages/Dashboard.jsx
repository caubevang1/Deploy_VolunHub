import React, { useEffect, useState, useCallback } from "react";
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
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ReloadOutlined,
  BellOutlined,
  CommentOutlined,
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
  const [myEvents, setMyEvents] = useState([]);
  const [newEvents, setNewEvents] = useState([]);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [eventsWithActivity, setEventsWithActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const navigate = useNavigate();

  const categoryMapping = {
    Community: "Cộng đồng",
    Education: "Giáo dục",
    Healthcare: "Sức khỏe",
    Environment: "Môi trường",
    EventSupport: "Sự kiện",
    Technical: "Kỹ thuật",
    Emergency: "Cứu trợ",
    Online: "Trực tuyến",
    Corporate: "Doanh nghiệp",
  };

  const statusMapping = {
    pending: { text: "Chờ duyệt", color: "gold" },
    approved: { text: "Đã duyệt", color: "green" },
    rejected: { text: "Từ chối", color: "red" },
    completed: { text: "Hoàn thành", color: "blue" },
  };

  // --- LOGIC HÀM PHẢI KHAI BÁO TRƯỚC USEEFFECT ---
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetAllEventsStats();
      const allEvents = res?.data?.events || [];
      const approvedEvents = allEvents.filter(
        (ev) => (ev.status || "").toLowerCase() === "approved"
      );
      
      // Khởi tạo stats cơ bản
      let tempStats = { totalEvents: approvedEvents.length };

      try {
        const myRes = await GetMyEvent();
        const myRegs = myRes?.data || [];
        setMyEvents(myRegs);
        
        tempStats = {
          ...tempStats,
          myRegistrations: myRegs.length,
          approvedRegistrations: myRegs.filter((r) => r.status === "approved").length,
          pendingRegistrations: myRegs.filter((r) => r.status === "pending").length,
          rejectedRegistrations: myRegs.filter((r) => r.status === "rejected").length,
          completedRegistrations: myRegs.filter((r) => r.status === "completed").length,
        };
      } catch (err) {
        console.error("Fetch my events error:", err);
      }
      
      setStats((prev) => ({ ...prev, ...tempStats }));

      const now = Date.now();
      setNewEvents(
        approvedEvents
          .filter((e) => (now - new Date(e.createdAt).getTime()) / 86400000 <= 7)
          .slice(0, 5)
      );

      setTrendingEvents(
        [...approvedEvents]
          .sort((a, b) => (b.totalRegistrations || 0) - (a.totalRegistrations || 0))
          .slice(0, 6)
      );

      // Cập nhật hoạt động mới (Sửa logic lấy id từ e.id thay vì e._id)
      const eventsWithPosts = [];
      await Promise.all(
        approvedEvents.slice(0, 10).map(async (e) => {
          try {
            const r = await GetEventPosts(e.id); // Dùng e.id
            const posts = r?.data || [];
            const recent = posts.filter(
              (p) => (now - new Date(p.createdAt).getTime()) / 86400000 <= 7
            );
            if (recent.length > 0) {
              eventsWithPosts.push({
                ...e,
                recentPosts: recent.length,
                lastActivity: recent[0].createdAt,
              });
            }
          } catch (err) {
            console.warn(`Posts error for ${e.id}:`, err.message);
          }
        })
      );
      
      setEventsWithActivity(
        eventsWithPosts
          .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
          .slice(0, 5)
      );

      try {
        const notifRes = await http.get("/notifications");
        if (notifRes.status === 200)
          setNotifications((notifRes.data || []).slice(0, 10));
      } catch (err) {
        console.error("Notifications error:", err);
      }
    } catch (err) {
      console.error("Dashboard error:", err);
      message.error("Lỗi tải dữ liệu Dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const renderMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(".*?"|\(.*?\))/g);
    return (
      <span>
        {parts.map((part, i) => {
          if (part.startsWith('"') && part.endsWith('"')) {
            return <strong key={i} className="text-blue-600 mx-0.5">{part.replace(/"/g, "")}</strong>;
          }
          if (part.startsWith("(") && part.endsWith(")")) {
            const scoreText = part.replace(/[()]/g, "");
            return <strong key={i} className={`${scoreText.includes("-") ? "text-red-500" : "text-green-500"} mx-0.5`}>{scoreText}</strong>;
          }
          return part;
        })}
      </span>
    );
  };

  // --- CẬP NHẬT CÁC CỘT TABLE DÙNG .id ---
  const newEventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      render: (text, record) => (
        <a onClick={() => navigate(`/su-kien/${record.id}`)} className="text-blue-600 font-medium">
          {text}
        </a>
      ),
    },
    {
      title: "Loại sự kiện",
      dataIndex: "category",
      render: (cat) => <Tag color="blue">{categoryMapping[cat] || cat}</Tag>,
    },
    {
      title: "Ngày",
      dataIndex: "date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
  ];

  const myEventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: ["event", "name"],
      render: (text, record) => (
        <a onClick={() => navigate(`/su-kien/${record.event?.id}`)} className="text-blue-600 font-medium">
          {text}
        </a>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (s) => (
        <Tag color={statusMapping[s]?.color || "default"}>{statusMapping[s]?.text || s}</Tag>
      ),
    },
    {
      title: "Ngày đăng ký",
      dataIndex: "createdAt",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
  ];

  const trendingColumns = [
    { title: "STT", key: "index", align: "center", width: 60, render: (_, __, index) => index + 1 },
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      render: (text, record) => (
        <a onClick={() => navigate(`/su-kien/${record.id}`)} className="text-blue-600 font-semibold">{text}</a>
      ),
    },
    {
      title: "Đăng ký",
      align: "center",
      render: (_, record) => <Badge count={record.totalRegistrations || 0} showZero color="blue" />,
    },
  ];

  if (loading)
    return <div className="flex justify-center items-center h-screen"><Spin size="large" tip="Đang tải dữ liệu..." /></div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
        <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} size="large">Làm mới</Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        {[
          { t: "Đã Đăng Ký", v: stats.myRegistrations, c: "#52c41a", i: <StarOutlined /> },
          { t: "Chờ Duyệt", v: stats.pendingRegistrations, c: "#faad14", i: <ClockCircleOutlined /> },
          { t: "Đã Duyệt", v: stats.approvedRegistrations, c: "#1890ff", i: <CheckCircleOutlined /> },
          { t: "Hoàn Thành", v: stats.completedRegistrations, c: "#722ed1", i: <TrophyOutlined /> },
        ].map((item, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card style={{ borderTop: `4px solid ${item.c}` }} className="shadow-sm">
              <Statistic
                title={item.t}
                value={item.v}
                valueStyle={{ color: item.c, fontWeight: "bold" }}
                prefix={React.cloneElement(item.i, { style: { color: item.c } })}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Sự Kiện Của Tôi" className="mb-6 shadow-sm">
        {myEvents.length === 0 ? (
          <Empty description="Chưa đăng ký sự kiện nào" />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "upcoming",
                label: "Sắp diễn ra",
                children: (
                  <Table
                    dataSource={myEvents.filter(e => e.status === "approved" && dayjs(e.event?.date).isAfter(dayjs()))}
                    columns={myEventColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                ),
              },
              {
                key: "completed",
                label: "Đã tham gia",
                children: (
                  <Table dataSource={myEvents.filter(e => e.status === "completed")} columns={myEventColumns} rowKey="id" pagination={false} size="small" />
                ),
              },
              {
                key: "rejected",
                label: "Từ chối",
                children: (
                  <Table dataSource={myEvents.filter(e => e.status === "rejected")} columns={myEventColumns} rowKey="id" pagination={false} size="small" />
                ),
              },
              {
                key: "pending",
                label: "Chờ duyệt",
                children: (
                  <Table dataSource={myEvents.filter(e => e.status === "pending")} columns={myEventColumns} rowKey="id" pagination={false} size="small" />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card title="Sự Kiện Mới (7 ngày qua)" className="shadow-sm">
            <Table dataSource={newEvents} columns={newEventColumns} rowKey="id" pagination={false} size="small" locale={{ emptyText: "Không có sự kiện mới" }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Sự Kiện Hot Nhất" className="shadow-sm">
            <Table dataSource={trendingEvents} columns={trendingColumns} rowKey="id" pagination={false} size="small" locale={{ emptyText: "Chưa có dữ liệu" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Hoạt Động Mới" className="shadow-sm">
            <List
              size="small"
              dataSource={eventsWithActivity}
              renderItem={(e) => (
                <List.Item onClick={() => navigate(`/su-kien/${e.id}`)} className="cursor-pointer">
                  <List.Item.Meta
                    avatar={<Avatar icon={<CommentOutlined />} style={{ backgroundColor: "#52c41a" }} />}
                    title={<span className="text-blue-600 font-semibold">{e.name}</span>}
                    description={
                      <Space>
                        <Tag color="green">+{e.recentPosts} bài</Tag>
                        <span>{dayjs(e.lastActivity).fromNow()}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Không có hoạt động mới" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thông Báo" className="shadow-sm">
            <List
              size="small"
              dataSource={notifications}
              renderItem={(n) => (
                <List.Item className={!n.isRead ? "bg-blue-50" : ""}>
                  <List.Item.Meta
                    avatar={<Avatar icon={<BellOutlined />} style={{ backgroundColor: n.isRead ? "#d9d9d9" : "#1890ff" }} />}
                    title={<span className={!n.isRead ? "font-semibold" : ""}>{n.type || "Thông báo"}</span>}
                    description={
                      <div>
                        <div className="text-sm text-gray-700">{renderMessage(n.message)}</div>
                        <span className="text-xs text-gray-500">{dayjs(n.createdAt).fromNow()}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Không có thông báo" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}