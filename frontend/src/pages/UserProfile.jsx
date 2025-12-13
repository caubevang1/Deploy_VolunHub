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

      onUserUpdated(res.data.user);
      setEditMode(false);
      setAvatarFile(null);
      setAvatarPreview("");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-[#DDB958] to-[#c9a84a] rounded-t-3xl p-8 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="bg-white/90 backdrop-blur-sm text-[#DDB958] px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                {user?.role === "VOLUNTEER"
                  ? " TÌNH NGUYỆN VIÊN"
                  : user?.role || " Người dùng"}
              </span>

              {!editMode ? (
                <button
                  onClick={handleEditClick}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white text-blue-600 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                >
                  <EditOutlined className="text-xl" />
                </button>
              ) : (
                <button
                  onClick={handleSaveAll}
                  className="bg-white/90 backdrop-blur-sm hover:bg-white text-green-600 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                >
                  <SaveOutlined className="text-xl" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/90 backdrop-blur-sm text-[#DDB958] px-5 py-2 rounded-full shadow-lg font-bold flex items-center gap-2">
                <span className="text-2xl">🌟</span>
                <span>{user?.points || 0} ĐIỂM</span>
              </div>

              <div
                className={`px-5 py-2 rounded-full shadow-lg font-bold text-white backdrop-blur-sm ${
                  user?.status === "ACTIVE"
                    ? "bg-green-500/90"
                    : user?.status === "LOCKED"
                    ? "bg-red-500/90"
                    : "bg-gray-400/90"
                }`}
              >
                {user?.status === "ACTIVE"
                  ? "✓ HOẠT ĐỘNG"
                  : user?.status === "LOCKED"
                  ? "✗ BỊ KHÓA"
                  : "Không rõ"}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-b-3xl shadow-2xl p-8 md:p-12 relative">
          {/* Decorative images - hidden on mobile */}
          <div className="hidden xl:block">
            <img
              src={cats}
              alt="cat"
              className="absolute -top-12 left-8 w-32 drop-shadow-lg opacity-80 hover:scale-110 transition-transform duration-300"
            />
            <img
              src={bear}
              alt="bear"
              className="absolute top-32 -right-16 w-28 drop-shadow-lg opacity-80 hover:scale-110 transition-transform duration-300"
            />
            <img
              src={dog}
              alt="dog"
              className="absolute bottom-8 right-32 w-48 drop-shadow-lg opacity-70 hover:scale-105 transition-transform duration-300"
            />
            <img
              src={lizard}
              alt="lizard"
              className="absolute top-12 right-48 w-16 drop-shadow-lg opacity-80 hover:scale-110 transition-transform duration-300"
              style={{ transform: "scaleY(-1)" }}
            />
          </div>

          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div
                className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-cover bg-center shadow-2xl ring-4 ring-[#DDB958] ring-offset-4 transition-all duration-300 group-hover:scale-105"
                style={{
                  backgroundImage: `url(${
                    avatarPreview ||
                    (user?.avatar?.startsWith("http")
                      ? user.avatar
                      : `http://localhost:5000${user?.avatar}`) ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  })`,
                }}
              >
                {editMode && (
                  <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <span className="text-white text-sm font-semibold bg-[#DDB958] px-4 py-2 rounded-full">
                      📷 Đổi ảnh
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="mt-6 text-center">
              {editMode ? (
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleInputChange}
                  className="text-3xl md:text-4xl font-bold text-gray-800 border-b-2 border-[#DDB958] text-center focus:outline-none focus:border-[#c9a84a] px-4 py-2"
                />
              ) : (
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                  {user?.name}
                </h1>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            <div className="space-y-6">
              <InfoRow
                label="Tên đăng nhập"
                name="username"
                editData={user}
                editMode={false}
              />
              <InfoRow
                label="Email"
                name="email"
                editData={user}
                editMode={false}
              />
              <InfoRow
                label="Giới tính"
                name="gender"
                editData={editMode ? editData : user}
                handleInputChange={handleInputChange}
                type="gender"
                editMode={editMode}
              />
            </div>
            <div className="space-y-6">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================== ROW COMPONENT ===================
const InfoRow = ({
  label,
  name,
  editData,
  handleInputChange,
  editMode,
  type = "text",
}) => {
  const renderGender = () => {
    if (editMode) {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              handleInputChange({ target: { name, value: "Male" } })
            }
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              editData[name] === "Male"
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FontAwesomeIcon icon={faMars} className="mr-2" />
            Nam
          </button>
          <button
            type="button"
            onClick={() =>
              handleInputChange({ target: { name, value: "Female" } })
            }
            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
              editData[name] === "Female"
                ? "bg-pink-500 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FontAwesomeIcon icon={faVenus} className="mr-2" />
            Nữ
          </button>
        </div>
      );
    } else {
      return (
        <span className="flex items-center gap-2 text-lg">
          {editData[name] === "Male" ? (
            <>
              <FontAwesomeIcon
                icon={faMars}
                className="text-blue-500 text-xl"
              />
              <span className="text-gray-700 font-medium">Nam</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon
                icon={faVenus}
                className="text-pink-500 text-xl"
              />
              <span className="text-gray-700 font-medium">Nữ</span>
            </>
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
            value={
              editData[name] ? moment(editData[name]).format("YYYY-MM-DD") : ""
            }
            onChange={handleInputChange}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#DDB958] transition-colors duration-300"
          />
        );
      }
      return (
        <input
          type="text"
          name={name}
          value={editData[name] || ""}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-[#DDB958] transition-colors duration-300"
        />
      );
    }

    if (type === "date" && editData[name]) {
      return (
        <span className="text-gray-700 font-medium">
          {moment(editData[name]).format("DD/MM/YYYY")}
        </span>
      );
    }

    return (
      <span className="text-gray-700 font-medium">
        {editData[name] || "Chưa cập nhật"}
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </label>
        <div className="text-base">{renderField()}</div>
      </div>
    </div>
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
        <span className="text-[15px] sm:text-[20px] font-bold ml-2">
          Thông tin tài khoản
        </span>
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
