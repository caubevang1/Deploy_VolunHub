import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Calendar, Users, MapPin, Heart, Share2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GetEvents, GetEventActionStats } from "../services/EventService";
import {
  GetMyEvent,
  CheckEventStatus,
  EventActions,
} from "../services/UserService";
import Swal from "sweetalert2";

// --- UTILS ---
const removeVietnameseTones = (str) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const softMatch = (source, keyword) => {
  const normalizedSource = removeVietnameseTones(source);
  const normalizedKeyword = removeVietnameseTones(keyword);
  if (normalizedSource.includes(normalizedKeyword)) return true;
  let diff = 0;
  let minLen = Math.min(normalizedSource.length, normalizedKeyword.length);
  for (let i = 0; i < minLen; i++) {
    if (normalizedSource[i] !== normalizedKeyword[i]) diff++;
    if (diff > 2) return false;
  }
  return true;
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

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [likedEvents, setLikedEvents] = useState({});
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

  // 1. CÁC HÀM HỖ TRỢ (Dùng useCallback để ổn định dependency)
  const fetchAllRealtimeStats = useCallback(async (eventList) => {
    if (!eventList || eventList.length === 0) return;
    const updatedStats = await Promise.all(
      eventList.map(async (event) => {
        try {
          const res = await GetEventActionStats(event._id);
          if (res.status === 200) return { id: event._id, stats: res.data };
        } catch (error) {
          console.error(`Stats error: ${event._id}`, error);
        }
        return null;
      })
    );
    setEvents((prev) =>
      prev.map((ev) => {
        const newStat = updatedStats.find((item) => item && item.id === ev._id);
        return newStat ? { ...ev, ...newStat.stats } : ev;
      })
    );
  }, []);

  const checkLikeStatuses = useCallback(async (eventList) => {
    if (!eventList || eventList.length === 0) return;
    const eventsToCheck = eventList.filter((e) => likedEvents[e._id] === undefined);
    if (eventsToCheck.length === 0) return;

    const statusMap = {};
    await Promise.all(
      eventsToCheck.map(async (event) => {
        try {
          const res = await CheckEventStatus(event._id);
          if (res.status === 200) statusMap[event._id] = res.data.hasLiked;
        } catch (err) {
          console.error("Check like error", err); // Đã dùng 'err' để tránh lỗi unused-vars
          statusMap[event._id] = false;
        }
      })
    );
    setLikedEvents((prev) => ({ ...prev, ...statusMap }));
  }, [likedEvents]);

  // 2. FETCH DATA BAN ĐẦU
  useEffect(() => {
    async function init() {
      try {
        const res = await GetEvents();
        if (res.status === 200) {
          const translated = res.data.map((event) => ({
            ...event,
            category: categoryMapping[event.category] || event.category,
          }));
          setEvents(translated);
          checkLikeStatuses(translated);
          fetchAllRealtimeStats(translated);
        }
      } catch (err) {
        console.error("Fetch events error", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [checkLikeStatuses, fetchAllRealtimeStats]);

  useEffect(() => {
    async function fetchMy() {
      try {
        const res = await GetMyEvent();
        if (res.status === 200) {
          const statusMap = {};
          (res.data || []).forEach((item) => {
            if (item.event?._id) statusMap[item.event._id] = item.status;
          });
          setUserParticipationMap(statusMap);
        }
      } catch (err) {
        console.error("My events error", err);
      }
    }
    fetchMy();
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(filters.query), 300);
    return () => clearTimeout(handler);
  }, [filters.query]);

  // 3. CORE LOGIC: THAY THẾ useEffect BẰNG useMemo (Sửa lỗi cascading renders)
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Lọc theo Tab
    if (tab === "joined") result = result.filter((e) => userParticipationMap[e._id]);
    else if (tab === "notJoined") result = result.filter((e) => !userParticipationMap[e._id]);
    else if (tab === "liked") result = result.filter((e) => likedEvents[e._id]);

    // Lọc theo Dropdown
    if (appliedFilters.category) result = result.filter((e) => e.category === appliedFilters.category);
    if (appliedFilters.status) result = result.filter((e) => userParticipationMap[e._id] === appliedFilters.status);

    // Tìm kiếm
    if (debouncedQuery.trim()) {
      result = result.filter((e) => 
        softMatch(e.name || "", debouncedQuery) || softMatch(e.location || "", debouncedQuery)
      );
    }

    // Sắp xếp
    if (appliedFilters.dateOrder === "asc") result.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (appliedFilters.dateOrder === "desc") result.sort((a, b) => new Date(b.date) - new Date(a.date));

    return result;
  }, [events, appliedFilters, debouncedQuery, tab, likedEvents, userParticipationMap]);

  // Polling (Stats tự động)
  useEffect(() => {
    const interval = setInterval(() => {
      if (filteredEvents.length > 0) fetchAllRealtimeStats(filteredEvents);
    }, 30000);
    return () => clearInterval(interval);
  }, [filteredEvents, fetchAllRealtimeStats]);

  const applyFilter = () => {
    setAppliedFilters({
      category: filters.category,
      status: filters.status,
      dateOrder: filters.dateOrder,
    });
  };

  const handleInteraction = async (e, eventId, type) => {
    e.stopPropagation();
    try {
      if (type === "LIKE") {
        const isLiked = !!likedEvents[eventId];
        setLikedEvents(prev => ({ ...prev, [eventId]: !isLiked }));
        setEvents(prev => prev.map(ev => ev._id === eventId ? { ...ev, likes: (ev.likes || 0) + (isLiked ? -1 : 1) } : ev));
        await EventActions(eventId, { type: "LIKE" });
      }
      if (type === "SHARE") {
        const res = await EventActions(eventId, { type: "SHARE" });
        navigator.clipboard.writeText(res.data?.link || `${window.location.origin}/su-kien/${eventId}`);
        Swal.fire({ icon: "success", title: "Đã sao chép link!", timer: 1500 });
      }
    } catch (err) { console.error(err); }
  };

  const handleViewDetail = (eventId) => {
    EventActions(eventId, { type: "VIEW" }).catch(() => {});
    navigate(`/su-kien/${eventId}`);
  };

  const tabCounts = useMemo(() => ({
    all: events.length,
    joined: events.filter((e) => userParticipationMap[e._id]).length,
    notJoined: events.filter((e) => !userParticipationMap[e._id]).length,
    liked: Object.values(likedEvents).filter(Boolean).length,
    forYou: 0,
  }), [events, userParticipationMap, likedEvents]);

  if (loading) return <p className="text-center py-10">Đang tải...</p>;

  return (
    <div className="px-2 md:px-0">
      {/* --- PHẦN UI GIỮ NGUYÊN NHƯ CŨ --- */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <select name="category" className="border p-2 rounded" value={filters.category} onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))}>
          <option value="">Loại sự kiện</option>
          {Object.values(categoryMapping).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select name="status" className="border p-2 rounded" value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Thành công</option>
        </select>

        <button className="bg-[#DCBA58] text-white px-6 py-2 rounded" onClick={applyFilter}>Lọc</button>

        <div className="flex-1 flex items-center border rounded-full px-4 ml-0 md:ml-10 shadow-sm">
          <input type="text" placeholder="Tìm kiếm..." className="flex-1 outline-none" value={filters.query} onChange={(e) => setFilters(p => ({ ...p, query: e.target.value }))} />
          <Search size={18} className="text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b mb-6 overflow-x-auto">
        {[{ key: "all", label: "Tất Cả" }, { key: "joined", label: "Đã Đăng Ký" }, { key: "notJoined", label: "Chưa Đăng Ký" }, { key: "liked", label: "Yêu Thích" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`pb-2 ${tab === t.key ? "border-b-2 border-[#DDB958] text-[#DDB958]" : ""}`}>
            {t.label} ({tabCounts[t.key]})
          </button>
        ))}
      </div>

      {/* Grid danh sách */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div key={event._id} className="bg-white rounded-2xl shadow-md overflow-hidden border hover:shadow-lg transition cursor-pointer" onClick={() => handleViewDetail(event._id)}>
            <div className="relative">
              <img src={event.coverImage?.startsWith("http") ? event.coverImage : `http://localhost:5000${event.coverImage}`} alt={event.name} className="h-60 w-full object-cover" />
              {userParticipationMap[event._id] && (
                <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                  {userParticipationMap[event._id] === 'approved' ? 'Đã tham gia' : 'Đang chờ'}
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.name}</h3>
              <div className="text-sm text-gray-600 space-y-2 mb-4">
                <div className="flex items-center gap-2"><Calendar size={14} /> {new Date(event.date).toLocaleDateString("vi-VN")}</div>
                <div className="flex items-center gap-2"><MapPin size={14} /> {event.location}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button onClick={(e) => handleInteraction(e, event._id, "LIKE")} className="flex items-center gap-1">
                    <Heart size={20} className={likedEvents[event._id] ? "fill-red-500 text-red-500" : ""} /> {event.likes || 0}
                  </button>
                  <button onClick={(e) => handleInteraction(e, event._id, "SHARE")} className="text-blue-500"><Share2 size={20} /></button>
                </div>
                <button className="bg-[#DCBA58] text-white px-4 py-1.5 rounded text-sm">Chi tiết</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}