import React, { useEffect, useState } from "react";
import { GetAllEventsStats, GetEventPosts } from "../services/StatsService";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [recentPostsMap, setRecentPostsMap] = useState({});

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await GetAllEventsStats();
        const data = res?.data?.events || [];
        if (!mounted) return;

        // Only show events that have been approved (exclude pending, completed, etc.)
        const approvedEvents = data.filter((ev) => (ev.status || "").toLowerCase() === "approved");
        setEvents(approvedEvents.slice(0, 20)); // limit to first 20

        // For the first N approved events, fetch posts to detect recent activity
        const top = approvedEvents.slice(0, 10);
        const map = {};
        await Promise.all(
          top.map(async (e) => {
            try {
              const r = await GetEventPosts(e._id);
              const posts = r?.data || [];
              map[e._id] = posts;
            } catch {
              map[e._id] = [];
            }
          })
        );

        if (!mounted) return;
        setRecentPostsMap(map);
      } catch (err) {
        if (!mounted) return;
        // Build a helpful error message for the UI
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message || err?.response?.data || err?.message;
        let friendly = "Lỗi khi tải dữ liệu";
        if (status === 401) friendly = "Bạn chưa đăng nhập. Vui lòng đăng nhập để xem Dashboard.";
        else if (status === 403) friendly = "Bạn không có quyền truy cập Dashboard này.";
        else if (status === 404) friendly = "API không tìm thấy (404). Kiểm tra server backend hoặc đường dẫn API.";
        else if (status) friendly = `Lỗi từ server (${status}): ${serverMsg}`;

        setError(friendly);
        console.error("[Dashboard] lỗi khi gọi API statistics/events:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const isNew = (createdAt) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7; // within 7 days
  };

  const hasRecentPost = (eventId) => {
    const posts = recentPostsMap[eventId] || [];
    return posts.some((p) => {
      const created = new Date(p.createdAt || p.created_at || p.createdAt);
      return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    });
  };

  const trending = [...events].sort((a, b) => (b.totalRegistrations || 0) - (a.totalRegistrations || 0)).slice(0, 6);

  return (
    <div className="container mx-auto py-20 px-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {loading ? (
        <div>Đang tải dữ liệu...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="col-span-2">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-3">Sự kiện mới công bố</h2>
              {events.filter((e) => isNew(e.createdAt)).length === 0 ? (
                <div className="text-sm text-gray-500">Không có sự kiện mới trong 7 ngày qua.</div>
              ) : (
                <ul className="space-y-3">
                  {events.filter((e) => isNew(e.createdAt)).map((e) => (
                    <li key={e._id} className="p-2 border rounded hover:bg-gray-50">
                      <Link to={`/su-kien/${e._id}`} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{e.title || e.name || "(Không tên)"}</div>
                          <div className="text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-green-600 font-semibold">Mới</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-4 rounded shadow mt-6">
              <h2 className="font-semibold mb-3">Sự kiện có tin bài mới</h2>
              {events.filter((e) => hasRecentPost(e._id)).length === 0 ? (
                <div className="text-sm text-gray-500">Không có tin bài mới trong 7 ngày qua.</div>
              ) : (
                <ul className="space-y-3">
                  {events.filter((e) => hasRecentPost(e._id)).map((e) => (
                    <li key={e._id} className="p-2 border rounded hover:bg-gray-50">
                      <Link to={`/su-kien/${e._id}`} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{e.title || e.name || "(Không tên)"}</div>
                          <div className="text-xs text-gray-500">Bài mới trên sự kiện</div>
                        </div>
                        <div className="text-sm text-blue-600 font-semibold">Tin mới</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="font-semibold mb-3">Trending</h3>
              {trending.length === 0 ? (
                <div className="text-sm text-gray-500">Không có dữ liệu</div>
              ) : (
                <ol className="list-decimal list-inside space-y-2">
                  {trending.map((e) => (
                    <li key={e._id} className="p-1">
                      <Link to={`/su-kien/${e._id}`} className="block">
                        <div className="flex items-center">
                          <span className="flex-1 min-w-0 text-sm font-medium truncate">{e.title || e.name}</span>
                          <span className="ml-3 text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">{e.totalRegistrations || 0} đăng ký</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
