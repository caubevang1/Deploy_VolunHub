/**
 * Header Component
 * Main navigation bar with authentication UI and role-based menu.
 * Implements auto-hide on scroll, mobile responsive menu, and notification bell.
 */

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
import { getAvatarUrl } from "../utils/imageHelper";
import {
  faArrowRightFromBracket,
  faUser,
  faUserShield,
  faUserTie,
  faBars,
  faTimes,
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

  /**
   * Handle user logout with confirmation dialog.
   */
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Fetch and update user info on mount if user is logged in.
   */
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user && user.id) {
        try {
          const res = await GetUserInfo();
          if (res.status === 200 && res.data) {
            const updatedUser = { ...user, ...res.data };
            dispatch(setUser(updatedUser));

            // Update localStorage to persist avatar
            const storedUser = JSON.parse(localStorage.getItem(LOCALSTORAGE_USER) || '{}');
            localStorage.setItem(LOCALSTORAGE_USER, JSON.stringify({ ...storedUser, ...updatedUser }));
          }
        } catch (error) {
          console.error("Failed to fetch user info:", error);
        }
      }
    };
    fetchUserInfo();
  }, [dispatch]);

  /**
   * Throttled scroll handler for header auto-hide.
   */
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowHeader(window.scrollY < lastScrollY);
          setLastScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`${showHeader ? "translate-y-0" : "-translate-y-full"
        } bg-gray-900 text-white py-4 shadow-md fixed top-0 left-0 w-full transition-transform duration-300 z-50`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo trường và đoàn */}
          <div className="flex items-center gap-2">
            <img src={logoUet} alt="Logo UET" className="h-10 md:h-16" />
            <img src={logoDoan} alt="Logo Đoàn" className="h-10 md:h-16" />
            <img src={logoHsv} alt="Logo HSV" className="h-10 md:h-16" />
            <img src={dhcn} alt="Logo DHCN" className="h-8 md:h-12" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex gap-6 text-lg font-semibold">
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
                  className={`hover:text-white transition ${isActive ? "text-white" : "text-[#A0A0A7]"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side: User/Login + Mobile Menu Button */}
          <div className="flex items-center gap-4">
            {/* User Avatar or Login Button */}
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
                          ? getAvatarUrl(user.avatar)
                          : "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(user?.username || user?.name || "User") +
                          "&background=DCBA58&color=fff&size=128"
                      }
                      alt="User Avatar"
                      className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-[#DCBA58]"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(user?.username || user?.name || "User") +
                          "&background=DCBA58&color=fff&size=128";
                      }}
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-[#111827] 
                      ${user?.status === "ACTIVE"
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
                className="bg-[#DCBA58] text-black px-3 py-1.5 md:px-4 md:py-2 rounded-md font-medium hover:bg-[#CDA550] transition text-sm md:text-base"
              >
                Đăng Nhập
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-white text-2xl"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 flex flex-col gap-3 pb-4 border-t border-gray-700 pt-4">
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
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-lg font-semibold hover:text-white transition ${isActive ? "text-white" : "text-[#A0A0A7]"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

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
