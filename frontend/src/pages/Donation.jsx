import qr from "../assets/img/qr.jpg"
import { motion } from "framer-motion";
import tim from "../assets/img/Anh_Tim_Qr.png"

export default function Donation() {
  return (
    <div className="flex flex-col items-center my-6 md:my-10 gap-4 md:gap-5 text-base md:text-[20px] px-4">
      <h1 className="text-2xl md:text-4xl text-[#DCBA58] font-semibold text-center">Quyên Góp Duy Trì Hoạt Động Tình Nguyện</h1>
      <p className="text-base md:text-[20px] font-normal text-center">Hãy đóng góp để giúp chúng tôi duy trì các hoạt động tình nguyện và mang lại nhiều lợi ích cho cộng đồng.</p>
      <img
        src={qr}
        alt="QR"
        className="rounded-md w-[250px] md:w-[350px] h-auto"
      />
      <p className="text-sm md:text-[15px] text-center">Quét mã QR để quyên góp</p>
      <p className="text-center">Hoặc chuyển khoản qua số tài khoản: 0984688798</p>
      <p className="text-center">
        <span className="font-semibold">Tên chủ tài khoản:</span> Nguyễn Trường Nam
      </p>
      <p className="text-center">
        <span className="font-semibold">Ngân hàng:</span> Ngân hàng TMCP Quân Đội (MB)
      </p>
      <p className="text-center">
        <span className="font-semibold">Cú pháp:</span> Tình nguyện UET - Tên người ủng hộ - Lời nhắn
      </p>
      <p className="flex flex-col md:flex-row items-center text-center md:text-left gap-2">
        <span>Cảm ơn bạn đã chung tay để không ai bị bỏ lại phía sau trên hành trình vì cộng đồng, vì sự phát triển của đất nước!</span>
        <span className="inline-block">
          <div className="relative h-12 w-12 overflow-visible">
            <motion.img
              src={tim}
              alt="hearts"
              className="absolute bottom-0 left-0 w-full h-full"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: [-10, -20, -40], opacity: [0, 1, 1] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </span>
      </p>
    </div>
  );

}
