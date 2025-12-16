import { useState, useEffect, useRef } from "react";
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Upload,
  InputNumber,
  Spin,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  GetEventDetail,
  UpdateEvents,
} from "../../../services/EventManagerService";
import dayjs from "dayjs";

const { Option } = Select;

export default function EditEvent() {
  const { slug } = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [galleryImages, setGalleryImages] = useState([]);
  const [editorInstance, setEditorInstance] = useState(null);
  const [event, setEvent] = useState(null);
  const galleryCounterRef = useRef(0);

  const volunteerCategories = [
    { label: "Cộng đồng", value: "Community" },
    { label: "Giáo dục", value: "Education" },
    { label: "Sức khỏe", value: "Healthcare" },
    { label: "Môi trường", value: "Environment" },
    { label: "Sự kiện", value: "EventSupport" },
    { label: "Kỹ thuật", value: "Technical" },
    { label: "Cứu trợ khẩn cấp", value: "Emergency" },
    { label: "Trực tuyến", value: "Online" },
    { label: "Doanh nghiệp", value: "Corporate" },
  ];

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

  const renderDescription = (description, galleryImages) => {
    if (!description || !galleryImages) return description;

    let html = description;

    galleryImages.forEach((img, index) => {
      const realUrl = img.url ? img.url : `http://localhost:5000${img}`;
      const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
      const imgTag = `<img src="${realUrl}" style="max-width:100%; border-radius:6px;" />`;
      html = html.replaceAll(placeholder, imgTag);
    });

    return html;
  };

  const buildDescriptionWithPlaceholder = () => {
    if (!editorInstance) return "";

    const html = editorInstance.getData();
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const imgTags = temp.querySelectorAll("img");

    imgTags.forEach((img, index) => {
      const placeholder = `[IMAGE_PLACEHOLDER_${index}]`;
      img.replaceWith(document.createTextNode(placeholder));
    });

    return temp.innerHTML;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await GetEventDetail(slug);
        if (res.status === 200) {
          const eventData = res.data;
          setEvent(eventData);

          form.setFieldsValue({
            name: eventData.name,
            location: eventData.location,
            category: eventData.category,
            maxParticipants: eventData.maxParticipants,
            date: dayjs(eventData.date),
            endDate: eventData.endDate ? dayjs(eventData.endDate) : null,
          });

          const galleryFiles = eventData.galleryImages.map((img, i) => ({
            uid: `${i}`,
            name: `gallery_${i}.jpg`,
            status: "done",
            url: `http://localhost:5000${img}`,
          }));
          setGalleryImages(galleryFiles);

          const updatedDescription = renderDescription(
            eventData.description,
            eventData.galleryImages
          );
          setDescription(updatedDescription);

          if (eventData.coverImage) {
            form.setFieldValue("coverImage", [
              {
                uid: "-1",
                name: "cover.jpg",
                status: "done",
                url: `http://localhost:5000${eventData.coverImage}`,
              },
            ]);
          }
        }
      } catch (err) {
        Swal.fire("Lỗi", "Không thể tải dữ liệu sự kiện", "error");
      }
      setLoading(false);
    };

    fetchEvent();
  }, [slug]);

  const handleUpdateEvent = async (values) => {
    try {
      const formData = new FormData();
      const descriptionWithPlaceholder = buildDescriptionWithPlaceholder();

      formData.append("name", values.name);
      formData.append("location", values.location);
      formData.append("category", values.category);
      formData.append("maxParticipants", values.maxParticipants);
      formData.append("date", values.date.format("YYYY-MM-DD"));
      formData.append("endDate", values.endDate?.format("YYYY-MM-DD"));
      formData.append("description", descriptionWithPlaceholder);

      // Cover image
      const cover = values.coverImage?.[0];
      if (cover) {
        if (cover.originFileObj) {
          formData.append("coverImage", cover.originFileObj);
        } else {
          const file = await convertImgURLToFile(cover.url, "old_cover");
          formData.append("coverImage", file);
        }
      }

      // Gallery images
      for (let i = 0; i < galleryImages.length; i++) {
        const img = galleryImages[i];

        if (img.originFileObj) {
          formData.append("galleryImages", img.originFileObj);
        } else {
          const file = await convertImgURLToFile(img.url, `gallery_old_${i}`);
          formData.append("galleryImages", file);
        }
      }

      const res = await UpdateEvents(event._id, formData);

      if (res.status === 200) {
        Swal.fire("Thành công", "Cập nhật sự kiện thành công", "success");
        navigate("/quanlisukien/su-kien");
      } else {
        Swal.fire("Lỗi", "Cập nhật thất bại", "error");
      }
    } catch (err) {
      Swal.fire("Lỗi", "Đã xảy ra lỗi", "error");
    }
  };

  if (loading)
    return (
      <div className="w-full flex justify-center py-10">
        <Spin size="large" />
      </div>
    );

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl uppercase font-bold text-gray-800 mb-6">
        Chỉnh Sửa Sự Kiện
      </h2>

      <Form form={form} layout="vertical" onFinish={handleUpdateEvent}>
        <Form.Item label="Tên sự kiện" name="name" rules={[{ required: true }]}>
          <Input size="large" />
        </Form.Item>

        <Form.Item label="Mô tả chi tiết" required>
          <CKEditor
            editor={ClassicEditor}
            data={description}
            onReady={onEditorReady}
            onChange={(e, editor) => setDescription(editor.getData())}
          />
        </Form.Item>

        <Form.Item
          label="Ngày bắt đầu"
          name="date"
          rules={[{ required: true }]}
        >
          <DatePicker size="large" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Ngày kết thúc" name="endDate">
          <DatePicker size="large" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Địa điểm"
          name="location"
          rules={[{ required: true }]}
        >
          <Input size="large" />
        </Form.Item>

        {/* --- CATEGORY --- */}
        <Form.Item
          label="Loại sự kiện"
          name="category"
          rules={[{ required: true }]}
        >
          <Select size="large">
            {volunteerCategories.map((option) => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Số lượng tối đa" name="maxParticipants">
          <InputNumber min={1} size="large" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          label="Ảnh bìa"
          name="coverImage"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList || []}
        >
          <Upload beforeUpload={() => false} listType="picture" maxCount={1}>
            <Button icon={<UploadOutlined />}>Chọn ảnh bìa</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label="Album ảnh"
          name="galleryImages"
          valuePropName="fileList"
          getValueFromEvent={(e) => e?.fileList || []}
        >
          <Upload beforeUpload={() => false} listType="picture-card" multiple>
            <UploadOutlined />
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            className="!w-full !bg-[#DDB958] hover:!bg-[#c9a847] !border-none !font-semibold !shadow-md"
          >
            Cập nhật sự kiện
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
