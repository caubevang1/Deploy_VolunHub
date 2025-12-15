import { useState, useEffect } from "react";
import { User, Lock, Mail, Calendar, Phone, Upload } from "lucide-react";
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
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendOtp = async () => {
        const { email } = form;
        if (!email) {
            Swal.fire("Không thành công", "Vui lòng nhập email trước khi yêu cầu OTP.", "error");
            return;
        }

        try {
            const response = await OTPDangKy(email);
            if (response && response.status === 200) {
                Swal.fire("Thành công", "OTP đã được gửi tới email của bạn.", "success");
            } else {
                const errorMessage = response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.";
                Swal.fire("Không thành công", errorMessage, "error");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Có lỗi xảy ra khi gửi OTP. Vui lòng thử lại.";
            Swal.fire("Không thành công", errorMessage, "error");
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                Swal.fire("Lỗi", "Vui lòng chọn file ảnh", "error");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire("Lỗi", "Kích thước ảnh không được vượt quá 5MB", "error");
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

        if (!restForm.name || !restForm.birthday || !mappedGender || !restForm.phone || !restForm.email || !restForm.username || !restForm.password || !restForm.otp) {
            Swal.fire("Không thành công", "Vui lòng điền đầy đủ thông tin.", "error");
            return;
        }
        if (restForm.password !== confirmPassword) {
            Swal.fire("Mật khẩu không khớp", "Vui lòng kiểm tra lại.", "error");
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
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            const response = await DangKy(formData);
            if (response && response.status === 201) {
                Swal.fire({
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
            Swal.fire("Không thành công", error.response?.data?.message || "Có lỗi xảy ra khi đăng ký.", "error");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 min-h-screen px-4 py-8 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-[540px] overflow-hidden my-auto">
                {/* Header */}
                <div className="bg-[#2d2d3a] flex justify-between items-center px-4 md:px-5 py-4 md:py-5">
                    <h2 className="text-xl md:text-2xl font-bold text-[#e6c675]">Đăng Ký Tài Khoản</h2>
                    <button
                        onClick={() => dispatch(closeModal())}
                        className="bg-red-600 text-white rounded-md px-2 py-1 hover:bg-red-700"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-3 md:space-y-4">

                    {/* Họ tên + Ngày sinh + Giới tính */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-3/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <User size={18} /> Họ và tên:
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>

                        <div className="w-full md:w-2/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <Calendar size={18} /> Ngày sinh:
                            </label>
                            <input
                                type="date"
                                name="birthday"
                                value={form.birthday}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-[7px] focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>

                        <div className="w-full md:w-1/5">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                Giới tính:
                            </label>
                            <select
                                name="gender"
                                value={form.gender}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-2 py-2 text-black focus:ring-2 focus:ring-blue-400"
                                required
                            >
                                <option value="">---</option>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>
                    </div>

                    {/* Tên đăng nhập + Số điện thoại */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <User size={18} /> Tên đăng nhập:
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>

                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <Phone size={18} /> Số điện thoại:
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>
                    </div>

                    {/* Mật khẩu + Xác nhận mật khẩu */}
                    <div className="flex flex-col md:flex-row md:space-x-4 space-y-3 md:space-y-0">
                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <Lock size={18} /> Mật khẩu:
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>

                        <div className="w-full md:w-1/2">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <Lock size={18} /> Nhập lại mật khẩu:
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>
                    </div>

                    {/* Avatar Upload */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-gray-800 font-medium">
                                    <Upload size={18} /> Ảnh đại diện:
                                </label>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="cursor-pointer bg-[#DCBA58] hover:bg-[#CDA550] text-white font-medium px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2"
                                >
                                    <Upload size={18} />
                                    Choose File
                                </label>
                                {avatarFile && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        className="text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-md transition-colors"
                                    >
                                        ✕ Xóa
                                    </button>
                                )}
                            </div>
                            <div className="w-28 h-12 flex items-center justify-center -ml-8 mt-4">
                                {avatarPreview && (
                                    <img
                                        src={avatarPreview}
                                        alt="Avatar preview"
                                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300 shadow-sm"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                {avatarFile ? avatarFile.name : 'No file chosen'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Hỗ trợ: JPG, PNG, GIF. Kích thước tối đa: 5MB
                        </p>
                    </div>

                    {/* Email + OTP */}
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                        <div className="w-full md:w-[300px]">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                                <Mail size={18} /> Email:
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                required
                            />
                        </div>

                        <div className="flex-1">
                            <label className="flex items-center gap-2 text-gray-800 font-medium mb-1">OTP:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="otp"
                                    placeholder="Ấn gửi OTP"
                                    value={form.otp}
                                    onChange={handleChange}
                                    className="w-full bg-[#f5f5f5] border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 text-black"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-[#DCBA58] hover:bg-[#CDA550] text-[#1B1B26] text-sm h-full rounded-r-md px-2 border border-gray-300 flex items-center justify-center"
                                >
                                    <img src={otp} alt="Gửi Otp" className="w-[36px]" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-center pt-1">
                        <button
                            type="submit"
                            className="bg-[#2d2d3a] text-white font-semibold py-3 rounded-md hover:bg-[#1f1f2b] transition-colors w-full"
                        >
                            Đăng Ký
                        </button>
                    </div>

                    {/* Switch to login */}
                    <div className="text-center pt-2">
                        <p className="text-sm text-gray-700">
                            Đã có tài khoản?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    dispatch(closeModal());
                                    dispatch(openLogin());
                                }}
                                className="text-blue-600 font-medium hover:underline"
                            >
                                Đăng nhập ngay
                            </button>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
