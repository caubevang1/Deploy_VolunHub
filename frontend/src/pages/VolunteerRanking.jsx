import { useState, useEffect } from "react";
import { Table, Card, Avatar, Tag, Spin, Empty, Tabs } from "antd";
import {
  Trophy,
  Award,
  Medal,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
} from "lucide-react";
import {
  GetVolunteerRanking,
  GetEventManagerRanking,
} from "../services/UserService";
import "./VolunteerRanking.css";

export default function VolunteerRanking() {
  const [volunteers, setVolunteers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortedData, setSortedData] = useState([]);
  const [sortedManagerData, setSortedManagerData] = useState([]);
  const [activeTab, setActiveTab] = useState("volunteers");

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const [volunteerRes, managerRes] = await Promise.all([
        GetVolunteerRanking(),
        GetEventManagerRanking(),
      ]);

      if (volunteerRes.status === 200) {
        setVolunteers(volunteerRes.data || []);
        setSortedData(volunteerRes.data || []);
      }

      if (managerRes.status === 200) {
        setManagers(managerRes.data || []);
        setSortedManagerData(managerRes.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy bảng xếp hạng:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={24} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={24} className="text-gray-400" />;
    if (rank === 3) return <Award size={24} className="text-amber-600" />;
    return <span className="text-gray-600 font-bold">{rank}</span>;
  };

  // SỬA: Thay _id bằng id
  const getCurrentRank = (recordId) => {
    const index = sortedData.findIndex((v) => (v.id || v._id) === recordId);
    return index >= 0 ? index + 1 : 999;
  };

  // SỬA: Thay _id bằng id
  const getRankClass = (record) => {
    const currentRank = getCurrentRank(record.id || record._id);
    if (currentRank === 1) return "rank-1";
    if (currentRank === 2) return "rank-2";
    if (currentRank === 3) return "rank-3";
    return "";
  };

  const volunteerColumns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center">
          {getRankIcon(getCurrentRank(record.id || record._id))}
        </div>
      ),
    },
    {
      title: "Tình nguyện viên",
      dataIndex: "volunteer",
      key: "volunteer",
      width: 300,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={48}
            src={record.avatar || "/default-avatar.png"}
            className="border-2 border-gray-200"
          />
          <div>
            <div className="font-semibold text-gray-900">{record.name}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <TrendingUp size={16} />
          <span>Điểm tích lũy</span>
        </div>
      ),
      dataIndex: "points",
      key: "points",
      width: 150,
      align: "center",
      render: (points) => (
        <Tag color="gold" className="text-base font-bold px-4 py-1">
          {(points || 0).toLocaleString()} điểm
        </Tag>
      ),
    },
    {
      title: "Sự kiện hoàn thành",
      dataIndex: "completedEvents",
      key: "completedEvents",
      width: 180,
      align: "center",
      render: (count) => (
        <div className="flex items-center justify-center gap-2">
          <Award size={16} className="text-green-600" />
          <span className="font-semibold text-green-700">{(count || 0)} sự kiện</span>
        </div>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "level",
      key: "level",
      width: 150,
      align: "center",
      render: (_, record) => {
        const points = record.points || 0;
        let level = "Tân binh";
        let color = "default";

        if (points >= 1000) {
          level = "Huyền thoại";
          color = "purple";
        } else if (points >= 500) {
          level = "Chuyên gia";
          color = "red";
        } else if (points >= 200) {
          level = "Tinh thông";
          color = "orange";
        } else if (points >= 100) {
          level = "Thành thạo";
          color = "blue";
        } else if (points >= 50) {
          level = "Trung cấp";
          color = "cyan";
        }

        return (
          <Tag color={color} className="font-semibold">
            {level}
          </Tag>
        );
      },
    },
  ];

  // SỬA: Thay _id bằng id
  const getCurrentManagerRank = (recordId) => {
    const index = sortedManagerData.findIndex((m) => (m.id || m._id) === recordId);
    return index >= 0 ? index + 1 : 999;
  };

  // SỬA: Thay _id bằng id
  const getManagerRankClass = (record) => {
    const currentRank = getCurrentManagerRank(record.id || record._id);
    if (currentRank === 1) return "rank-1";
    if (currentRank === 2) return "rank-2";
    if (currentRank === 3) return "rank-3";
    return "";
  };

  const managerColumns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (_, record) => (
        <div className="flex items-center justify-center">
          {getRankIcon(getCurrentManagerRank(record.id || record._id))}
        </div>
      ),
    },
    {
      title: "Quản lý sự kiện",
      dataIndex: "manager",
      key: "manager",
      width: 300,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            size={48}
            src={record.avatar || "/default-avatar.png"}
            className="border-2 border-gray-200"
          />
          <div>
            <div className="font-semibold text-gray-900">{record.name}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <TrendingUp size={16} />
          <span>Điểm số</span>
        </div>
      ),
      dataIndex: "score",
      key: "score",
      width: 150,
      align: "center",
      render: (score) => (
        <Tag color="blue" className="text-base font-bold px-4 py-1">
          {(score || 0).toLocaleString()} điểm
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>Sự kiện</span>
        </div>
      ),
      dataIndex: "totalEvents",
      key: "totalEvents",
      width: 130,
      align: "center",
      render: (count) => (
        <span className="font-semibold text-gray-700">{(count || 0)}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle size={16} />
          <span>Hoàn thành</span>
        </div>
      ),
      dataIndex: "completedEvents",
      key: "completedEvents",
      width: 130,
      align: "center",
      render: (count) => (
        <div className="flex items-center justify-center gap-2">
          <Award size={16} className="text-green-600" />
          <span className="font-semibold text-green-700">{(count || 0)}</span>
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>Tình nguyện viên</span>
        </div>
      ),
      dataIndex: "totalVolunteers",
      key: "totalVolunteers",
      width: 160,
      align: "center",
      render: (count) => (
        <Tag color="purple" className="font-semibold">
          {(count || 0)} người
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" tip="Đang tải bảng xếp hạng..." />
      </div>
    );
  }

  const currentData = activeTab === "volunteers" ? volunteers : managers;
  const topThree = currentData.slice(0, 3);

  return (
    <div className="volunteer-ranking-container">
      <div className="ranking-header">
        <div className="ranking-title-section">
          <Trophy size={40} className="text-yellow-500" />
          <div>
            <h1 className="ranking-title">Bảng Xếp Hạng Tấm Gương</h1>
            <p className="ranking-subtitle">
              Vinh danh những cá nhân xuất sắc đóng góp cho cộng đồng
            </p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="podium-container">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="podium-item podium-2">
                <div className="podium-rank-number">2</div>
                <div className="podium-content">
                  <Avatar
                    size={64}
                    src={topThree[1]?.avatar || "/default-avatar.png"}
                    className="podium-avatar"
                  />
                  <div className="podium-name">{topThree[1]?.name}</div>
                  <div className="podium-points">
                    {activeTab === "volunteers"
                      ? `${(topThree[1]?.points || 0)} điểm`
                      : `${(topThree[1]?.score || 0)} điểm`}
                  </div>
                  <div className="podium-events">
                    {activeTab === "volunteers"
                      ? `${(topThree[1]?.completedEvents || 0)} sự kiện`
                      : `${(topThree[1]?.completedEvents || 0)} sự kiện hoàn thành`}
                  </div>
                </div>
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="podium-item podium-1">
                <div className="podium-rank-number">1</div>
                <div className="podium-content">
                  <Avatar
                    size={80}
                    src={topThree[0]?.avatar || "/default-avatar.png"}
                    className="podium-avatar"
                  />
                  <div className="podium-name">{topThree[0]?.name}</div>
                  <div className="podium-points">
                    {activeTab === "volunteers"
                      ? `${(topThree[0]?.points || 0)} điểm`
                      : `${(topThree[0]?.score || 0)} điểm`}
                  </div>
                  <div className="podium-events">
                    {activeTab === "volunteers"
                      ? `${(topThree[0]?.completedEvents || 0)} sự kiện`
                      : `${(topThree[0]?.completedEvents || 0)} sự kiện hoàn thành`}
                  </div>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="podium-item podium-3">
                <div className="podium-rank-number">3</div>
                <div className="podium-content">
                  <Avatar
                    size={64}
                    src={topThree[2]?.avatar || "/default-avatar.png"}
                    className="podium-avatar"
                  />
                  <div className="podium-name">{topThree[2]?.name}</div>
                  <div className="podium-points">
                    {activeTab === "volunteers"
                      ? `${(topThree[2]?.points || 0)} điểm`
                      : `${(topThree[2]?.score || 0)} điểm`}
                  </div>
                  <div className="podium-events">
                    {activeTab === "volunteers"
                      ? `${(topThree[2]?.completedEvents || 0)} sự kiện`
                      : `${(topThree[2]?.completedEvents || 0)} sự kiện hoàn thành`}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Card className="ranking-table-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "volunteers",
              label: (
                <span className="flex items-center gap-2 text-base">
                  <Trophy size={18} />
                  Tình nguyện viên
                </span>
              ),
              children:
                volunteers.length === 0 ? (
                  <Empty description="Chưa có dữ liệu xếp hạng" />
                ) : (
                  <Table
                    columns={volunteerColumns}
                    dataSource={volunteers}
                    rowKey={(record) => record.id || record._id} // SỬA: Linh hoạt key
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: false,
                      showTotal: (total) => `Tổng ${total} tình nguyện viên`,
                    }}
                    rowClassName={(record) => getRankClass(record)}
                    className="ranking-table"
                    onChange={(pagination, filters, sorter, extra) => {
                      setSortedData(extra.currentDataSource);
                    }}
                  />
                ),
            },
            {
              key: "managers",
              label: (
                <span className="flex items-center gap-2 text-base">
                  <Award size={18} />
                  Quản lý sự kiện
                </span>
              ),
              children:
                managers.length === 0 ? (
                  <Empty description="Chưa có dữ liệu xếp hạng" />
                ) : (
                  <Table
                    columns={managerColumns}
                    dataSource={managers}
                    rowKey={(record) => record.id || record._id} // SỬA: Linh hoạt key
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: false,
                      showTotal: (total) => `Tổng ${total} quản lý sự kiện`,
                    }}
                    rowClassName={(record) => getManagerRankClass(record)}
                    className="ranking-table"
                    onChange={(pagination, filters, sorter, extra) => {
                      setSortedManagerData(extra.currentDataSource);
                    }}
                  />
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}