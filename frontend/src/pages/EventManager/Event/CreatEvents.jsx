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

  // Convert pasted image → File
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
      if (!html || !html.includes("<img")) return; // normal paste

      // Extract <img> without interfering CKEditor display
      const temp = document.createElement("div");
      temp.innerHTML = html;

      const imgTags = temp.querySelectorAll("img");
      if (imgTags.length === 0) return;

      // Collect FILE versions of every pasted image
      const newFiles = [];
      for (const img of imgTags) {
        const src = img.src;
        const index = galleryCounterRef.current + newFiles.length;
        const file = await convertImgURLToFile(src, `pasted_img_${index}`);
        if (file) newFiles.push(file);
      }

      // Store new gallery files
      if (newFiles.length > 0) {
        galleryCounterRef.current += newFiles.length;
        setGalleryImages((prev) => [...prev, ...newFiles]);
      }
    });
  };

  // Build description WITH placeholders but keep editor display intact
  const buildDescriptionWithPlaceholder = () => {
    if (!editorInstance) return "";

    let html = editorInstance.getData();

    // create a DOM clone to operate on
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
      formData.append("name", values.name);
      formData.append("location", values.location);
      formData.append("category", values.category);
      formData.append("maxParticipants", values.maxParticipants);
      formData.append("date", values.date.format("YYYY-MM-DD"));
      formData.append("endDate", values.endDate.format("YYYY-MM-DD"));
      formData.append("description", descriptionWithPlaceholder);

      // Cover image: Nếu không chọn ảnh bìa, lấy ảnh đầu tiên trong gallery
      const coverFile = values.coverImage?.[0]?.originFileObj || galleryImages[0];
      if (coverFile) formData.append("coverImage", coverFile);

      // Gallery images
      galleryImages.forEach((file) => formData.append("galleryImages", file));

      const res = await CreatEvents(formData);

      if (res.status === 201) {
        Swal.fire("Thành công!", "Sự kiện đã được tạo", "success");
        navigate("/quanlisukien/su-kien");
      } else {
        Swal.fire("Lỗi", "Không thể tạo sự kiện", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Có lỗi khi tạo sự kiện", "error");
    }
    setLoading(false);
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
    <div>
      <h2 className="text-2xl font-bold mb-4">TẠO SỰ KIỆN</h2>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateEvent}
        initialValues={{ category: "Community", maxParticipants: 50 }}
      >
        <Form.Item label="Tên sự kiện" name="name" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>

        <Form.Item label="Mô tả chi tiết" required>
          <CKEditor
            editor={ClassicEditor}
            onReady={onEditorReady}
            onChange={(e, editor) => { }}
            config={{
              toolbar: [
                "heading",
                "|",
                "bold",
                "italic",
                "link",
                "bulletedList",
                "numberedList",
                "undo",
                "redo",
                "imageUpload",
              ],
              image: { toolbar: ["imageTextAlternative", "imageStyle:full", "imageStyle:side"] },
            }}
          />
        </Form.Item>

        <Form.Item label="Ngày bắt đầu" name="date" rules={[{ required: true }]}>
          <DatePicker size="large" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Ngày kết thúc" name="endDate" rules={[{ required: true }]}>
          <DatePicker size="large" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Địa điểm" name="location" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>

        <Form.Item label="Loại sự kiện" name="category" rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}>
          <Select size="large">
            {volunteerCategories.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Số lượng tham gia tối đa" name="maxParticipants" rules={[{ required: true }]}>
          <InputNumber size="large" min={1} max={1000} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Ảnh bìa"
          name="coverImage"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList || []}
          rules={[{ required: false }]}
        >
          <Upload beforeUpload={() => false} listType="picture" maxCount={1}>
            <Button icon={<UploadOutlined />} size="large">Chọn ảnh bìa</Button>
          </Upload>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          size="large"
          style={{ width: "100%", background: "#DDB958" }}
        >
          Tạo sự kiện
        </Button>
      </Form>
    </div>
  );
}
