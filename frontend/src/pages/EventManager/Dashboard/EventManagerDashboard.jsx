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
  Badge,
  Empty,
  Tag,
  Space,
  Select,
  Tooltip,
  DatePicker,
  Tabs,
  Modal,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  TrophyOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  SmileFilled,
  FrownFilled,
  MehFilled,
  UserDeleteOutlined,
} from "@ant-design/icons";
import {
  GetManagerEvents,
  GetEventDetail,
  GetParticipants,
  UpdateParticipantStatus,
  MarkCompletedParticipants,
} from "../../../services/EventManagerService";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

// PERFORMANCE_OPTIONS đặt ngoài component
const PERFORMANCE_OPTIONS = [
  {
    key: "GOOD",
    label: "Tốt",
    icon: <SmileFilled className="text-lg" />,
    color: "bg-[#189438] !text-white",
  },
  {
    key: "AVERAGE",
    label: "Trung bình",
    icon: <MehFilled className="text-lg" />,
    color: "bg-[#E2A800] !text-white",
  },
  {
    key: "BAD",
    label: "Kém",
    icon: <FrownFilled className="text-lg" />,
    color: "bg-[#E41D13] !text-white",
  },
  {
    key: "NO_SHOW",
    label: "Vắng mặt",
    icon: <UserDeleteOutlined className="text-lg" />,
    color: "bg-gray-500 !text-white",
  },
];

export default function EventManagerDashboard() {
  const [activeTab, setActiveTab] = useState("events");
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
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [timeFilter, setTimeFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [allRegistrations, setAllRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [activeVolunteerCard, setActiveVolunteerCard] = useState("all");
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedForRejection, setSelectedForRejection] = useState(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");
  const [sortStatus, setSortStatus] = useState("all");

  const navigate = useNavigate();

  // Mapping được định nghĩa lại chuẩn xác để fix lỗi ESLint
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

  // FIX: Bọc fetchDashboardData vào useCallback để làm dependency an toàn cho useEffect
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetManagerEvents();
      if (res.status === 200) {
        let events = res.data;
        console.log("Total events from API:", events.length, events);

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

        // Fetch detailed info for each event
        const detailedEventsData = await Promise.all(
          events.map(async (event) => {
            try {
              // FIX: Sử dụng event.id thay vì eventid để đồng bộ với transform của Backend
              const eventId = event.id;
              const [detailRes, participantsRes] = await Promise.all([
                GetEventDetail(eventId),
                GetParticipants(eventId),
              ]);

              const participants =
                participantsRes.status === 200 ? participantsRes.data : [];
              const statsValue =
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
                stats: statsValue,
                participants,
              };
            } catch (err) {
              console.error(`Error fetching event ${event.id}:`, err);
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

        // Calculate statistics
        const totalEvents = events.length;
        const pendingEvents = events.filter(
          (e) => e.status === "pending"
        ).length;
        const approvedEvents = events.filter(
          (e) => e.status === "approved"
        ).length;
        const rejectedEvents = events.filter(
          (e) => e.status === "rejected"
        ).length;
        const completedEvents = events.filter(
          (e) => e.status === "completed"
        ).length;

        const totalRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.totalRegistrations || 0),
          0
        );
        const approvedRegistrations = detailedEventsData.reduce(
          (sum, e) => sum + (e.stats?.approvedCount || 0),
          0
        );
        const pendingRegistrationsCount = detailedEventsData.reduce(
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
          pendingRegistrations: pendingRegistrationsCount,
          rejectedRegistrations,
        });

        // Recent events
        const recent = detailedEventsData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentEvents(recent);

        // Top events
        const top = detailedEventsData
          .filter((e) => e.status === "approved" || e.status === "completed")
          .sort(
            (a, b) =>
              (b.stats?.totalRegistrations || 0) -
              (a.stats?.totalRegistrations || 0)
          )
          .slice(0, 5);
        setTopEvents(top);

        // Collect all registrations (not just pending)
        const allRegs = [];
        detailedEventsData.forEach((event) => {
          if (event.participants && event.participants.length > 0) {
            const regs = event.participants.map((p) => ({
              ...p,
              eventName: event.name,
              eventId: event.id,
              eventDate: event.date,
              eventSlug: event.slug,
            }));
            allRegs.push(...regs);
          }
        });
        allRegs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllRegistrations(allRegs);

        // Upcoming events
        const upcoming = detailedEventsData
          .filter((e) => {
            if (e.status !== "approved") return false;
            const eventDate = dayjs(e.date);
            const daysDiff = eventDate.diff(now, "day");
            return daysDiff >= 0 && daysDiff <= 7;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      message.error("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }, [timeFilter, dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Khi fetch xong allRegistrations, cập nhật filteredRegistrations mặc định là tất cả
  useEffect(() => {
    setFilteredRegistrations(allRegistrations);
    setActiveVolunteerCard("all");
  }, [allRegistrations]);

  // Hàm lọc danh sách theo loại card
  const handleVolunteerCardClick = (type) => {
    setActiveVolunteerCard(type);
    let filtered = allRegistrations;

    if (type === "approved") {
      // Bao gồm cả approved và completed
      filtered = allRegistrations.filter(
        (r) =>
          String(r.status).toLowerCase() === "approved" ||
          String(r.status).toLowerCase() === "completed"
      );
    } else if (type === "pending") {
      filtered = allRegistrations.filter(
        (r) => String(r.status).toLowerCase() === "pending"
      );
    }

    // Apply sort filter
    if (sortStatus !== "all") {
      filtered = filtered.filter(
        (r) => String(r.status).toLowerCase() === sortStatus
      );
    }

    setFilteredRegistrations(filtered);
  };

  // Hàm sort theo trạng thái
  const handleSortStatusChange = (value) => {
    setSortStatus(value);
    let filtered = allRegistrations;

    // Apply card filter first
    if (activeVolunteerCard === "approved") {
      filtered = allRegistrations.filter(
        (r) =>
          String(r.status).toLowerCase() === "approved" ||
          String(r.status).toLowerCase() === "completed"
      );
    } else if (activeVolunteerCard === "pending") {
      filtered = allRegistrations.filter(
        (r) => String(r.status).toLowerCase() === "pending"
      );
    }

    // Then apply sort filter
    if (value !== "all") {
      filtered = filtered.filter(
        (r) => String(r.status).toLowerCase() === value
      );
    }

    setFilteredRegistrations(filtered);
  };

  const handleApproveRegistration = async (registrationId) => {
    const participant = filteredRegistrations.find(
      (r) => r.id === registrationId
    );
    const result = await Swal.fire({
      title: `Bạn có chắc muốn duyệt?`,
      html: `Tình nguyện viên: <strong>${participant?.volunteer?.name || participant?.user?.name
        }</strong>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#22C55E",
      cancelButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    setActionLoading((prev) => ({ ...prev, [registrationId]: true }));
    try {
      const res = await UpdateParticipantStatus(registrationId, "approved");
      if (res.status === 200) {
        Swal.fire("Thành công", "Đã duyệt đăng ký", "success");
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể duyệt đăng ký", "error");
    }
    setActionLoading((prev) => ({ ...prev, [registrationId]: false }));
  };

  const handleRejectRegistration = async (registrationId) => {
    const participant = filteredRegistrations.find(
      (r) => r.id === registrationId
    );
    setSelectedForRejection({
      id: registrationId,
      name: participant?.volunteer?.name || participant?.user?.name,
    });
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!selectedRejectionReason) {
      message.warning("Vui lòng chọn lý do từ chối");
      return;
    }

    setIsRejectModalOpen(false);

    try {
      const res = await UpdateParticipantStatus(
        selectedForRejection.id,
        "rejected",
        selectedRejectionReason
      );
      if (res.status === 200) {
        Swal.fire(
          "Thành công",
          "Đã từ chối đăng ký và gửi thông báo",
          "success"
        );
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể cập nhật trạng thái", "error");
    } finally {
      setSelectedRejectionReason("");
      setSelectedForRejection(null);
    }
  };

  const openRatingModal = (record) => {
    setSelectedParticipant(record);
    setIsRatingModalOpen(true);
  };

  const handleSubmitRating = async (performance) => {
    if (!selectedParticipant) return;
    const selectedOption = PERFORMANCE_OPTIONS.find(
      (o) => o.key === performance
    );
    const confirmResult = await Swal.fire({
      title: "Xác nhận đánh giá",
      html: `Bạn có chắc chắn muốn đánh giá: <br/><strong>${selectedParticipant.volunteer?.name || selectedParticipant.user?.name
        }</strong> <br/> <strong style="color: #DDB958; font-size: 1.2em;">${selectedOption?.label
        }</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
    });
    if (!confirmResult.isConfirmed) return;
    setSubmittingRating(true);
    try {
      const res = await MarkCompletedParticipants(selectedParticipant.id, {
        performance,
      });
      if (res.status === 200) {
        setIsRatingModalOpen(false);
        Swal.fire({
          icon: "success",
          title: "Đánh giá thành công!",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
      message.error("Có lỗi xảy ra khi đánh giá.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // volunteerColumns đặt trong component (cần navigate và openRatingModal)
  const volunteerColumns = [
    {
      title: "Tình nguyện viên",
      key: "volunteer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span className="font-medium">
            {record.volunteer?.name || record.user?.name || "N/A"}
          </span>
          <span className="text-gray-500 text-xs">
            {record.volunteer?.email || record.user?.email || ""}
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
          onClick={() =>
            // changed: always navigate by numeric id to match manager route param
            navigate(`/quanlisukien/su-kien/${record.eventId}`)
          }
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
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
      title: "Trạng thái",
      dataIndex: "status",
      width: 120,
      render: (status) => {
        const colors = {
          pending: "#DDB958",
          approved: "#00C950",
          rejected: "red",
          completed: "#2B7FFF",
        };
        const labels = {
          pending: "Chờ duyệt",
          approved: "Đã duyệt",
          rejected: "Từ chối",
          completed: "Hoàn thành",
        };
        return (
          <Tag
            style={{ color: colors[status] || "#999" }}
            className="!font-semibold !bg-transparent !border-none !text-[14px] !pl-0"
          >
            {labels[status] || status?.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Đánh giá",
      dataIndex: "performance",
      align: "center",
      width: 160,
      render: (perf, record) => {
        // Nếu bị từ chối, hiển thị "Bị từ chối"
        if (String(record.status).toLowerCase() === "rejected") {
          return (
            <div className="bg-red-500 !text-white px-3 py-1 rounded-md flex items-center justify-center gap-2 w-[130px] mx-auto whitespace-nowrap">
              <span className="font-semibold">Bị từ chối</span>
            </div>
          );
        }

        if (!perf) return <span className="text-gray-400">—</span>;
        const option = PERFORMANCE_OPTIONS.find((o) => o.key === perf);
        if (!option) return <span className="text-gray-500">{perf}</span>;
        return (
          <div
            className={`${option.color} px-3 py-1 rounded-md flex items-center justify-center gap-2 w-[130px] mx-auto whitespace-nowrap`}
          >
            {option.icon}
            <span className="font-semibold">{option.label}</span>
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      align: "center",
      width: 200,
      render: (_, record) => {
        const recordStatus = String(record.status).toLowerCase();

        // Nếu đang chờ duyệt
        if (recordStatus === "pending") {
          return (
            <div className="flex flex-col justify-center items-center gap-2">
              <Button
                type="primary"
                className="!bg-green-500 w-18"
                size="small"
                loading={actionLoading[record.id]}
                onClick={() => handleApproveRegistration(record.id)}
              >
                Duyệt
              </Button>
              <Button
                size="small"
                className="!bg-red-500 !text-white w-18"
                loading={actionLoading[record.id]}
                onClick={() => handleRejectRegistration(record.id)}
              >
                Từ chối
              </Button>
            </div>
          );
        }

        // Nếu đã duyệt, hiển thị nút đánh giá
        if (recordStatus === "approved") {
          return (
            <Button
              type="primary"
              className="!bg-blue-500"
              onClick={() => openRatingModal(record)}
            >
              Đánh giá
            </Button>
          );
        }

        // Nếu hoàn thành hoặc từ chối, không hiển thị gì
        if (recordStatus === "completed") {
          return (
            <span className="text-green-600 font-medium text-xs">
              Đã kết thúc
            </span>
          );
        }

        return null;
      },
    },
  ];

  const eventColumns = [
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() =>
            // changed: use record.id (guaranteed id from API)
            navigate(`/quanlisukien/su-kien/${record.id}`)
          }
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {text}
        </a>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => dayjs(createdAt).format("DD/MM/YYYY"),
      width: 110,
    },
    {
      title: "Đã đăng ký",
      key: "registrations",
      width: 90,
      align: "center",
      render: (_, record) => (
        <span className="font-medium text-gray-700">
          {record.stats?.totalRegistrations || 0}
        </span>
      ),
    },
    {
      title: "SL tối đa",
      dataIndex: "maxParticipants",
      key: "maxParticipants",
      width: 110,
      align: "center",
      render: (maxParticipants) => (
        <span className="font-medium text-gray-700">
          {maxParticipants || "Không giới hạn"}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      align: "center",
      render: (status, record) => {
        const color =
          {
            pending: "!text-[#DDB958]",
            completed: "!text-blue-500",
            approved: "!text-green-500",
            rejected: "!text-red-500",
          }[status] || "!text-gray-500";

        return (
          <div className="flex flex-col items-center justify-center gap-1">
            <Tag
              className={`!ml-0 !pl-0 !border-none !bg-transparent !font-semibold !text-[14px] ${color}`}
            >
              {statusMapping[status]?.text || status}
            </Tag>
            {status === "rejected" && record.rejectionReason && (
              <span
                className="text-sm text-red-600 cursor-pointer hover:underline"
                onClick={() => {
                  import("sweetalert2").then((Swal) => {
                    Swal.default.fire({
                      title: "<span class='text-red-600'>Lý do từ chối</span>",
                      html: `
                        <div class="text-left bg-gray-50 p-4 rounded-lg">
                          <p class="font-semibold text-gray-800 mb-3 text-base">Sự kiện: <span class="text-blue-600">${record.name}</span></p>
                          <div class="border-l-4 border-red-500 pl-3 py-2 bg-white rounded">
                            <p class="text-gray-700 text-sm leading-relaxed">${record.rejectionReason}</p>
                          </div>
                        </div>
                      `,
                      icon: "warning",
                      iconColor: "#dc2626",
                      confirmButtonText: "Đóng",
                      confirmButtonColor: "#DDB958",
                      customClass: {
                        popup: "rounded-lg",
                        title: "text-lg",
                      },
                    });
                  });
                }}
              >
                (Lý do)
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const topEventColumns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center",
      render: (_, __, index) => (
        <span className="font-medium text-gray-700">{index + 1}</span>
      ),
    },
    {
      title: "Tên sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() =>
            // changed: use id
            navigate(`/quanlisukien/su-kien/${record.id}`)
          }
          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          {text}
        </a>
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

  const upcomingEventColumns = [
    {
      title: "Sự kiện",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a
          onClick={() =>
            // changed: use id
            navigate(`/quanlisukien/su-kien/${record.id}`)
          }
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
        let color = "#1890ff";
        if (diff <= 2) color = "#ff4d4f";
        else if (diff <= 7) color = "#52c41a";
        return (
          <Tag
            style={{
              backgroundColor: color,
              color: "white",
              border: "none",
              fontWeight: 500,
            }}
          >
            {eventDate.format("DD/MM/YYYY")}
          </Tag>
        );
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
              // changed: use id for participants route
              navigate(`/quanlisukien/su-kien/${record.id}/participants`)
            }
          >
            Danh sách
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() =>
              // changed: use id
              navigate(`/quanlisukien/su-kien/${record.id}`)
            }
          >
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  const approvalRate =
    stats.totalEvents > 0
      ? Math.round(
        ((stats.approvedEvents + stats.completedEvents) / stats.totalEvents) *
        100
      )
      : 0;
  const completionRate =
    stats.approvedEvents + stats.completedEvents > 0
      ? Math.round(
        (stats.completedEvents /
          (stats.approvedEvents + stats.completedEvents)) *
        100
      )
      : 0;
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
          <div style={{ marginTop: 8 }}>Đang tải dữ liệu dashboard...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div>
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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: "events",
            label: (
              <span className="text-base font-medium">
                <CalendarOutlined className="mr-2" />
                Sự kiện
              </span>
            ),
            children: (
              <EventsTab
                stats={stats}
                recentEvents={recentEvents}
                topEvents={topEvents}
                upcomingEvents={upcomingEvents}
                navigate={navigate}
                approvalRate={approvalRate}
                completionRate={completionRate}
                statusMapping={statusMapping}
                categoryMapping={categoryMapping}
                eventColumns={eventColumns}
                topEventColumns={topEventColumns}
                upcomingEventColumns={upcomingEventColumns}
              />
            ),
          },
          {
            key: "volunteers",
            label: (
              <span className="text-base font-medium">
                <TeamOutlined className="mr-2" />
                Tình nguyện viên
              </span>
            ),
            children: (
              <VolunteersTab
                stats={stats}
                filteredRegistrations={filteredRegistrations}
                participantApprovalRate={participantApprovalRate}
                volunteerColumns={volunteerColumns}
                handleVolunteerCardClick={handleVolunteerCardClick}
                activeVolunteerCard={activeVolunteerCard}
                sortStatus={sortStatus}
                handleSortStatusChange={handleSortStatusChange}
              />
            ),
          },
        ]}
      />

      {/* Modal từ chối với lý do */}
      <Modal
        title={
          <div className="text-xl font-bold text-red-500">Từ chối đăng ký</div>
        }
        open={isRejectModalOpen}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setSelectedRejectionReason("");
          setSelectedForRejection(null);
        }}
        onOk={handleConfirmRejection}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        centered
      >
        <div className="my-4">
          <p className="mb-4">
            Tình nguyện viên:{" "}
            <strong className="text-lg">{selectedForRejection?.name}</strong>
          </p>
          <p className="mb-2 font-semibold">Vui lòng chọn lý do từ chối:</p>
          <div className="space-y-2">
            {[
              "Không đủ điều kiện tham gia",
              "Đã đủ số lượng tình nguyện viên",
              "Không phù hợp với yêu cầu sự kiện",
              "Lịch trình không phù hợp",
              "Điểm uy tín không đủ",
              "Lý do khác",
            ].map((reason) => (
              <div
                key={reason}
                className={`p-3 border rounded cursor-pointer transition-all ${selectedRejectionReason === reason
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-red-300 hover:bg-gray-50"
                  }`}
                onClick={() => setSelectedRejectionReason(reason)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedRejectionReason === reason}
                    onChange={() => setSelectedRejectionReason(reason)}
                    className="mr-2"
                  />
                  <span>{reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal đánh giá volunteer */}
      <Modal
        footer={null}
        open={isRatingModalOpen}
        onCancel={() => setIsRatingModalOpen(false)}
        width={700}
        centered
      >
        <div className="text-center mb-8 mt-4">
          <h3 className="text-2xl font-bold text-gray-800">
            Đánh giá Tình Nguyện Viên
          </h3>
          <p className="text-gray-500 mt-2">
            Chọn mức độ hoàn thành của: <br />
            <span className="text-[#001529] font-bold text-3xl">
              {selectedParticipant?.volunteer?.name ||
                selectedParticipant?.user?.name}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 px-4 pb-6">
          {PERFORMANCE_OPTIONS.map((option) => (
            <div
              key={option.key}
              onClick={() =>
                !submittingRating && handleSubmitRating(option.key)
              }
              className={`group relative cursor-pointer rounded-xl border-2 p-6 transition-all ${option.color
                } ${submittingRating
                  ? "opacity-50 pointer-events-none"
                  : "hover:-translate-y-1 hover:shadow-lg"
                }`}
            >
              <div className="text-4xl mb-2 !text-white">{option.icon}</div>
              <div className="font-bold text-lg mb-1">{option.label}</div>
              <div className="text-sm opacity-80">
                {option.key === "GOOD" &&
                  "Hoàn thành tốt nhiệm vụ, thái độ tích cực."}
                {option.key === "AVERAGE" &&
                  "Hoàn thành nhiệm vụ ở mức cơ bản."}
                {option.key === "BAD" &&
                  "Thái độ không tốt hoặc không hoàn thành nhiệm vụ."}
                {option.key === "NO_SHOW" && "Đăng ký nhưng không tham gia."}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ========================================
// EVENTS TAB COMPONENT
// ========================================
const EventsTab = ({
  stats,
  recentEvents,
  topEvents,
  upcomingEvents,
  navigate,
  approvalRate,
  completionRate,
  eventColumns,
  topEventColumns,
  upcomingEventColumns,
}) => {
  return (
    <>
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
            onClick={() => navigate("/quanlisukien/su-kien?status=pending")}
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
            onClick={() => navigate("/quanlisukien/su-kien?status=approved")}
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
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: "4px solid #722ed1", borderRadius: 8 }}
            onClick={() => navigate("/quanlisukien/su-kien?status=completed")}
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

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                <span className="font-semibold">
                  Tỷ Lệ Sự Kiện Được Phê Duyệt
                </span>
              </Space>
            }
            className="shadow-md"
            style={{ borderRadius: 8 }}
          >
            <Progress
              percent={approvalRate}
              strokeColor="#52c41a"
              size={{ strokeWidth: 12 }}
            />
            <p className="text-center mt-3 text-gray-500">
              <span className="font-bold text-green-600">
                {stats.approvedEvents + stats.completedEvents}
              </span>{" "}
              / {stats.totalEvents} sự kiện
            </p>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <TrophyOutlined style={{ color: "#1890ff" }} />
                <span className="font-semibold">Tỷ Lệ Hoàn Thành</span>
              </Space>
            }
            className="shadow-md"
            style={{ borderRadius: 8 }}
          >
            <Progress
              percent={completionRate}
              strokeColor="#1890ff"
              size={{ strokeWidth: 12 }}
            />
            <p className="text-center mt-3 text-gray-500">
              <span className="font-bold text-blue-600">
                {stats.completedEvents}
              </span>{" "}
              / {stats.approvedEvents + stats.completedEvents} sự kiện
            </p>
          </Card>
        </Col>
      </Row>

      <div className="mb-6">
        <Card
          title={
            <Space>
              <CalendarOutlined style={{ color: "#1890ff" }} />
              <span className="font-semibold text-lg">Sự Kiện Sắp Diễn Ra</span>
            </Space>
          }
          className="shadow-md"
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
              rowKey={(r) => r.id}
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title={
            <Space>
              <FolderOpenOutlined style={{ color: "#1890ff" }} />
              <span className="font-semibold text-lg">Sự kiện gần đây</span>
            </Space>
          }
          extra={
            <Button
              type="link"
              onClick={() => navigate("/quanlisukien/su-kien")}
              className="text-blue-600 hover:text-blue-800"
            >
              Xem tất cả →
            </Button>
          }
          className="shadow-md"
          style={{ borderRadius: 8 }}
        >
          {recentEvents.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              dataSource={recentEvents}
              columns={eventColumns}
              rowKey={(r) => r.id}
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>

      <div className="mb-6">
        <Card
          title={
            <Space>
              <FireOutlined style={{ color: "#ff4d4f" }} />
              <span className="font-semibold text-lg">Sự Kiện Hot Nhất</span>
            </Space>
          }
          className="shadow-md"
          style={{ borderRadius: 8 }}
        >
          {topEvents.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              dataSource={topEvents}
              columns={topEventColumns}
              rowKey={(r) => r.id}
              pagination={false}
              size="small"
            />
          )}
        </Card>
      </div>
    </>
  );
};

// ========================================
// VOLUNTEERS TAB COMPONENT
// ========================================
const VolunteersTab = ({
  stats,
  filteredRegistrations,
  participantApprovalRate,
  volunteerColumns,
  handleVolunteerCardClick,
  activeVolunteerCard,
  sortStatus,
  handleSortStatusChange,
}) => {
  return (
    <>
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={8}>
          <Card
            className={`shadow-md cursor-pointer ${activeVolunteerCard === "all" ? "ring-2 ring-blue-400" : ""
              }`}
            style={{ borderTop: "4px solid #1890ff", borderRadius: 8 }}
            onClick={() => handleVolunteerCardClick("all")}
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
        <Col xs={24} sm={12} lg={8}>
          <Card
            className={`shadow-md cursor-pointer ${activeVolunteerCard === "approved" ? "ring-2 ring-green-400" : ""
              }`}
            style={{ borderTop: "4px solid #52c41a", borderRadius: 8 }}
            onClick={() => handleVolunteerCardClick("approved")}
          >
            <Statistic
              title={
                <span className="text-gray-600 font-medium">Đã Duyệt</span>
              }
              value={stats.approvedRegistrations}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              valueStyle={{ color: "#52c41a", fontWeight: "bold" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            className={`shadow-md cursor-pointer ${activeVolunteerCard === "pending" ? "ring-2 ring-yellow-400" : ""
              }`}
            style={{ borderTop: "4px solid #faad14", borderRadius: 8 }}
            onClick={() => handleVolunteerCardClick("pending")}
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
      </Row>

      <Card
        title={
          <Space>
            <UserOutlined style={{ color: "#722ed1" }} />
            <span>Tỷ Lệ Duyệt Người Tham Gia</span>
          </Space>
        }
        className="shadow-md mb-6"
        style={{ borderRadius: 8 }}
      >
        <Progress
          percent={participantApprovalRate}
          strokeColor="#722ed1"
          size={{ strokeWidth: 12 }}
        />
        <p className="text-center mt-3 text-gray-500 font-medium">
          {stats.approvedRegistrations} / {stats.totalRegistrations} đăng ký
        </p>
      </Card>

      <Card
        title={
          <div className="flex items-center justify-between">
            <Space>
              <ClockCircleOutlined style={{ color: "#faad14" }} />
              <span>Danh Sách Tình Nguyện Viên Cần Xử Lý</span>
            </Space>
            <Select
              value={sortStatus}
              onChange={handleSortStatusChange}
              style={{ width: 180 }}
              placeholder="Lọc theo trạng thái"
            >
              <Select.Option value="all">
                <span className="font-medium">Tất cả trạng thái</span>
              </Select.Option>
              <Select.Option value="pending">
                <Tag color="#DDB958" className="!border-none">
                  Chờ duyệt
                </Tag>
              </Select.Option>
              <Select.Option value="approved">
                <Tag color="#00C950" className="!border-none">
                  Đã duyệt
                </Tag>
              </Select.Option>
              <Select.Option value="completed">
                <Tag color="#2B7FFF" className="!border-none">
                  Hoàn thành
                </Tag>
              </Select.Option>
              <Select.Option value="rejected">
                <Tag color="red" className="!border-none">
                  Từ chối
                </Tag>
              </Select.Option>
            </Select>
          </div>
        }
        className="shadow-md"
        style={{ borderRadius: 8 }}
      >
        {filteredRegistrations.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có dữ liệu"
          />
        ) : (
          <Table
            dataSource={filteredRegistrations}
            columns={volunteerColumns}
            rowKey={(r) => r.id}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 1200 }}
          />
        )}
      </Card>
    </>
  );
};
