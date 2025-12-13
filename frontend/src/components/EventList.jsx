import React, { useEffect, useState, useMemo } from "react";
import { Calendar, Users, MapPin, Heart, Share2, Search } from "lucide-react";
import { GetEvents, GetEventActionStats } from "../services/EventService";
import {
  GetMyEvent,
  CheckEventStatus,
  EventActions,
} from "../services/UserService";
import Swal from "sweetalert2";

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

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // State lưu trạng thái Like của user (Key: eventId, Value: boolean)
  const [likedEvents, setLikedEvents] = useState({});

  // State lưu dữ liệu tham gia của user (Key: eventId, Value: status string)
  const [userParticipationMap, setUserParticipationMap] = useState({});

  const [filters, setFilters] = useState({
    category: "",
    status: "",
    query: "",
    dateOrder: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    category: "",
    status: "",
    dateOrder: "",
  });

  const [tab, setTab] = useState("all");
  // eslint-disable-next-line no-unused-vars
  const [myEvents, setMyEvents] = useState([]);

  // ----------------------------------------------------------------
  // 1. CÁC HÀM HỖ TRỢ LẤY DỮ LIỆU (STATS, STATUS)
  // ----------------------------------------------------------------

  // ✅ Helper: Lấy số liệu thống kê (Like/Share/View) cho TOÀN BỘ danh sách
  const fetchAllRealtimeStats = async (eventList) => {
    if (!eventList || eventList.length === 0) return;

    // Gọi song song tất cả request để tối ưu tốc độ
    const updatedStats = await Promise.all(
      eventList.map(async (event) => {
        try {
          const res = await GetEventActionStats(event._id);
          if (res.status === 200) {
            return {
              id: event._id,
              stats: res.data, // { likesCount, sharesCount, viewsCount }
            };
          }
        } catch (error) {
          console.error(`Lỗi lấy stats event ${event._id}`, error);
        }
        return null;
      })
    );

    // Cập nhật state events một lần duy nhất
    setEvents((prevEvents) =>
      prevEvents.map((ev) => {
        const newStat = updatedStats.find((item) => item && item.id === ev._id);
        if (newStat) {
          return {
            ...ev,
            likes: newStat.stats.likesCount,
            shares: newStat.stats.sharesCount,
            views: newStat.stats.viewsCount,
          };
        }
        return ev;
      })
    );
  };

  // ✅ Helper: Cập nhật số liệu cho 1 sự kiện cụ thể (Dùng sau khi tương tác)
  const updateSingleEventStats = async (eventId) => {
    try {
      const res = await GetEventActionStats(eventId);
      if (res.status === 200) {
        const { likesCount, sharesCount, viewsCount } = res.data;
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev._id === eventId
              ? {
                  ...ev,
                  likes: likesCount,
                  shares: sharesCount,
                  views: viewsCount,
                }
              : ev
          )
        );
      }
    } catch (error) {
      console.error(`Lỗi cập nhật stats đơn lẻ ${eventId}:`, error);
    }
  };

  // ✅ Helper: Check User đã Like bài nào chưa
  const checkLikeStatuses = async (eventList) => {
    if (!eventList || eventList.length === 0) return;

    // Chỉ check những event chưa có trong state để tránh gọi lại
    const eventsToCheck = eventList.filter(
      (e) => likedEvents[e._id] === undefined
    );
    if (eventsToCheck.length === 0) return;

    const statusMap = {};
    await Promise.all(
      eventsToCheck.map(async (event) => {
        try {
          const res = await CheckEventStatus(event._id);
          if (res.status === 200) {
            statusMap[event._id] = res.data.hasLiked;
          }
        } catch (error) {
          statusMap[event._id] = false;
        }
      })
    );
    setLikedEvents((prev) => ({ ...prev, ...statusMap }));
  };

  // ----------------------------------------------------------------
  // 2. USE EFFECTS (FETCH DATA ban đầu)
  // ----------------------------------------------------------------

  // ✅ Fetch events (Tất cả sự kiện công khai)
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await GetEvents();
        if (res.status === 200) {
          const eventsWithTranslatedCategories = res.data.map((event) => ({
            ...event,
            category: categoryMapping[event.category] || event.category,
          }));

          setEvents(eventsWithTranslatedCategories);
          setFilteredEvents(eventsWithTranslatedCategories);

          // 1. Check trạng thái Like của user
          checkLikeStatuses(eventsWithTranslatedCategories);

          // 2. Lấy số liệu thống kê mới nhất ngay lập tức
          fetchAllRealtimeStats(eventsWithTranslatedCategories);
        }
      } catch (err) {
        console.error("Lỗi lấy sự kiện:", err);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  // ✅ Fetch my events và tạo Map trạng thái tham gia
  useEffect(() => {
    async function fetchMyEvents() {
      try {
        const res = await GetMyEvent();
        if (res.status === 200) {
          const myEventList = res.data || [];
          setMyEvents(myEventList);

          // Map: { eventId: status } -> Giúp tra cứu nhanh O(1)
          const statusMap = {};
          myEventList.forEach((item) => {
            if (item.event && item.event._id) {
              statusMap[item.event._id] = item.status;
            }
          });
          setUserParticipationMap(statusMap);
        }
      } catch (error) {
        console.error("Lỗi lấy sự kiện đã tham gia:", error);
      }
    }
    fetchMyEvents();
  }, []);

  // ✅ Polling: Tự động cập nhật số liệu mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => {
      if (filteredEvents.length > 0) {
        fetchAllRealtimeStats(filteredEvents);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [filteredEvents]);

  // ✅ Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(filters.query);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters.query]);

  // ----------------------------------------------------------------
  // 3. FILTER LOGIC (CORE)
  // ----------------------------------------------------------------

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    let filtered = [...events];

    // 1. Lọc theo TAB
    if (tab === "joined") {
      // ĐÃ ĐĂNG KÝ: Có trạng thái bất kỳ trong map
      filtered = filtered.filter((event) => userParticipationMap[event._id]);
    } else if (tab === "notJoined") {
      // CHƯA ĐĂNG KÝ: Không có trong map
      filtered = filtered.filter((event) => !userParticipationMap[event._id]);
    } else if (tab === "liked") {
      filtered = filtered.filter((event) => likedEvents[event._id]);
    }

    // 2. Lọc theo Category
    if (appliedFilters.category) {
      filtered = filtered.filter(
        (event) => event.category === appliedFilters.category
      );
    }

    // 3. Lọc theo Status Dropdown (Trạng thái tham gia của user)
    if (appliedFilters.status) {
      filtered = filtered.filter(
        (event) => userParticipationMap[event._id] === appliedFilters.status
      );
    }

    // 4. Lọc theo Search
    if (debouncedQuery.trim()) {
      filtered = filtered.filter(
        (event) =>
          softMatch(event.name || "", debouncedQuery) ||
          softMatch(event.location || "", debouncedQuery)
      );
    }

    // 5. Sort Date
    if (appliedFilters.dateOrder === "asc") {
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (appliedFilters.dateOrder === "desc") {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      const originalOrder = new Map(events.map((e, idx) => [e._id, idx]));
      filtered.sort(
        (a, b) =>
          (originalOrder.get(a._id) || 0) - (originalOrder.get(b._id) || 0)
      );
    }

    setFilteredEvents(filtered);
  }, [
    events,
    appliedFilters,
    debouncedQuery,
    tab,
    likedEvents,
    userParticipationMap,
  ]);

  const applyFilter = () => {
    setAppliedFilters({
      category: filters.category,
      status: filters.status,
      dateOrder: filters.dateOrder,
    });
  };

  // ----------------------------------------------------------------
  // 4. USER INTERACTIONS (LIKE, SHARE, VIEW)
  // ----------------------------------------------------------------

  const handleInteraction = async (e, eventId, type) => {
    e.stopPropagation();
    try {
      // --- LIKE ---
      if (type === "LIKE") {
        const isCurrentlyLiked = likedEvents[eventId];

        // Optimistic Update
        setLikedEvents((prev) => ({ ...prev, [eventId]: !isCurrentlyLiked }));
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev._id === eventId
              ? { ...ev, likes: ev.likes + (isCurrentlyLiked ? -1 : 1) }
              : ev
          )
        );

        await EventActions(eventId, { type: "LIKE" });
        await updateSingleEventStats(eventId); // Đồng bộ lại số chuẩn
      }

      // --- SHARE ---
      if (type === "SHARE") {
        // Optimistic Update
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev._id === eventId ? { ...ev, shares: ev.shares + 1 } : ev
          )
        );

        const res = await EventActions(eventId, { type: "SHARE" });
        const shareLink =
          res.data?.link || `${window.location.origin}/su-kien/${eventId}`;

        navigator.clipboard.writeText(shareLink);
        Swal.fire({
          icon: "success",
          title: "Đã sao chép!",
          text: "Liên kết sự kiện đã được sao chép vào bộ nhớ tạm.",
          confirmButtonText: "OK",
          confirmButtonColor: "#DDB958",
          timer: 2000,
          timerProgressBar: true,
        });

        await updateSingleEventStats(eventId); // Đồng bộ lại số chuẩn
      }
    } catch (error) {
      console.error(`Lỗi thực hiện hành động ${type}:`, error);
      // Rollback UI nếu lỗi Like
      if (type === "LIKE") {
        const isCurrentlyLiked = likedEvents[eventId];
        setLikedEvents((prev) => ({ ...prev, [eventId]: !isCurrentlyLiked }));
        setEvents((prevEvents) =>
          prevEvents.map((ev) =>
            ev._id === eventId
              ? { ...ev, likes: ev.likes + (!isCurrentlyLiked ? -1 : 1) }
              : ev
          )
        );
      }
    }
  };

  const handleViewDetail = async (eventId) => {
    try {
      EventActions(eventId, { type: "VIEW" });
    } catch (error) {
      console.error("Lỗi cập nhật lượt xem", error);
    }
    window.location.href = `/su-kien/${eventId}`;
  };

  // ----------------------------------------------------------------
  // 5. UTILS & RENDER
  // ----------------------------------------------------------------

  const tabCounts = useMemo(() => {
    return {
      all: events.length,
      joined: events.filter((e) => userParticipationMap[e._id]).length,
      notJoined: events.filter((e) => !userParticipationMap[e._id]).length,
      liked: Object.values(likedEvents).filter(Boolean).length,
      forYou: 0,
    };
  }, [events, userParticipationMap, likedEvents]);

  const removeVietnameseTones = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();

  const softMatch = (source, keyword) => {
    source = removeVietnameseTones(source);
    keyword = removeVietnameseTones(keyword);
    if (source.includes(keyword)) return true;
    let diff = 0;
    let minLen = Math.min(source.length, keyword.length);
    for (let i = 0; i < minLen; i++) {
      if (source[i] !== keyword[i]) diff++;
      if (diff > 2) return false;
    }
    return true;
  };

  if (loading) return <p className="text-center text-lg">Đang tải...</p>;

  return (
    <div>
      {/* FILTER UI */}
      <div className="flex flex-wrap items-left gap-4 mb-8">
        <select
          name="category"
          className="border border-gray-300 rounded-md px-3 py-2"
          value={filters.category}
          onChange={handleFilterChange}
        >
          <option value="">Loại sự kiện</option>
          <option value="Cộng đồng">Cộng đồng</option>
          <option value="Giáo dục">Giáo dục</option>
          <option value="Sức khỏe">Sức khỏe</option>
          <option value="Môi trường">Môi trường</option>
          <option value="Sự kiện">Sự kiện</option>
          <option value="Kỹ thuật">Kỹ thuật</option>
          <option value="Cứu trợ khẩn cấp">Cứu trợ khẩn cấp</option>
          <option value="Trực tuyến">Trực tuyến</option>
          <option value="Doanh nghiệp">Doanh nghiệp</option>
        </select>

        <select
          name="status"
          className="border border-gray-300 rounded-md px-3 py-2 min-w-[150px]"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Đang chờ duyệt</option>
          <option value="approved">Đăng ký thành công</option>
          <option value="completed">Đã hoàn thành</option>
          <option value="rejected">Bị từ chối</option>
        </select>

        <select
          name="dateOrder"
          className="border border-gray-300 rounded-md px-3 py-2"
          value={filters.dateOrder}
          onChange={handleFilterChange}
        >
          <option value="">Thời gian</option>
          <option value="asc">Gần đến xa</option>
          <option value="desc">Xa đến gần</option>
        </select>

        <button
          className="bg-[#DCBA58] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#caa445]"
          onClick={applyFilter}
        >
          Lọc
        </button>

        <div className="flex w-[35vw] items-center border border-gray-300 rounded-full px-3 py-2 ml-10 shadow shadow-md">
          <input
            type="text"
            name="query"
            value={filters.query}
            placeholder="Tìm kiếm tên sự kiện hoặc địa điểm..."
            className="flex-1 outline-none"
            onChange={handleFilterChange}
          />
          <Search size={18} className="text-gray-500" />
        </div>
      </div>

      {/* TAB TAG */}
      <div className="flex gap-12 border-b-2 border-gray-600 text-xl font-medium text-gray-600 mb-6 pl-4 mt-10 overflow-x-auto">
        {[
          { key: "all", label: "Tất Cả" },
          { key: "joined", label: "Đã Đăng Ký" },
          { key: "notJoined", label: "Chưa Đăng Ký" },
          { key: "liked", label: "Đã Yêu Thích" },
          { key: "forYou", label: "Dành Cho Bạn" },
        ].map(({ key, label }) => {
          const count = tabCounts[key] || 0;
          const isActive = tab === key;

          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative pb-2 whitespace-nowrap ${
                isActive
                  ? "text-[#DDB958] font-semibold"
                  : "hover:text-gray-900"
              }`}
            >
              {label} ({count})
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 w-full h-[3px] bg-[#DDB958]"
                  style={{ borderRadius: "10px 10px 0 0" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* EVENT LIST */}
      {filteredEvents.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p className="text-xl">Không tìm thấy sự kiện nào</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {filteredEvents.map((event) => {
            const isLiked = likedEvents[event._id] || false;
            const userStatus = userParticipationMap[event._id];

            return (
              <div
                key={event._id}
                className="bg-white rounded-2xl shadow-md overflow-hidden w-[400px] hover:shadow-xl transition mt-4 h-[750px] flex flex-col cursor-pointer relative"
                onClick={() => handleViewDetail(event._id)}
              >
                {/* Badge trạng thái user */}
                {userStatus && (
                  <div
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-bold shadow-md z-10
                        ${
                          userStatus === "approved"
                            ? "bg-green-500"
                            : userStatus === "pending"
                            ? "bg-yellow-500"
                            : userStatus === "rejected"
                            ? "bg-red-500"
                            : userStatus === "completed"
                            ? "bg-blue-500"
                            : "bg-gray-500"
                        }`}
                  >
                    {userStatus === "approved"
                      ? "Đã đăng ký"
                      : userStatus === "pending"
                      ? "Chờ duyệt"
                      : userStatus === "rejected"
                      ? "Bị từ chối"
                      : userStatus === "completed"
                      ? "Hoàn thành"
                      : userStatus}
                  </div>
                )}

                <img
                  src={
                    event.coverImage?.startsWith("http")
                      ? event.coverImage
                      : `http://localhost:5000${event.coverImage}`
                  }
                  alt={event.name}
                  className="h-[420px] w-full object-cover"
                />

                <div className="px-6 py-5 flex-1 flex flex-col justify-between">
                  <h2 className="font-semibold text-xl leading-6 mb-4 line-clamp-2 h-[3rem]">
                    {event.name}
                  </h2>

                  <div className="flex gap-6 items-start flex-1">
                    <div className="flex flex-col text-gray-700 text-[15px] gap-4 w-[140px] min-h-[120px]">
                      <div className="flex gap-2 items-center border-b pb-2">
                        <Calendar size={18} />
                        <span>
                          {new Date(event.date).toLocaleDateString("vi-VN")}
                        </span>
                      </div>

                      <div className="flex gap-2 items-center border-b pb-2">
                        <Users size={18} />
                        <span>
                          {event.currentParticipants || 0}/
                          {event.maxParticipants || 50}
                        </span>
                      </div>

                      <div className="flex gap-2 items-center">
                        <MapPin size={18} />
                        <span className="line-clamp-2">{event.location}</span>
                      </div>
                    </div>

                    <div className="text-gray-700 leading-6 border-l-[2px] border-[#DDB958] pl-2 w-[190px] min-h-[120px]">
                      <div
                        className="prose prose-lg max-w-none text-[15px] line-clamp-6"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-6 text-[15px]">
                      <button
                        className="flex items-center gap-2 hover:scale-110 transition-transform"
                        onClick={(e) => handleInteraction(e, event._id, "LIKE")}
                      >
                        <Heart
                          size={24}
                          strokeWidth={1.5}
                          className={`${
                            isLiked
                              ? "text-red-600 fill-red-600"
                              : "text-gray-600"
                          }`}
                        />
                        <span className="font-medium text-gray-700">
                          {event.likes || 0}
                        </span>
                      </button>

                      <button
                        className="flex items-center gap-2 hover:scale-110 transition-transform"
                        onClick={(e) =>
                          handleInteraction(e, event._id, "SHARE")
                        }
                      >
                        <Share2
                          size={24}
                          strokeWidth={1.5}
                          className="text-blue-500"
                        />
                        <span className="font-medium text-gray-700">
                          {event.shares || 0}
                        </span>
                      </button>
                    </div>

                    <button
                      className="bg-[#DCBA58] text-white px-6 py-2.5 rounded-lg font-medium text-[15px] hover:bg-[#caa445]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(event._id);
                      }}
                    >
                      Chi Tiết
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
