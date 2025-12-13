import { useState, useEffect } from "react";
import { Table, Card, Avatar, Tag, Spin, Empty } from "antd";
import { Trophy, Award, Medal, TrendingUp } from "lucide-react";
import { GetVolunteerRanking } from "../services/UserService";
import "./VolunteerRanking.css";

export default function VolunteerRanking() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortedData, setSortedData] = useState([]);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const res = await GetVolunteerRanking();
      if (res.status === 200) {
        setVolunteers(res.data);
        setSortedData(res.data); // Initialize sorted data
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

  // Tính rank dựa trên vị trí trong sortedData
  const getCurrentRank = (recordId) => {
    const index = sortedData.findIndex((v) => v._id === recordId);
    return index >= 0 ? index + 1 : 999;
  };

  const getRankClass = (record) => {
    const currentRank = getCurrentRank(record._id);
    if (currentRank === 1) return "rank-1";
    if (currentRank === 2) return "rank-2";
    if (currentRank === 3) return "rank-3";
    return "";
  };

  const columns = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (rank, record) => (
        <div className="flex items-center justify-center">
          {getRankIcon(getCurrentRank(record._id))}
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
          {points.toLocaleString()} điểm
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
          <span className="font-semibold text-green-700">{count} sự kiện</span>
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
        const { points } = record;
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" tip="Đang tải bảng xếp hạng..." />
      </div>
    );
  }

  return (
    <div className="volunteer-ranking-container">
      {/* Header */}
      <div className="ranking-header">
        <div className="ranking-title-section">
          <Trophy size={40} className="text-yellow-500" />
          <div>
            <h1 className="ranking-title">Bảng Xếp Hạng Tình Nguyện Viên</h1>
            <p className="ranking-subtitle">
              Vinh danh những cá nhân xuất sắc đóng góp cho cộng đồng
            </p>
          </div>
        </div>

        {/* Top 3 Podium */}
        {volunteers.length >= 3 && (
          <div className="podium-container">
            {/* Rank 2 */}
            <div className="podium-item podium-2">
              <div className="podium-rank-number">2</div>
              <div className="podium-content">
                <Avatar
                  size={64}
                  src={volunteers[1]?.avatar || "/default-avatar.png"}
                  className="podium-avatar"
                />
                <div className="podium-name">{volunteers[1]?.name}</div>
                <div className="podium-points">
                  {volunteers[1]?.points} điểm
                </div>
                <div className="podium-events">
                  {volunteers[1]?.completedEvents} sự kiện
                </div>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="podium-item podium-1">
              <div className="podium-rank-number">1</div>
              <div className="podium-content">
                <Avatar
                  size={80}
                  src={volunteers[0]?.avatar || "/default-avatar.png"}
                  className="podium-avatar"
                />
                <div className="podium-name">{volunteers[0]?.name}</div>
                <div className="podium-points">
                  {volunteers[0]?.points} điểm
                </div>
                <div className="podium-events">
                  {volunteers[0]?.completedEvents} sự kiện
                </div>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="podium-item podium-3">
              <div className="podium-rank-number">3</div>
              <div className="podium-content">
                <Avatar
                  size={64}
                  src={volunteers[2]?.avatar || "/default-avatar.png"}
                  className="podium-avatar"
                />
                <div className="podium-name">{volunteers[2]?.name}</div>
                <div className="podium-points">
                  {volunteers[2]?.points} điểm
                </div>
                <div className="podium-events">
                  {volunteers[2]?.completedEvents} sự kiện
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Ranking Table */}
      <Card className="ranking-table-card">
        {volunteers.length === 0 ? (
          <Empty description="Chưa có dữ liệu xếp hạng" />
        ) : (
          <Table
            columns={columns}
            dataSource={volunteers}
            rowKey="_id"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} tình nguyện viên`,
            }}
            rowClassName={(record) => getRankClass(record)}
            className="ranking-table"
            onChange={(pagination, filters, sorter, extra) => {
              // Cập nhật sortedData khi table thay đổi
              setSortedData(extra.currentDataSource);
            }}
          />
        )}
      </Card>
    </div>
  );
}
