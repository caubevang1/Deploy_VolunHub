import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import dhcn from "../assets/img/Truong_DHCN.png";
import logoUet from "../assets/img/Logo_UET.webp";
import logoDoan from "../assets/img/Logo_Doan.webp";
import logoHsv from "../assets/img/Logo_Hsv.webp";
import Login from "./Login";
import Register from "./Register";
import ForgetPassword from "./ForgetPassword";
import { useDispatch, useSelector } from "react-redux";
import { openLogin, logout, setUser } from "../redux/reducers/UserReducer";
import { Dropdown, Menu } from "antd";
import { removeLocalStorage, SwalConfig } from "../utils/Configs";
import { LOCALSTORAGE_USER } from "../utils/Constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faUser,
  faUserShield,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import { GetUserInfo } from "../services/UserService";

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector((state) => state.user.user);
  const showLogin = useSelector((state) => state.user.showLogin);
  const showRegister = useSelector((state) => state.user.showRegister);
  const showForgetPassword = useSelector(
    (state) => state.user.showForgetPassword
  );

  const handleLogout = () => {
    Swal.fire({
      title: "Bạn có muốn đăng xuất không ?",
      showDenyButton: true,
      confirmButtonText: "Đồng ý",
      denyButtonText: "Hủy",
      icon: "question",
      iconColor: "rgb(104 217 254)",
      confirmButtonColor: "#DDB958",
    }).then((result) => {
      if (result.isConfirmed) {
        dispatch(logout());
        SwalConfig("Đã đăng xuất", "success", false);
        removeLocalStorage(LOCALSTORAGE_USER);
        navigate("/trang-chu");
      }
    });
  };

  const menuItems = [
    {
      key: "1",
      icon: <FontAwesomeIcon icon={faUser} />,
      label: "Thông tin tài khoản",
      onClick: () => navigate("/thong-tin-ca-nhan"),
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            key: "2",
            icon: <FontAwesomeIcon icon={faUserShield} />,
            label: "Trang admin",
            onClick: () => navigate("/admin"),
          },
        ]
      : []),
    ...(user?.role === "EVENTMANAGER"
      ? [
          {
            key: "3",
            icon: <FontAwesomeIcon icon={faUserTie} />,
            label: "Trang quản lý",
            onClick: () => navigate("/quanlisukien"),
          },
        ]
      : []),
    {
      key: "4",
      icon: <FontAwesomeIcon icon={faArrowRightFromBracket} />,
      label: "Đăng xuất",
      onClick: handleLogout,
    },
  ];

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setShowHeader(window.scrollY < lastScrollY);
      setLastScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await GetUserInfo();
        if (res?.data) {
          dispatch(setUser(res.data));
        }
      } catch (err) {
        console.error("Không thể lấy thông tin người dùng:", err);
      }
    };

    fetchUser();
  }, [dispatch]);

  return (
    <header
      className={`${
        showHeader ? "translate-y-0" : "-translate-y-full"
      } bg-gray-900 text-white py-4 shadow-md fixed top-0 left-0 w-full transition-transform duration-300 z-50`}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo trường và đoàn */}
        <div className="flex items-center gap-2">
          <img src={logoUet} alt="Logo UET" className="h-16" />
          <img src={logoDoan} alt="Logo Đoàn" className="h-16" />
          <img src={logoHsv} alt="Logo HSV" className="h-16" />
          <img src={dhcn} alt="Logo DHCN" className="h-12" />
          <nav className="flex gap-6 text-lg ml-14 pl-4 font-semibold">
            {[
              { to: "/trang-chu", label: "Trang chủ" },
              { to: "/dashboard", label: "Dashboard" },
              { to: "/hoat-dong", label: "Hoạt động" },
              { to: "/quyen-gop", label: "Quyên góp" },
              { to: "/tam-guong", label: "Tấm gương tình nguyện" },
            ].map(({ to, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`hover:text-white transition ${
                    isActive ? "text-white" : "text-[#A0A0A7]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Nút đăng nhập hoặc avatar */}
        <div className="flex items-center gap-4">
          {user ? (
            <Dropdown
              menu={{ items: menuItems }}
              trigger={["hover"]}
              placement="bottom"
              arrow
            >
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <img
                    src={
                      user?.avatar
                        ? user.avatar.startsWith("http")
                          ? user.avatar
                          : `http://localhost:5000${user.avatar}`
                        : "https://tse4.mm.bing.net/th/id/OIP.sDwEr1D6McBY9MeE3a_NpAHaHa?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3"
                    }
                    alt="User Avatar"
                    className="w-16 h-16 rounded-full object-cover "
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        "https://tse4.mm.bing.net/th/id/OIP.sDwEr1D6McBY9MeE3a_NpAHaHa?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3";
                    }}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#111827] 
                    ${
                      user?.status === "ACTIVE"
                        ? "bg-green-500"
                        : user?.status === "LOCKED"
                        ? "bg-red-500"
                        : "bg-red-400"
                    }`}
                    title={
                      user?.status === "ACTIVE"
                        ? "Đang hoạt động"
                        : user?.status === "LOCKED"
                        ? "Bị khóa"
                        : "Không rõ"
                    }
                  ></span>
                </div>
              </div>
            </Dropdown>
          ) : (
            <button
              onClick={() => dispatch(openLogin())}
              className="bg-[#DCBA58] text-black px-4 py-2 rounded-md font-medium hover:bg-[#CDA550] transition"
            >
              Đăng Nhập
            </button>
          )}
        </div>

        {/* Modal đăng nhập / đăng ký */}
        <AnimatePresence>
          {showLogin && <Login />}
          {showRegister && <Register />}
          {showForgetPassword && <ForgetPassword />}
        </AnimatePresence>
      </div>
    </header>
  );
}
