import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import aoDoan from "../assets/img/Anh_Ao_Doan.jpg";
import tapThe from "../assets/img/Tap_The.jpeg";
import introVideo from "../assets/video/test4K - Trim.mp4";
import { useDispatch } from "react-redux";
import { openRegister } from "../redux/reducers/UserReducer";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function HomePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        const video = document.getElementById("intro-video");
        if (video) {
            video.play();
            video.addEventListener("ended", () => {
                setShowContent(true);
            });
        }
        const fallback = setTimeout(() => setShowContent(true), 10000); // 10s
        return () => clearTimeout(fallback);
    }, []);

    const handleButtonClick = (e) => {
        e.preventDefault();
        if (isLoggedIn) {
            navigate("/hoat-dong"); // Nếu đã đăng nhập → chuyển trang
        } else {
            dispatch(openRegister()); // Nếu chưa đăng nhập → mở modal đăng ký
        }
    };

    return (
        <div className="flex flex-col w-full overflow-hidden gap-10" style={{ background: "#F9FAFB" }}>
            {/* ========== VIDEO INTRO ========== */}
            {!showContent && (
                <div className="fixed inset-0 flex items-center justify-center bg-black">
                    <video
                        id="intro-video"
                        src={introVideo}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                    />
                </div>
            )}

            {/* ========== NỘI DUNG CHÍNH ========== */}
            {showContent && (
                <>
                    {/* =================== PHẦN 1 =================== */}
                    <motion.div
                        className="flex flex-col md:flex-row-reverse w-full min-h-screen"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                        <motion.div
                            className="md:w-1/2 w-full h-64 md:h-screen"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                        >
                            <motion.img
                                src={tapThe}
                                alt="Thanh niên tình nguyện"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                whileHover={{ scale: 1.05 }}
                            />
                        </motion.div>

                        <motion.div
                            className="md:w-1/2 w-full flex flex-col justify-center items-start px-6 md:px-10 py-8 md:py-12 bg-gray-50"
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                        >
                            <motion.h1
                                className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight"
                                style={{ color: "#DBBA58" }}
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1 }}
                            >
                                Về Chúng Tôi
                            </motion.h1>

                            <motion.p
                                className="text-gray-600 text-base md:text-lg"
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.2 }}
                            >
                                Tình Nguyện UET là một tổ chức phi lợi nhuận hoạt động tại trường Đại học Công Nghệ ĐHQG Hà Nội (UET). Hằng năm, chúng tôi tổ chức nhiều hoạt động hướng về vùng cao, vùng khó khăn như: Chương trình “Mùa đông ấm” mang quần áo, sách vở và đồ dùng thiết yếu đến với các em nhỏ vùng núi, chiến dịch “Mùa hè xanh” - tham gia xây dựng, dọn dẹp thôn xóm, hỗ trợ dạy học hè cho trẻ em. Bên cạnh các chuyến đi xa, UET cũng tổ chức nhiều hoạt động thiện nguyện tại địa phương như: Ngày hội hiến máu “Giọt hồng tri ân” thu hút hàng trăm sinh viên, giảng viên tham gia mỗi năm, sự kiện “Chủ Nhật Xanh” nhằm xây dựng cảnh quan môi trường luôn “xanh-sạch-đẹp”.
                            </motion.p>
                        </motion.div>
                    </motion.div>

                    {/* =================== DÒNG CHỮ GIỮA 2 SECTION =================== */}
                    <motion.div
                        id="middle"
                        className="w-full h-auto md:h-[42vh] flex items-center justify-center px-6 py-12 md:py-0"
                        style={{ lineHeight: "1.3" }}
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <motion.h2
                            className="text-3xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 tracking-wide text-center"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 1 }}
                            style={{ lineHeight: "1.3" }}
                        >
                            Sức Trẻ - Nhiệt Huyết - Cống Hiến
                        </motion.h2>
                    </motion.div>

                    {/* =================== PHẦN 2 =================== */}
                    <motion.div
                        className="flex flex-col md:flex-row w-full min-h-screen"
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                        <motion.div
                            className="md:w-1/2 w-full h-64 md:h-screen"
                            initial={{ x: -100, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                        >
                            <motion.img
                                src={aoDoan}
                                alt="Đại học Công nghệ"
                                className="w-full h-full object-cover scale-100 hover:scale-105 transition-transform duration-700"
                                whileHover={{ scale: 1.05 }}
                            />
                        </motion.div>

                        <motion.div
                            className="md:w-1/2 w-full flex flex-col justify-center items-start px-6 md:px-10 py-8 md:py-12 bg-gray-50"
                            initial={{ x: 100, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                        >
                            <motion.h1
                                className="text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight"
                                style={{ color: "#DBBA58" }}
                                initial={{ y: 30, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                            >
                                Tuổi Trẻ Công Nghệ
                            </motion.h1>

                            <motion.p
                                className="text-gray-600 text-base md:text-lg"
                                initial={{ y: 40, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ delay: 1.2 }}
                            >
                                Mỗi người chỉ có một lần sống vì tuổi trẻ. Khi quãng thời gian đẹp nhất qua đi, chúng ta sẽ trưởng thành với những lo âu bộn bề của cuộc sống. Tuổi trẻ không quá ngắn và cũng không quá dài, vậy tại sao chúng ta không dám sống hết mình, cống hiến hết mình khi có sức trẻ và lòng nhiệt huyết dâng trào!
                            </motion.p>

                            <motion.a
                                href="#"
                                className="mt-8 inline-block text-white px-6 py-3 rounded-lg shadow-md bg-[#DCBA58] hover:bg-[#CDA550] transition font-semibold"
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={handleButtonClick}
                            >
                                {isLoggedIn ? "Xem Hoạt Động →" : "Đăng Ký Ngay →"}
                            </motion.a>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </div>
    );
};

