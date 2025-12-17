import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { User, Lock, Mail, Calendar, Phone, Upload, UserCog } from "lucide-react";
import { useDispatch } from "react-redux";
import { closeModal, openLogin } from "../redux/reducers/UserReducer";
import Swal from "sweetalert2";
import { DangKy, OTPDangKy } from "../services/UserService";
import otp from "../assets/img/Icon_Otp.png";

export default function Register() {
    const dispatch = useDispatch();

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, []);

    const [form, setForm] = useState({
        name: "",
        birthday: "",
        gender: "",
        phone: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        otp: "",
        role: "VOLUNTEER",
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Hàm tiện ích để gọi Swal mà không bị layer Portal che khuất
    const MySwal = (options) => {
        return Swal.fire({
            ...options,
            // Ép SweetAlert2 hiển thị trên lớp cao nhất
            didOpen: () => {
                const container = Swal.getContainer();
                if (container) container.style.zIndex = "10000";
            }
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendOtp = async () => {
        const { email } = form;
        if (!email) {
            MySwal({ title: "Không thành công", text: "Vui lòng nhập email trước khi yêu cầu OTP.", icon: "error" });
            return;
        }

        try {
            const response = await OTPDangKy(email);
            if (response && response.status === 200) {
                MySwal({ title: "Thành công", text: "OTP đã được gửi tới email của bạn.", icon: "success" });
            } else {
                const errorMessage = response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.";
                MySwal({ title: "Không thành công", text: errorMessage, icon: "error" });
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Có lỗi xảy ra khi gửi OTP.";
            MySwal({ title: "Không thành công", text: errorMessage, icon: "error" });
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                MySwal({ title: "Lỗi", text: "Vui lòng chọn file ảnh", icon: "error" });
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                MySwal({ title: "Lỗi", text: "Kích thước ảnh không được vượt quá 5MB", icon: "error" });
                return;
            }
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setAvatarPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        const fileInput = document.getElementById('avatar-upload');
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { gender, confirmPassword, ...restForm } = form;
        const mappedGender = gender === "Nam" ? "Male" : gender === "Nữ" ? "Female" : gender;

        if (!restForm.name || !restForm.birthday || !mappedGender || !restForm.phone || !restForm.email || !restForm.username || !restForm.password || !restForm.otp || !restForm.role) {
            MySwal({ title: "Không thành công", text: "Vui lòng điền đầy đủ thông tin.", icon: "error" });
            return;
        }
        if (restForm.password !== confirmPassword) {
            MySwal({ title: "Mật khẩu không khớp", text: "Vui lòng kiểm tra lại.", icon: "error" });
            return;
        }

        const formData = new FormData();
        formData.append('name', restForm.name);
        formData.append('birthday', restForm.birthday);
        formData.append('gender', mappedGender);
        formData.append('phone', restForm.phone);
        formData.append('email', restForm.email);
        formData.append('username', restForm.username);
        formData.append('password', restForm.password);
        formData.append('otp', restForm.otp);
        formData.append('role', restForm.role);

        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            const response = await DangKy(formData);
            if (response && response.status === 201) {
                MySwal({
                    title: "Đăng ký thành công!",
                    text: "Vui lòng đăng nhập để tiếp tục.",
                    icon: "success",
                    confirmButtonText: "Đăng nhập",
                }).then(() => {
                    dispatch(closeModal());
                    dispatch(openLogin());
                });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Có lỗi xảy ra khi đăng ký.";
            MySwal({ title: "Không thành công", text: errorMsg, icon: "error" });
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] overflow-y-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[540px] overflow-hidden my-auto relative">
                {/* Header */}
                <div className="bg-[#2d2d3a] flex justify-between items-center px-4 md:px-5 py-4 md:py-5 sticky top-0 z-20">
                    <h2 className="text-xl md:text-2xl font-bold text-[#e6c675]">Đăng Ký Tài Khoản</h2>
                    <button
                        onClick={() => dispatch(closeModal())}
                        className="bg-red-600 text-white rounded-md px-2 py-1 hover:bg-red-700"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                    
                    {/* 1. Tên đăng nhập + Số điện thoại */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><User size={18} /> Tên đăng nhập:</label>
                            <input type="text" name="username" value={form.username} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><Phone size={18} /> Số điện thoại:</label>
                            <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                    </div>

                    {/* 2. Mật khẩu + Xác nhận mật khẩu */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><Lock size={18} /> Mật khẩu:</label>
                            <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><Lock size={18} /> Nhập lại mật khẩu:</label>
                            <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                    </div>

                    {/* 3. Họ tên + Ngày sinh + Giới tính */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-3/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><User size={18} /> Họ và tên:</label>
                            <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="w-full md:w-2/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><Calendar size={18} /> Ngày sinh:</label>
                            <input type="date" name="birthday" value={form.birthday} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-[7px] text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="w-full md:w-1/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">Giới tính:</label>
                            <select name="gender" value={form.gender} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-2 py-2 text-black focus:ring-2 focus:ring-blue-400 outline-none" required>
                                <option value="">---</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                    </div>

                    {/* 4. Vai trò */}
                    <div className="w-full">
                        <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><UserCog size={18} /> Bạn đăng ký với tư cách:</label>
                        <select name="role" value={form.role} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black font-medium focus:ring-2 focus:ring-blue-400 outline-none" required>
                            <option value="VOLUNTEER">Tình nguyện viên (Volunteer)</option>
                            <option value="EVENTMANAGER">Quản lý sự kiện (Event Manager)</option>
                        </select>
                    </div>

                    {/* 5. Avatar Upload */}
                    <div className="flex items-center justify-between gap-4 py-1">
                        <div className="flex-1">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-2"><Upload size={18} /> Ảnh đại diện:</label>
                            <div className="flex items-center gap-2">
                                <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                <label htmlFor="avatar-upload" className="cursor-pointer bg-[#DCBA58] text-white px-4 py-2 rounded-md hover:bg-[#CDA550] transition-all text-sm font-semibold">Chọn file</label>
                                {avatarFile && <button type="button" onClick={handleRemoveAvatar} className="text-red-500 text-sm font-bold ml-2">✕ Xóa</button>}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1 italic">{avatarFile ? avatarFile.name : 'Chưa có file nào được chọn'}</p>
                        </div>
                        <div className="flex-shrink-0">
                            {avatarPreview && <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 shadow-sm" />}
                        </div>
                    </div>

                    {/* 6. Email + OTP */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-[300px]">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1"><Mail size={18} /> Email:</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="flex-1">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">OTP:</label>
                            <div className="relative">
                                <input type="text" name="otp" placeholder="Nhập OTP" value={form.otp} onChange={handleChange} className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 text-black outline-none focus:ring-2 focus:ring-blue-400" required />
                                <button type="button" onClick={handleSendOtp} className="absolute right-0 top-0 h-full bg-[#DCBA58] px-2 rounded-r-md border-l border-gray-300 flex items-center transition-colors"><img src={otp} alt="OTP" className="w-8" /></button>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="bg-[#2d2d3a] text-white font-bold py-4 rounded-md hover:bg-[#1f1f2b] transition-all w-full shadow-lg active:scale-95">ĐĂNG KÝ</button>

                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-700 font-medium">Đã có tài khoản?{" "}<button type="button" onClick={() => { dispatch(closeModal()); dispatch(openLogin()); }} className="text-blue-600 font-bold hover:underline">Đăng nhập ngay</button></p>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}