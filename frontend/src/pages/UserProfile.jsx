import { useEffect, useState } from "react";
import { Tabs } from "antd";
import moment from "moment";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import { GetUserInfo, UpdateUser } from "../services/UserService";
import cats from "../assets/img/cats_b1-removebg-preview.png";
import bear from "../assets/img/bearb1-removebg-preview.png";
import dog from "../assets/img/dog_b1-removebg-preview.png";
import lizard from "../assets/img/lizard-removebg-preview.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMars, faVenus } from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

const ThongTinNguoiDung = ({ user, onUserUpdated }) => {
    const [editData, setEditData] = useState({});
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [editMode, setEditMode] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleEditClick = () => {
        setEditData({
            username: user.username || "",
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            birthday: user.birthday || "",
            gender: user.gender || "Male",
            status: user.status || "Hoạt động",
            points: user.points || 0,
        });
        setAvatarPreview(
            user.avatar?.startsWith("http")
                ? user.avatar
                : `http://localhost:5000${user.avatar}`
        );
        setEditMode(true);
    };

    const handleSaveAll = async () => {
        const formData = new FormData();
        formData.append("name", editData.name);
        formData.append("birthday", editData.birthday);
        formData.append("gender", editData.gender);
        formData.append("phone", editData.phone || "");

        if (avatarFile) {
            formData.append("avatar", avatarFile);
        }

        try {
            const res = await UpdateUser(formData);

            Swal.fire({
                title: "Thành công!",
                text: "Cập nhật thông tin thành công.",
                icon: "success",
                timer: 2000,
                showConfirmButton: false,
            });

            // ✅ Cập nhật user trước
            onUserUpdated(res.data.user);

            // ✅ Reset edit mode và clear preview
            setEditMode(false);
            setAvatarFile(null);
            setAvatarPreview(""); // ← Quan trọng: Reset preview để dùng avatar mới từ server

        } catch (err) {
            Swal.fire({
                title: "Lỗi!",
                text: err.response?.data?.message || "Cập nhật thất bại",
                icon: "error",
                confirmButtonText: "Đóng",
                confirmButtonColor: "#DDB958",
            });
        }
    };

    return (
        <div
            className="profile-page theme-purple min-h-screen py-[6rem]"
            style={{
                backgroundImage: `linear-gradient(to right, #2196F3, #2E64F5), linear-gradient(to bottom, transparent 50%, white 50%)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 50%, 100% 100%",
            }}
        >
            <div className="content relative max-w-[1100px] mx-auto px-6 !py-[50px] bg-white rounded-3xl shadow-lg ">
                {/* Ảnh trang trí */}
                <img src={cats} alt="cat" className="absolute -top-[53px] left-[20px] w-[200px] drop-shadow-lg z-10" />
                <img src={bear} alt="bear" className="absolute bottom-[180px] -right-[90px] w-[135px] drop-shadow-lg z-10" />
                <img src={dog} alt="dog" className="absolute bottom-[10px] right-[150px] w-[350px] drop-shadow-lg z-10" />
                <img src={lizard} alt="lizard" className="absolute top-[56px] right-[230px] w-[80px] drop-shadow-lg z-10" style={{ transform: "scaleY(-1)" }} />

                {/* Header */}
                <div className="absolute top-4 left-0 w-full flex justify-between items-center px-6 text-sm">
                    <div className="content__actions text-center z-10 flex items-center">
                        <span
                            style={{
                                fontSize: "14px",
                                display: "inline-block",
                                padding: "8px 20px",
                                marginLeft: "15px",
                                marginTop: "15px",
                                backgroundColor: "#576CBC",
                                color: "white",
                                borderRadius: "25px",
                                fontWeight: "bold",
                            }}
                        >
                            {user?.role === "VOLUNTEER"
                                ? "TÌNH NGUYỆN VIÊN"
                                : user?.role || "Người dùng"}
                        </span>

                        <div className="ml-4 mt-4 flex gap-4 text-3xl">
                            {!editMode ? (
                                <button onClick={handleEditClick} className="text-blue-500">
                                    <EditOutlined />
                                </button>
                            ) : (
                                <button onClick={handleSaveAll} className="text-green-500">
                                    <SaveOutlined />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        {/* ✅ [HIỂN THỊ] Điểm người dùng (Badge) */}
                        <div className="bg-orange-500 text-white px-4 py-2 mr-2 rounded-full shadow font-bold text-[14px]">
                            🌟 {user?.points || 0} ĐIỂM
                        </div>

                        {/* Trạng thái người dùng */}
                        <div
                            className={`px-4 py-2 mr-2 rounded-full shadow font-bold text-[14px] text-white ${user?.status === "ACTIVE"
                                ? "bg-green-500"
                                : user?.status === "LOCKED"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                                }`}
                        >
                            {user?.status === "ACTIVE"
                                ? "ĐANG HOẠT ĐỘNG"
                                : user?.status === "LOCKED"
                                    ? "BỊ KHÓA"
                                    : "Không rõ"}
                        </div>
                    </div>
                </div>

                {/* Avatar */}
                <div className="content__cover relative flex flex-col items-center mt-6">
                    <div
                        className="content__avatar w-[200px] h-[200px] rounded-full bg-cover bg-center relative cursor-pointer -mt-[130px] shadow-lg"
                        style={{
                            backgroundImage: `url(${avatarPreview ||
                                (user?.avatar?.startsWith("http")
                                    ? user.avatar
                                    : `http://localhost:5000${user?.avatar}`) ||
                                "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                                })`,
                        }}
                    >
                        {editMode && (
                            <div className="absolute bottom-0 left-0 w-full bg-white p-2 flex items-center gap-2 rounded-b-full">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="flex-1"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Họ tên */}
                <div className="content__title text-center mt-6 mb-6">
                    {editMode ? (
                        <input
                            type="text"
                            name="name"
                            value={editData.name}
                            onChange={handleInputChange}
                            className="border-b border-gray-400 text-center text-3xl "
                        />
                    ) : (
                        <h1 className="text-3xl font-semibold text-gray-800">{user?.name}</h1>
                    )}
                </div>

                {/* 2 cột thông tin */}
                <div className="flex justify-between gap-12 content__list mt-6 text-[20px] px-4 py-2">
                    <ul className="flex-1 space-y-8">
                        <InfoRow label="Tên đăng nhập" name="username" editData={user} editMode={false} />
                        <InfoRow label="Email" name="email" editData={user} editMode={false} />
                        <InfoRow
                            label="Giới tính"
                            name="gender"
                            editData={editMode ? editData : user}
                            handleInputChange={handleInputChange}
                            type="gender"
                            editMode={editMode}
                        />
                    </ul>
                    <ul className="flex-1 space-y-8">
                        <InfoRow
                            label="Số điện thoại"
                            name="phone"
                            editData={editMode ? editData : user}
                            handleInputChange={handleInputChange}
                            editMode={editMode}
                        />
                        <InfoRow
                            label="Ngày sinh"
                            name="birthday"
                            editData={editMode ? editData : user}
                            handleInputChange={handleInputChange}
                            type="date"
                            editMode={editMode}
                        />
                    </ul>
                </div>
            </div>
        </div>
    );
};

// =================== ROW COMPONENT ===================
const InfoRow = ({ label, name, editData, handleInputChange, editMode, type = "text" }) => {
    const renderGender = () => {
        if (editMode) {
            return (
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name, value: "Male" } })}
                        className={`p-2 rounded ${editData[name] === "Male" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                    >
                        <FontAwesomeIcon icon={faMars} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleInputChange({ target: { name, value: "Female" } })}
                        className={`p-2 rounded ${editData[name] === "Female" ? "bg-pink-500 text-white" : "bg-gray-200"}`}
                    >
                        <FontAwesomeIcon icon={faVenus} />
                    </button>
                </div>
            );
        } else {
            return (
                <span className="flex items-center gap-2 text-3xl">
                    {editData[name] === "Male" ? (
                        <FontAwesomeIcon icon={faMars} className="text-blue-500" />
                    ) : (
                        <FontAwesomeIcon icon={faVenus} className="text-pink-500" />
                    )}
                </span>
            );
        }
    };

    const renderField = () => {
        if (type === "gender") return renderGender();
        if (editMode) {
            if (type === "date") {
                return (
                    <input
                        type="date"
                        name={name}
                        value={editData[name] ? moment(editData[name]).format("YYYY-MM-DD") : ""}
                        onChange={handleInputChange}
                        className="border-b border-gray-400 flex-1"
                    />
                );
            }
            return (
                <input
                    type="text"
                    name={name}
                    value={editData[name] || ""}
                    onChange={handleInputChange}
                    className="border-b border-gray-400 px-2 py-1 w-[250px] text-gray-700 focus:outline-none focus:border-blue-500 rounded-sm"
                />
            );
        }

        if (type === "date" && editData[name]) {
            return <span className="flex-1 text-gray-600">{moment(editData[name]).format("DD/MM/YYYY")}</span>;
        }

        // Xử lý hiển thị nếu là điểm số (hoặc các trường số khác)
        return <span className="flex-1 text-gray-600 font-medium">{editData[name]}</span>;
    };

    return (
        <li className="flex items-center gap-3 border-b border-gray-200 pb-6">
            <strong className="w-40">{label}:</strong>
            <div className="flex-1">{renderField()}</div>
        </li>
    );
};

// =================== MAIN COMPONENT ===================
const InforUser = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const res = await GetUserInfo();
                if (res.status === 200) {
                    setUser(res.data);
                }
            } catch (error) {
                console.error("Lỗi khi lấy thông tin người dùng:", error);
            }
        };
        fetchUserInfo();
    }, []);

    const items = [
        {
            label: (
                <span className="text-[15px] sm:text-[20px] font-bold ml-2">Thông tin tài khoản</span>
            ),
            key: 1,
            children: <ThongTinNguoiDung user={user} onUserUpdated={setUser} />,
        },
    ];

    return user ? (
        <Tabs className="!pt-[1rem] min-h-[100vh]" items={items} />
    ) : (
        <div className="!pt-[6rem] text-center text-red-500 font-bold text-xl">
            Đang tải thông tin người dùng...
        </div>
    );
};

export default InforUser;