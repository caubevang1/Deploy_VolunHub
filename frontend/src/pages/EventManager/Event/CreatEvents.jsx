import React, { useState, useRef } from "react";
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Upload,
  InputNumber,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { CreatEvents } from "../../../services/EventManagerService";

const { Option } = Select;

export default function CreateEvent() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const navigate = useNavigate();
  const galleryCounterRef = useRef(0);

  const convertImgURLToFile = async (url, filename = null) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const name = filename || `pasted_${Date.now()}`;
      return new File([blob], `${name}.${blob.type.split("/")[1]}`, {
        type: blob.type,
      });
    } catch (err) {
      console.error("Convert failed:", err);
      return null;
    }
  };

  const onEditorReady = (editor) => {
    setEditorInstance(editor);
    editor.editing.view.document.on("clipboardInput", async (evt, data) => {
      const html = data.dataTransfer.getData("text/html");
      if (!html || !html.includes("<img")) return;

      const temp = document.createElement("div");
      temp.innerHTML = html;
      const imgTags = temp.querySelectorAll("img");
      if (imgTags.length === 0) return;

      const newFiles = [];
      for (const img of imgTags) {
        const src = img.src;
        const index = galleryCounterRef.current + newFiles.length;
        const file = await convertImgURLToFile(src, `pasted_img_${index}`);
        if (file) newFiles.push(file);
      }

      if (newFiles.length > 0) {
        galleryCounterRef.current += newFiles.length;
        setGalleryImages((prev) => [...prev, ...newFiles]);
      }
    });
  };

  const buildDescriptionWithPlaceholder = () => {
    if (!editorInstance) return "";
    let html = editorInstance.getData();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const imgTags = temp.querySelectorAll("img");
    imgTags.forEach((img, idx) => {
      const placeholder = `[IMAGE_PLACEHOLDER_${idx}]`;
      const span = document.createTextNode(placeholder);
      img.replaceWith(span);
    });
    return temp.innerHTML;
  };

  const handleCreateEvent = async (values) => {
    setLoading(true);
    try {
      const descriptionWithPlaceholder = buildDescriptionWithPlaceholder();
      const formData = new FormData();
      
      // Gán các trường cơ bản
      formData.append("name", values.name);
      formData.append("location", values.location);
      formData.append("category", values.category);
      // Đảm bảo maxParticipants là Number để tránh lỗi 400
      formData.append("maxParticipants", Number(values.maxParticipants));
      // Format ngày gửi lên server
      formData.append("date", values.date.toISOString());
      formData.append("endDate", values.endDate.toISOString());
      formData.append("description", descriptionWithPlaceholder);

      // Xử lý Ảnh bìa (Cover Image)
      if (values.coverImage && values.coverImage.length > 0) {
        formData.append("coverImage", values.coverImage[0].originFileObj);
      } else if (galleryImages.length > 0) {
        // Fallback: lấy ảnh đầu tiên dán trong editor làm cover
        formData.append("coverImage", galleryImages[0]);
      }

      // Xử lý bộ sưu tập ảnh (Gallery)
      galleryImages.forEach((file) => {
        formData.append("galleryImages", file);
      });

      const res = await CreatEvents(formData);

      if (res.status === 201 || res.status === 200) {
        Swal.fire("Thành công!", "Sự kiện đang chờ quản trị viên duyệt", "success");
        navigate("/quanlisukien/su-kien");
      }
    } catch (err) {
      console.error("Create event error:", err);
      const errorMsg = err.response?.data?.message || "Dữ liệu không hợp lệ, vui lòng kiểm tra lại!";
      Swal.fire("Lỗi tạo sự kiện", errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const volunteerCategories = [
    { label: "Cộng đồng", value: "Community" },
    { label: "Giáo dục", value: "Education" },
    { label: "Sức khỏe", value: "Healthcare" },
    { label: "Môi trường", value: "Environment" },
    { label: "Sự kiện", value: "EventSupport" },
    { label: "Kỹ thuật", value: "Technical" },
    { label: "Cứu trợ khẩn cấp", value: "Emergency" },
    { label: "Trực tuyến", value: "Online" },
    { label: "Doanh nghiệp", value: "Corporate" }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">TẠO SỰ KIỆN TÌNH NGUYỆN</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateEvent}
        initialValues={{ category: "Community", maxParticipants: 50 }}
      >
        <Form.Item 
          label={<span className="font-semibold">Tên sự kiện</span>} 
          name="name" 
          rules={[{ required: true, message: 'Vui lòng nhập tên sự kiện!' }]}
        >
          <Input size="large" placeholder="Ví dụ: Chiến dịch mùa hè xanh 2024" />
        </Form.Item>

        <Form.Item label={<span className="font-semibold">Mô tả chi tiết</span>} required>
          <div className="border rounded-lg overflow-hidden">
            <CKEditor
              editor={ClassicEditor}
              onReady={onEditorReady}
              // SỬA: Loại bỏ biến unused 'e' và 'editor' để fix lỗi ESLint
              onChange={() => {}}
              config={{
                toolbar: ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "undo", "redo", "imageUpload"],
                placeholder: "Nhập mô tả hoặc dán hình ảnh trực tiếp vào đây..."
              }}
            />
          </div>
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item 
            label={<span className="font-semibold">Ngày bắt đầu</span>} 
            name="date" 
            rules={[{ required: true, message: 'Chọn ngày bắt đầu!' }]}
          >
            <DatePicker size="large" className="w-full" format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item 
            label={<span className="font-semibold">Ngày kết thúc</span>} 
            name="endDate" 
            rules={[{ required: true, message: 'Chọn ngày kết thúc!' }]}
          >
            <DatePicker size="large" className="w-full" format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <Form.Item 
          label={<span className="font-semibold">Địa điểm</span>} 
          name="location" 
          rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
        >
          <Input size="large" placeholder="Địa chỉ chi tiết nơi diễn ra sự kiện" />
        </Form.Item>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item label={<span className="font-semibold">Loại sự kiện</span>} name="category" rules={[{ required: true }]}>
            <Select size="large">
              {volunteerCategories.map(option => (
                <Option key={option.value} value={option.value}>{option.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={<span className="font-semibold">Số lượng TNV tối đa</span>} name="maxParticipants" rules={[{ required: true }]}>
            <InputNumber size="large" min={1} max={1000} className="w-full" />
          </Form.Item>
        </div>

        <Form.Item
          label={<span className="font-semibold">Ảnh bìa (Không bắt buộc)</span>}
          name="coverImage"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
        >
          <Upload beforeUpload={() => false} listType="picture" maxCount={1}>
            <Button icon={<UploadOutlined />} size="large">Tải lên ảnh bìa</Button>
          </Upload>
        </Form.Item>

        <div className="mt-8">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            className="w-full h-12 text-lg font-bold"
            style={{ background: "#DDB958", borderColor: "#DDB958" }}
          >
            GỬI YÊU CẦU TẠO SỰ KIỆN
          </Button>
        </div>
      </Form>
    </div>
  );
}