import { useState } from "react";
import { useDispatch } from "react-redux";
import { closeModal, openRegister, loginSuccess, openForgetPassword } from "../redux/reducers/UserReducer";
import { User, Lock } from "lucide-react";
import Swal from "sweetalert2";
import { DangNhap } from "../services/UserService";
import { useEffect } from "react";
import { subscribeUserToPush } from "../utils/notificationService";

export default function Login() {
    const dispatch = useDispatch();
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const storedUsername = localStorage.getItem("rememberedUsername") || "";

    const [form, setForm] = useState({
        identifier: storedUsername,
        password: "",
        remember: storedUsername !== "",
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await DangNhap({
                identifier: form.identifier,
                password: form.password,
            });

            const { user, token } = response.data;
            if (form.remember) {
                localStorage.setItem("rememberedUsername", form.identifier);
            } else {
                localStorage.removeItem("rememberedUsername");
            }

            localStorage.setItem("user", JSON.stringify({ ...user, token }));

            dispatch(loginSuccess({ user, token: token }));
            dispatch(closeModal());
            // navigate('hoat-dong');

            Swal.fire({
                icon: "success",
                title: "Đăng nhập thành công",
                text: `Chào mừng, ${user.username || user.name || "bạn"}!`,
                timer: 1500,
                showConfirmButton: false,
            });

            // Sau khi login thành công: Hỏi người dùng có muốn bật thông báo hay không
            try {
                const currentPermission = window.Notification?.permission;
                if (currentPermission === 'granted') {
                    // Nếu đã grant thì vẫn gọi subscribe để đảm bảo subscription được lưu
                    subscribeUserToPush().catch(err => console.warn('⚠️ Không thể đăng ký push notification:', err));
                } else if (currentPermission === 'denied') {
                    // Nếu bị chặn, hướng dẫn người dùng
                    Swal.fire({
                        icon: 'info',
                        title: 'Thông báo',
                        html: 'Bạn đã chặn thông báo trên trình duyệt. Vui lòng bật lại trong cài đặt trang nếu muốn nhận thông báo.',
                        timer: 4000,
                        showConfirmButton: false,
                    });
                } else {
                    // Nếu chưa chọn (default), hỏi người dùng bằng modal ứng dụng trước khi gọi requestPermission
                    const { isConfirmed } = await Swal.fire({
                        title: 'Nhận thông báo?',
                        text: 'Bạn có muốn nhận thông báo khi có cập nhật quan trọng?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Bật thông báo',
                        cancelButtonText: 'Không, cảm ơn',
                    });

                    if (isConfirmed) {
                        // Gọi subscribe (hàm sẽ request permission nếu cần)
                        subscribeUserToPush().catch(err => console.warn('⚠️ Không thể đăng ký push notification:', err));
                    }
                }
            } catch (err) {
                console.warn('⚠️ Lỗi khi xử lý đăng ký notification:', err);
            }

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Đăng nhập thất bại",
                text: error.response?.data?.message || "Tài khoản hoặc mật khẩu không đúng!",
            });
        }

        setLoading(false);
    };

    const inputBg = form.remember ? "bg-[#e8f0fe]" : "bg-[#f5f5f5]";

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 min-h-screen bg-black/50 px-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[520px] overflow-hidden">
                {/* Header */}
                <div className="bg-[#2d2d3a] flex justify-between items-center px-4 md:px-5 py-4 md:py-5">
                    <h2 className="text-xl md:text-2xl font-bold text-[#e6c675]">Đăng Nhập Tài Khoản</h2>
                    <button
                        onClick={() => dispatch(closeModal())}
                        className="bg-red-600 text-white rounded-md px-2 py-1 hover:bg-red-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 md:p-6">
                    {/* Username */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                            <User size={18} /> Tên đăng nhập:
                        </label>
                        <input
                            type="text"
                            name="identifier"
                            value={form.identifier}
                            onChange={handleChange}
                            className={`w-full ${inputBg} border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black`}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                        <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                            <Lock size={18} /> Mật khẩu:
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className={`w-full ${inputBg} border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black`}
                            required
                        />
                    </div>

                    {/* Ghi nhớ + Đăng nhập */}
                    <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={form.remember}
                                onChange={handleChange}
                                className="mr-2 accent-[#2d2d3a] w-4 h-4"
                            />
                            <label className="text-[#333] text-[15px]">Ghi nhớ đăng nhập</label>
                        </div>

                        <button
                            type="submit"
                            className={`${loading ? "bg-gray-400 cursor-not-allowed" : "bg-[#2d2d3a] hover:bg-[#1f1f2b] cursor-pointer"} text-white font-semibold px-5 py-2 rounded-md transition`}
                            disabled={loading}
                        >
                            {loading ? "Đang đăng nhập..." : "Đăng Nhập"}
                        </button>

                    </div>

                    {/* Chuyển sang đăng ký */}
                    <p className="flex justify-between text-gray-700 text-sm">
                        <span>
                            Bạn chưa có tài khoản?{" "}
                            <button
                                type="button"
                                onClick={() => dispatch(openRegister())}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Đăng ký ngay
                            </button>
                        </span>

                        <button
                            type="button"
                            onClick={() => dispatch(openForgetPassword())}
                            className="text-blue-600 font-medium hover:underline"
                        >
                            Quên mật khẩu?
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
