import React, {
    useEffect,
    useState,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { Calendar, MapPin, Heart, Share2, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GetEvents, GetEventsActionStatsBatch } from "../services/EventService";
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

    // 1. CÁC HÀM HỖ TRỢ
    const fetchAllRealtimeStats = useCallback(async (eventList) => {
        if (!eventList || eventList.length === 0) return;
        try {
            const ids = eventList.map((e) => e.id);
            const res = await GetEventsActionStatsBatch(ids);
            if (res.status === 200 && res.data && res.data.stats) {
                const statsMap = res.data.stats;
                setEvents((prev) =>
                    prev.map((ev) => {
                        const currentId = ev.id;
                        return {
                            ...ev,
                            ...(statsMap[currentId] || {
                                likesCount: ev.likesCount ?? 0,
                                sharesCount: ev.sharesCount ?? 0,
                                viewsCount: ev.viewsCount ?? 0,
                            }),
                        };
                    })
                );
            }
        } catch (err) {
            console.error("Batch stats fetch error:", err);
        }
    }, []);

    const checkLikeStatuses = useCallback(
        async (eventList) => {
            if (!eventList || eventList.length === 0) return;
            const eventsToCheck = eventList.filter(
                (e) => likedEvents[e.id] === undefined
            );
            if (eventsToCheck.length === 0) return;

            const statusMap = {};
            await Promise.all(
                eventsToCheck.map(async (event) => {
                    try {
                        const currentId = event.id;
                        const res = await CheckEventStatus(currentId);
                        if (res.status === 200) statusMap[currentId] = res.data.hasLiked;
                    } catch (err) {
                        console.error("Check like error", err);
                        statusMap[event.id] = false;
                    }
                })
            );
            setLikedEvents((prev) => ({ ...prev, ...statusMap }));
        },
        [likedEvents]
    );

    // 2. FETCH DATA BAN ĐẦU
    useEffect(() => {
        async function init() {
            try {
                const res = await GetEvents();
                if (res.status === 200) {
                    const rawData = Array.isArray(res.data)
                        ? res.data
                        : res.data?.events || [];
                    const raw = rawData.map((event) => ({
                        ...event,
                        id: event.id,
                        category: categoryMapping[event.category] || event.category,
                    }));

                    try {
                        const ids = raw.map((r) => r.id);
                        const statsRes = await GetEventsActionStatsBatch(ids);
                        if (statsRes.status === 200 && statsRes.data?.stats) {
                            const statsMap = statsRes.data.stats;
                            const merged = raw.map((ev) => ({
                                ...ev,
                                ...(statsMap[ev.id] || {
                                    likesCount: ev.likesCount ?? 0,
                                    sharesCount: ev.sharesCount ?? 0,
                                    viewsCount: ev.viewsCount ?? 0,
                                }),
                            }));
                            setEvents(merged);
                        } else {
                            setEvents(raw);
                        }
                    } catch (e) {
                        console.warn("Batch stats failed, falling back:", e);
                        setEvents(raw);
                    }


                    // Restore checking like statuses for visible events
                    if (merged.length > 0) {
                        // Check status for the first batch of events
                        const initialIds = merged.slice(0, 10).map((e) => e.id);
                    }
                }
            } catch (err) {
                console.error("Fetch events error", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    // Restore checkLikeStatuses usage if needed, or rely on lazy loading.
    // If we want to show likes immediately, we should call it.
    useEffect(() => {
        if (events.length > 0) {
            checkLikeStatuses(events);
        }
    }, [events, checkLikeStatuses]);

    useEffect(() => {
        async function fetchMy() {
            try {
                const res = await GetMyEvent();
                if (res.status === 200) {
                    const statusMap = {};
                    const list = Array.isArray(res.data)
                        ? res.data
                        : res.data?.items || [];
                    list.forEach((item) => {
                        const eventId = item.event?.id;
                        if (eventId) statusMap[eventId] = item;
                    });
                    setUserParticipationMap(statusMap);
                }
            } catch (err) {
                console.error("My events error", err);
            }
        }
        fetchMy();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(filters.query), 300);
        return () => clearTimeout(handler);
    }, [filters.query]);

    // 3. CORE LOGIC
    const filteredEvents = useMemo(() => {
        let result = [...events];

        if (tab === "joined")
            result = result.filter((e) => userParticipationMap[e.id]);
        else if (tab === "notJoined")
            result = result.filter((e) => !userParticipationMap[e.id]);
        else if (tab === "liked") result = result.filter((e) => likedEvents[e.id]);

        if (appliedFilters.category)
            result = result.filter((e) => e.category === appliedFilters.category);
        if (appliedFilters.status)
            result = result.filter(
                (e) => userParticipationMap[e.id]?.status === appliedFilters.status
            );

        if (debouncedQuery.trim()) {
            result = result.filter(
                (e) =>
                    softMatch(e.name || "", debouncedQuery) ||
                    softMatch(e.location || "", debouncedQuery)
            );
        }

        if (appliedFilters.dateOrder === "asc")
            result.sort((a, b) => new Date(a.date) - new Date(b.date));
        else if (appliedFilters.dateOrder === "desc")
            result.sort((a, b) => new Date(b.date) - new Date(a.date));

        return result;
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

    const handleInteraction = async (e, eventId, type) => {
        e.stopPropagation();
        try {
            if (type === "LIKE") {
                const currentLikedState = !!likedEvents[eventId];
                const nextLikedState = !currentLikedState;

                // Optimistic Update
                setLikedEvents((prev) => ({ ...prev, [eventId]: nextLikedState }));
                setEvents((prev) =>
                    prev.map((ev) =>
                        ev.id === eventId
                            ? {
                                ...ev,
                                likesCount: Math.max(
                                    0,
                                    (ev.likesCount ?? 0) + (nextLikedState ? 1 : -1)
                                ),
                            }
                            : ev
                    )
                );

                // Gọi API với value cụ thể để đảm bảo đồng bộ
                await EventActions(eventId, { type: "LIKE", value: nextLikedState });
            }
            if (type === "SHARE") {
                // Optimistic update
                setEvents((prev) =>
                    prev.map((ev) =>
                        ev.id === eventId
                            ? { ...ev, sharesCount: (ev.sharesCount ?? 0) + 1 }
                            : ev
                    )
                );
                const res = await EventActions(eventId, { type: "SHARE" });

                // Cập nhật lại số lượng thực tế từ server
                if (res.data?.sharesCount !== undefined) {
                    setEvents((prev) =>
                        prev.map((ev) =>
                            ev.id === eventId
                                ? { ...ev, sharesCount: res.data.sharesCount }
                                : ev
                        )
                    );
                }

                navigator.clipboard.writeText(
                    res.data?.shareLink ||
                    res.data?.link ||
                    `${window.location.origin}/su-kien/${eventId}`
                );
                Swal.fire({ icon: "success", title: "Đã sao chép link!", timer: 1500 });
            }
        } catch (err) {
            console.error(err);
            // Rollback optimistic update if failed
            if (type === "LIKE") {
                const currentLikedState = !!likedEvents[eventId];
                setLikedEvents((prev) => ({
                    ...prev,
                    [eventId]: !likedEvents[eventId],
                })); // This might be wrong if state updated.

                try {
                    const statusRes = await CheckEventStatus(eventId);
                    const serverLiked =
                        statusRes.status === 200 ? !!statusRes.data.hasLiked : false;
                    setLikedEvents((prev) => ({ ...prev, [eventId]: serverLiked }));
                    const statsRes = await GetEventsActionStatsBatch([eventId]);
                    if (statsRes.data?.stats?.[eventId]) {
                        const realStats = statsRes.data.stats[eventId];
                        setEvents((prev) =>
                            prev.map((ev) =>
                                ev.id === eventId ? { ...ev, ...realStats } : ev
                            )
                        );
                    }
                } catch (e) {
                    console.error("Rollback failed", e);
                }
            }
        }
    };

    const handleViewDetail = (eventId) => {
        EventActions(eventId, { type: "VIEW" }).catch(() => { });
        navigate(`/su-kien/${eventId}`);
    };

    const tabCounts = useMemo(
        () => ({
            all: events.length,
            joined: events.filter((e) => userParticipationMap[e.id]).length,
            notJoined: events.filter((e) => !userParticipationMap[e.id]).length,
            liked: Object.values(likedEvents).filter(Boolean).length,
            forYou: 0,
        }),
        [events, userParticipationMap, likedEvents]
    );

    if (loading) return <p className="text-center py-10">Đang tải...</p>;

    return (
        <div>
            <div className="px-2 md:px-0 flex flex-col md:flex-row gap-3 mb-6">
                <select
                    name="category"
                    className="border border-gray-300 p-2 rounded"
                    value={filters.category}
                    onChange={(e) =>
                        setFilters((p) => ({ ...p, category: e.target.value }))
                    }
                >
                    <option value="">Loại sự kiện</option>
                    {Object.values(categoryMapping).map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <select
                    name="status"
                    className="border border-gray-300 p-2 rounded"
                    value={filters.status}
                    onChange={(e) =>
                        setFilters((p) => ({ ...p, status: e.target.value }))
                    }
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Thành công</option>
                </select>

                <button
                    className="bg-[#DCBA58] text-white px-6 py-2 rounded"
                    onClick={applyFilter}
                >
                    Lọc
                </button>

                <div className="flex-1 flex items-center border border-gray-300 rounded-full px-4 ml-0 md:ml-10 shadow-sm">
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="flex-1 outline-none"
                        value={filters.query}
                        onChange={(e) =>
                            setFilters((p) => ({ ...p, query: e.target.value }))
                        }
                    />
                    <Search size={18} className="text-gray-400" />
                </div>
            </div>

            <div className="px-2 md:px-0">
                <div className="flex gap-6 md:gap-12 border-b-2 border-gray-700 mb-6 overflow-x-auto">
                    {[
                        { key: "all", label: "Tất Cả" },
                        { key: "joined", label: "Đã Đăng Ký" },
                        { key: "notJoined", label: "Chưa Đăng Ký" },
                        { key: "liked", label: "Yêu Thích" },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`pb-2 whitespace-nowrap text-base md:text-xl font-medium ${tab === t.key ? "border-b-[3px] border-[#DDB958] text-[#DDB958]" : "text-gray-700"
                                }`}
                        >
                            {t.label} ({tabCounts[t.key]})
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => {
                        const eventId = event.id;
                        return (
                            <div
                                key={eventId}
                                className="flex flex-col relative cursor-pointer w-full md:w-auto h-auto md:h-[700px] bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-300"
                                onClick={() => handleViewDetail(eventId)}
                            >
                                {/* Badge trạng thái */}
                                {userParticipationMap[eventId] && (
                                    <span
                                        className={`absolute top-2 md:top-4 right-2 md:right-4 px-2 md:px-3 py-1 rounded-full text-white text-[10px] md:text-xs font-bold shadow-md z-10 ${userParticipationMap[eventId].status === "approved"
                                            ? "bg-green-500"
                                            : userParticipationMap[eventId].status === "rejected"
                                                ? "bg-red-500"
                                                : userParticipationMap[eventId].status === "pending"
                                                    ? "bg-yellow-500"
                                                    : "bg-gray-500"
                                            }`}
                                    >
                                        {userParticipationMap[eventId].status === "approved"
                                            ? "Đã tham gia"
                                            : userParticipationMap[eventId].status === "rejected"
                                                ? "Bị từ chối"
                                                : "Đang chờ"}
                                    </span>
                                )}

                                {/* Badge điểm hoàn thành (top-left) */}
                                {event.points > 0 && (
                                    <span className="absolute top-2 left-2 md:top-4 md:left-4 px-2 md:px-3 py-1 rounded-full text-white text-[11px] md:text-sm font-bold shadow-md z-10 bg-gradient-to-r from-yellow-400 to-yellow-500">
                                        +{event.points} điểm
                                    </span>
                                )}

                                {/* Ảnh cover */}
                                <img
                                    src={
                                        event.coverImage?.startsWith("http")
                                            ? event.coverImage
                                            : `http://localhost:5000${event.coverImage}`
                                    }
                                    alt={event.name}
                                    className="h-[250px] md:h-[400px] w-full object-cover"
                                />

                                {/* Thân card */}
                                <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3">
                                    {/* Tiêu đề */}
                                    <h2 className="font-bold text-base md:text-xl leading-snug line-clamp-2 min-h-[2.5rem] text-gray-800">
                                        {event.name}
                                    </h2>

                                    {/* Khối thông tin + mô tả */}
                                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
                                        {/* Cột trái: thông tin nhanh */}
                                        <div className="flex flex-col text-gray-600 text-sm gap-0 w-full md:w-[40%]">
                                            <div className="flex gap-2 items-center py-2.5 border-b border-gray-200">
                                                <Calendar
                                                    size={18}
                                                    className="text-gray-500 flex-shrink-0"
                                                />
                                                <span className="text-sm">
                                                    {new Date(event.date).toLocaleDateString("vi-VN")}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-center py-2.5 border-b border-gray-200">
                                                <Users
                                                    size={18}
                                                    className="text-gray-500 flex-shrink-0"
                                                />
                                                <span className="text-sm font-medium">
                                                    {event.currentParticipants || 0}/{event.maxParticipants || 0}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 items-start py-2.5">
                                                <MapPin
                                                    size={18}
                                                    className="text-gray-500 flex-shrink-0 mt-0.5"
                                                />
                                                <span className="line-clamp-2 text-sm">
                                                    {event.location}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Đường kẻ dọc */}
                                        <div className="hidden md:block w-0.5 bg-[#DCBA58] self-stretch"></div>

                                        {/* Cột phải: mô tả */}
                                        <div className="flex-1 md:w-[60%] text-gray-600 leading-relaxed border-t md:border-t-0 pt-3 md:pt-0">
                                            <div
                                                className="text-sm line-clamp-5 md:line-clamp-6"
                                                dangerouslySetInnerHTML={{
                                                    __html: event.description || "Không có mô tả",
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Lý do từ chối (nếu có) */}
                                    {userParticipationMap[eventId]?.status === "rejected" &&
                                        userParticipationMap[eventId]?.rejectionReason && (
                                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                                <strong>Lý do từ chối:</strong>{" "}
                                                {userParticipationMap[eventId].rejectionReason}
                                            </div>
                                        )}

                                    {/* Hàng thao tác */}
                                    <div className="flex items-center justify-between pt-6 md:pt-7">
                                        {/* Cụm trái: Like/Share */}
                                        <div className="flex items-center gap-4 md:gap-6 text-sm md:text-[15px]">
                                            <button
                                                onClick={(e) => handleInteraction(e, eventId, "LIKE")}
                                                className="flex items-center gap-1.5 md:gap-2 hover:scale-110 transition-transform"
                                            >
                                                <Heart
                                                    size={20}
                                                    strokeWidth={1.5}
                                                    className={`md:w-6 md:h-6 ${likedEvents[eventId]
                                                        ? "text-red-600 fill-red-600"
                                                        : "text-gray-600"
                                                        }`}
                                                />
                                                <span className="font-medium text-gray-700">
                                                    {event.likesCount ?? 0}
                                                </span>
                                            </button>
                                            <button
                                                onClick={(e) => handleInteraction(e, eventId, "SHARE")}
                                                className="flex items-center gap-1.5 md:gap-2 hover:scale-110 transition-transform text-gray-600"
                                            >
                                                <Share2
                                                    size={20}
                                                    strokeWidth={1.5}
                                                    className="md:w-6 md:h-6"
                                                />
                                                <span className="font-medium text-gray-700">
                                                    {event.sharesCount ?? 0}
                                                </span>
                                            </button>
                                        </div>

                                        {/* Nút Chi Tiết */}
                                        <button className="bg-[#DCBA58] text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold text-sm md:text-[15px] hover:bg-[#CDA550] hover:shadow-lg transition-all duration-200">
                                            Chi tiết
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
