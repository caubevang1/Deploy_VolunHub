import { useEffect, useState } from "react";
import { Tabs } from "antd";
import moment from "moment";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import {
  GetUserInfo,
  UpdateUser,
  ChangePassword,
  ChangeEmail,
} from "../services/UserService";
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
      user.avatar
        ? user.avatar.startsWith("http")
          ? user.avatar
          : `http://localhost:5000${user.avatar}`
        : "http://localhost:5000/uploads/avatars/avatar-1764958251284-210153801.png"
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
      setEditMode(false);
      onUserUpdated(res.data.user);
      setAvatarFile(null);
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
        backgroundImage: `linear-gradient(to right, #576CBC, #7C83D3), linear-gradient(to bottom, transparent 50%, white 50%)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 50%, 100% 100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated floating circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-64 h-64 bg-white/10 rounded-full"
          style={{
            top: "10%",
            left: "5%",
            animation: "float 15s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-48 h-48 bg-white/10 rounded-full"
          style={{
            top: "30%",
            right: "10%",
            animation: "float 20s ease-in-out infinite reverse",
          }}
        ></div>
        <div
          className="absolute w-32 h-32 bg-white/10 rounded-full"
          style={{
            bottom: "20%",
            left: "15%",
            animation: "float 18s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-40 h-40 bg-white/10 rounded-full"
          style={{
            top: "50%",
            right: "25%",
            animation: "float 22s ease-in-out infinite reverse",
          }}
        ></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(15px);
          }
        }
      `}</style>

      <div className="content relative max-w-[1100px] mx-auto px-6 !py-[50px] bg-white rounded-3xl shadow-lg ">
        {/* Ảnh trang trí */}
        <img
          src={cats}
          alt="cat"
          className="absolute -top-[53px] left-[20px] w-[200px] drop-shadow-lg z-10"
        />
        <img
          src={bear}
          alt="bear"
          className="absolute bottom-[180px] -right-[90px] w-[135px] drop-shadow-lg z-10"
        />
        <img
          src={dog}
          alt="dog"
          className="absolute bottom-[-8px] right-[150px] w-[350px] drop-shadow-lg z-10"
        />
        <img
          src={lizard}
          alt="lizard"
          className="absolute top-[56px] right-[230px] w-[80px] drop-shadow-lg z-10"
          style={{ transform: "scaleY(-1)" }}
        />

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

            <div className="ml-4 mt-4 flex gap-4 text-3xl items-center">
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
              className={`px-4 py-2 mr-2 rounded-full shadow font-bold text-[14px] text-white ${
                user?.status === "ACTIVE"
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
              backgroundImage: `url(${
                avatarPreview ||
                (user?.avatar
                  ? user.avatar.startsWith("http")
                    ? user.avatar
                    : `http://localhost:5000${user.avatar}`
                  : "http://localhost:5000/uploads/avatars/avatar-1764958251284-210153801.png")
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
            <div className="flex items-center justify-center gap-3">
              {(() => {
                const points = user?.points || 0;
                let level = "Tân binh";
                let color = "default";

                if (points >= 1000) {
                  level = "Huyền thoại";
                  color = "purple";
                } else if (points >= 500) {
                  level = "Chuyên gia";
                  color = "red";
                } else if (points >= 200) {
                  level = "Tinh thông";
                  color = "orange";
                } else if (points >= 100) {
                  level = "Thành thạo";
                  color = "blue";
                } else if (points >= 50) {
                  level = "Trung cấp";
                  color = "cyan";
                }

                return (
                  <span
                    className={`px-3 py-1 rounded-sm text-sm font-semibold text-white relative overflow-hidden ${
                      color === "purple"
                        ? "bg-purple-500"
                        : color === "red"
                        ? "bg-red-500"
                        : color === "orange"
                        ? "bg-orange-500"
                        : color === "blue"
                        ? "bg-blue-500"
                        : color === "cyan"
                        ? "bg-cyan-500"
                        : "bg-gray-500"
                    }`}
                    style={{
                      boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                    }}
                  >
                    <span className="relative z-10">{level}</span>
                    <span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      style={{
                        animation: "shine 3s infinite linear",
                        transform: "translateX(-100%)",
                      }}
                    ></span>
                  </span>
                );
              })()}
              <h1 className="text-3xl font-semibold text-gray-800">
                {user?.name}
              </h1>
            </div>
          )}
        </div>

        <style>{`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(200%);
            }
          }
        `}</style>

        {/* 2 cột thông tin */}
        <div className="flex justify-between gap-12 content__list mt-6 text-[20px] px-4 py-2">
          <ul className="flex-1 space-y-8">
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
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() =>
              handleInputChange({ target: { name, value: "Male" } })
            }
            className={`p-2 rounded ${
              editData[name] === "Male"
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            <FontAwesomeIcon icon={faMars} />
          </button>
          <button
            type="button"
            onClick={() =>
              handleInputChange({ target: { name, value: "Female" } })
            }
            className={`p-2 rounded ${
              editData[name] === "Female"
                ? "bg-pink-500 text-white"
                : "bg-gray-200"
            }`}
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
            value={
              editData[name] ? moment(editData[name]).format("YYYY-MM-DD") : ""
            }
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
      return (
        <span className="flex-1 text-gray-600 font-medium">
          {moment(editData[name]).format("DD/MM/YYYY")}
        </span>
      );
    }

    // Xử lý hiển thị nếu là điểm số (hoặc các trường số khác)
    return (
      <span className="flex-1 text-gray-600 font-medium">{editData[name]}</span>
    );
  };

  return (
    <li
      className={`flex items-center gap-3 pb-6 ${
        type !== "gender" ? "border-b border-gray-200" : ""
      }`}
    >
      <strong className="w-40">{label}:</strong>
      <div className="flex-1">{renderField()}</div>
    </li>
  );
};

// =================== PASSWORD & EMAIL FORMS ===================
const sharedInput =
  "w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#576CBC] focus:ring-2 focus:ring-[#576CBC]/20 transition-all";
const sharedLabel = "block text-sm font-semibold text-gray-700 mb-2";
const sharedBtnPrimary =
  "bg-[#DDB958] hover:bg-[#C9A847] text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";
const sharedBtnAccent =
  "bg-[#576CBC] hover:bg-[#4A5BA8] text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed";

const PasswordForm = ({ onSuccess }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword)
      return Swal.fire("Lỗi", "Vui lòng điền đầy đủ thông tin.", "warning");
    if (newPassword !== confirmPassword)
      return Swal.fire("Lỗi", "Mật khẩu mới không khớp.", "warning");
    if (newPassword.length < 6)
      return Swal.fire("Lỗi", "Mật khẩu phải ít nhất 6 ký tự.", "warning");

    setLoading(true);
    try {
      const res = await ChangePassword({ oldPassword, newPassword });
      Swal.fire(
        "Thành công",
        res.data?.message || "Đổi mật khẩu thành công.",
        "success"
      );
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onSuccess) onSuccess();
    } catch (err) {
      Swal.fire(
        "Lỗi",
        err.response?.data?.message || "Có lỗi xảy ra.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="profile-page theme-purple min-h-screen py-[6rem]"
      style={{
        backgroundImage: `linear-gradient(to right, #576CBC, #7C83D3), linear-gradient(to bottom, transparent 50%, white 50%)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 50%, 100% 100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated floating circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-64 h-64 bg-white/10 rounded-full"
          style={{
            top: "10%",
            left: "5%",
            animation: "float 15s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-48 h-48 bg-white/10 rounded-full"
          style={{
            top: "30%",
            right: "10%",
            animation: "float 20s ease-in-out infinite reverse",
          }}
        ></div>
        <div
          className="absolute w-32 h-32 bg-white/10 rounded-full"
          style={{
            bottom: "20%",
            left: "15%",
            animation: "float 18s ease-in-out infinite",
          }}
        ></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-40px) translateX(-10px); }
          75% { transform: translateY(-20px) translateX(15px); }
        }
      `}</style>

      <div className="content relative max-w-[700px] mx-auto px-6 py-12 bg-white rounded-3xl shadow-lg">
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Đổi mật khẩu
          </h3>
          <p className="text-center text-gray-500 text-sm">
            Bảo mật tài khoản của bạn
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className={sharedLabel}>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={sharedInput}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>
          <div>
            <label className={sharedLabel}>Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={sharedInput}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            />
          </div>
          <div>
            <label className={sharedLabel}>Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={sharedInput}
              placeholder="Nhập lại mật khẩu mới"
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className={sharedBtnAccent + " w-full"}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EmailForm = ({ user, onUpdated }) => {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!newEmail || !password)
      return Swal.fire("Lỗi", "Vui lòng điền email và mật khẩu.", "warning");
    setLoading(true);
    try {
      const res = await ChangeEmail({ newEmail, password });
      Swal.fire(
        "Thành công",
        res.data?.message || "Đổi email thành công.",
        "success"
      );
      if (res.data?.user && onUpdated) onUpdated(res.data.user);
      setNewEmail("");
      setPassword("");
    } catch (err) {
      Swal.fire(
        "Lỗi",
        err.response?.data?.message || "Có lỗi xảy ra.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="profile-page theme-purple min-h-screen py-[6rem]"
      style={{
        backgroundImage: `linear-gradient(to right, #576CBC, #7C83D3), linear-gradient(to bottom, transparent 50%, white 50%)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 50%, 100% 100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated floating circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-64 h-64 bg-white/10 rounded-full"
          style={{
            top: "15%",
            left: "8%",
            animation: "float 18s ease-in-out infinite",
          }}
        ></div>
        <div
          className="absolute w-48 h-48 bg-white/10 rounded-full"
          style={{
            top: "35%",
            right: "12%",
            animation: "float 22s ease-in-out infinite reverse",
          }}
        ></div>
        <div
          className="absolute w-32 h-32 bg-white/10 rounded-full"
          style={{
            bottom: "25%",
            left: "18%",
            animation: "float 16s ease-in-out infinite",
          }}
        ></div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-40px) translateX(-10px); }
          75% { transform: translateY(-20px) translateX(15px); }
        }
      `}</style>

      <div className="content relative max-w-[700px] mx-auto px-6 py-12 bg-white rounded-3xl shadow-lg">
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Đổi email
          </h3>
          <p className="text-center text-gray-500 text-sm">
            Cập nhật địa chỉ email của bạn
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className={sharedLabel}>Email mới</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={sharedInput}
              placeholder="Nhập email mới"
            />
          </div>
          <div>
            <label className={sharedLabel}>Mật khẩu hiện tại</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={sharedInput}
              placeholder="Xác thực bằng mật khẩu"
            />
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className={sharedBtnAccent + " w-full"}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đổi email"}
            </button>
          </div>
        </form>
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
    {
      label: (
        <span className="text-[15px] sm:text-[20px] font-bold ml-2">
          Đổi mật khẩu
        </span>
      ),
      key: 2,
      children: <PasswordForm onSuccess={() => {}} />,
    },
    {
      label: (
        <span className="text-[15px] sm:text-[20px] font-bold ml-2">
          Đổi email
        </span>
      ),
      key: 3,
      children: <EmailForm user={user} onUpdated={setUser} />,
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
