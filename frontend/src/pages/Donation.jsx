import qr from "../assets/img/qr.jpg";
import { motion } from "framer-motion";
import tim from "../assets/img/Anh_Tim_Qr.png";

export default function Donation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#DCBA58] mb-4">
            Quyên Góp Duy Trì Hoạt Động Tình Nguyện
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Hãy đóng góp để giúp chúng tôi duy trì các hoạt động tình nguyện và
            mang lại nhiều lợi ích cho cộng đồng.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* QR Code Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-[#DCBA58] to-[#c9a84a] p-6 rounded-2xl shadow-lg mb-4">
              <img
                src={qr}
                alt="QR Code"
                className="rounded-lg w-[320px] h-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Quét mã QR để quyên góp
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <span className="text-gray-400 font-medium">HOẶC</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>

          {/* Bank Information */}
          <div className="space-y-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-[#DCBA58]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Thông tin chuyển khoản
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-700 min-w-[140px]">
                  Số tài khoản:
                </span>
                <span className="text-gray-900 font-mono text-lg">
                  0984688798
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-700 min-w-[140px]">
                  Chủ tài khoản:
                </span>
                <span className="text-gray-900">Nguyễn Trường Nam</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-700 min-w-[140px]">
                  Ngân hàng:
                </span>
                <span className="text-gray-900">
                  Ngân hàng TMCP Quân Đội (MB)
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-gray-700 min-w-[140px]">
                  Cú pháp:
                </span>
                <span className="text-gray-900 bg-yellow-50 px-3 py-1 rounded-md border border-yellow-200">
                  Tình nguyện UET - Tên người ủng hộ - Lời nhắn
                </span>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-[#DCBA58]">
            <div className="flex items-start gap-3">
              <motion.div
                className="flex-shrink-0 mt-1"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <img src={tim} alt="hearts" className="w-10 h-10" />
              </motion.div>
              <p className="text-gray-700 leading-relaxed">
                <span className="font-semibold text-[#DCBA58]">Cảm ơn bạn</span>{" "}
                đã chung tay để không ai bị bỏ lại phía sau trên hành trình vì
                cộng đồng, vì sự phát triển của đất nước!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
