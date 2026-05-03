# Yêu cầu UI tổng quan — FRONTEND-ADVISOR

Tài liệu này là **chuẩn bắt buộc** khi phát triển giao diện: luôn tuân thủ để đồng nhất trải nghiệm và tái sử dụng code.

---

## 1. Nguyên tắc theo loại thao tác API

| Loại API / hành vi                        | Giao diện bắt buộc    | Ghi chú                                                                                                                                |
| ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Thêm mới** (POST create)                | **Modal** chứa form   | Mở modal từ nút "Thêm mới" / tương đương; gọi service trong modal hoặc sau submit form.                                                |
| **Sửa** (PUT/PATCH hoặc POST update)      | **Modal** chứa form   | Điền dữ liệu hiện tại vào form; đóng modal sau khi thành công (hoặc giữ để sửa tiếp nếu UX thống nhất toàn app).                       |
| **Xóa** (DELETE hoặc API xóa tương đương) | **Popup xác nhận**    | Luôn có bước confirm (không xóa thẳng một cú click). Có thể dùng `Modal` nhỏ với tiêu đề + nội dung cảnh báo + nút Hủy / Xác nhận xóa. |
| **Danh sách / đọc** (GET, POST list)      | **Bảng (table)**      | Hiển thị dữ liệu dạng bảng có phân trang/tìm kiếm khi API hỗ trợ.                                                                      |
| **Xem chi tiết một bản ghi**              | **Modal** (read-only) | Từ bảng: click hàng, click icon "xem", hoặc tên bản ghi — mở modal chỉ hiển thị thông tin (không bắt buộc form submit).                |

**Không** lẫn pattern: ví dụ không đưa form thêm/sửa sang trang full-page riêng nếu chưa có quyết định kiến trúc khác; mặc định dự án dùng **modal** cho create/update và **confirm** cho delete.

---

## 2. Bắt buộc dùng component trong `src/components`

Khi build UI, **ưu tiên import từ các thư mục sau** thay vì markup thuần hoặc thư viện lẻ tẻ không thống nhất.

### 2.1. Modal & luồng mở/đóng

- **Modal:** `src/components/ui/modal` (`Modal`)
- **Hook:** `src/hooks/useModal` (`useModal`) — pattern tham khảo: `src/components/UserProfile/UserMetaCard.tsx`

Ví dụ import:

```tsx
import { Modal } from '@/components/ui/modal'
import { useModal } from '@/hooks/useModal'
```

(Điều chỉnh alias `@/` theo `tsconfig` thực tế nếu khác.)

### 2.2. Popup xác nhận xóa

- Dùng **`Modal`** với nội dung ngắn: tiêu đề "Xác nhận xóa", mô tả hậu quả, hai nút **Hủy** và **Xóa** (nút xóa dùng variant cảnh báo nếu có).
- Kết hợp **`Button`** từ `src/components/ui/button/Button.tsx` (hoặc `src/components/ui/button.tsx` nếu đúng với chỗ đang export dùng chung).

### 2.3. Bảng dữ liệu

- **Table:** `src/components/ui/table/index.tsx`
- Có thể tham khảo layout: `src/components/tables/BasicTables/BasicTableOne.tsx`

### 2.4. Form trong modal (thêm / sửa)

- Input, label, select, v.v.: `src/components/form/**` (ví dụ `InputField`, `Label`, `Select`, `TextArea`, `Form`, các phần tử trong `form/form-elements/`, `date-picker`, `MultiSelect`, …)
- Nút hành động: `Button`, `Badge`, `Alert` thông báo lỗi/thành công trong `src/components/ui/**` khi phù hợp.

### 2.5. Các nhóm khác (dùng khi cần)

- **common:** `PageMeta`, `PageBreadCrumb`, `ComponentCard`, …
- **header:** `Header`, dropdown người dùng / thông báo nếu đã tích hợp layout.
- **auth:** form đăng nhập/đăng ký có sẵn — chỉ dùng khi đúng ngữ cảnh auth.

---

## 3. Luồng dữ liệu gợi ý

1. Gọi API qua **`src/services`** (đã tách theo domain).
2. Trang hoặc container: giữ state bảng (data, loading, lỗi); modal nhận props hoặc context cần thiết (record đang sửa, `mode: 'create' | 'edit'`).
3. Sau create/update/delete thành công: đóng modal / popup, **refetch** hoặc cập nhật state bảng cho khớp server.

---

## 4. Checklist trước khi merge

- [ ] Thêm/sửa: dùng **modal** + form từ `src/components/form` và `ui`.
- [ ] Xóa: có **popup confirm** (modal xác nhận hoặc component confirm thống nhất sau này).
- [ ] Danh sách GET/list: **table** từ `components`.
- [ ] Xem chi tiết: **modal** read-only.
- [ ] Không copy-paste UI lớn ngoài hệ `components` khi đã có sẵn tương đương.

---

## 5. Cập nhật tài liệu

Khi thêm component UI mới dùng chung được trong `src/components`, có thể bổ sung mục 2 tương ứng để cả team cùng tham chiếu.

## 6. Lưu ý: với Form hãy dùng state + object để quản lý state, lưu ý tách components props không quá 5 props
