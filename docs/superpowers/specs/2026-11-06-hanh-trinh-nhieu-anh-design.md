# Hành trình: nhiều ảnh cho mỗi mốc, xem ảnh lớn

Ngày: 2026-11-06. Chủ dự án duyệt thiết kế trong chat và nói làm luôn.

## Mục tiêu
- Một mốc của khối "Hành trình" có từ 0 đến 3 ảnh (trước đây: 0 hoặc 1).
- Mốc 2021 có hai ảnh: giấy chứng nhận đủ điều kiện an toàn thực phẩm (cấp năm 2021) và bao gạo 2 kg đầu tiên.
- Bấm vào ảnh nào trên web thì mở cửa sổ xem ảnh lớn của mốc đó.

## Dữ liệu và API
- Bảng mới `timeline_event_media (id, timeline_event_id → timeline_event on delete cascade, media_id → media on delete restrict, sort_order, created_at, updated_at, unique (timeline_event_id, media_id))`, chỉ mục trên `media_id`. Giống `product_media`.
- Migration `V5`: chép `timeline_event.media_id` (khác null) sang bảng mới với `sort_order = 0`, rồi xóa cột `timeline_event.media_id` và chỉ mục của nó.
- `TimelineEvent` có danh sách `TimelineEventMedia` theo thứ tự, thay thế hàm thay danh sách giống `Product.replaceMedia`.
- Yêu cầu của trang quản trị (`TimelineEventRequest`): `mediaIds: List<Long>` (thiếu thì là danh sách rỗng), tối đa 3, không trùng, ảnh phải tồn tại. Lỗi trả bằng tiếng Việt như các lỗi khác:
  - "Một mốc có tối đa 3 ảnh."
  - "Ảnh bị chọn hai lần: {id}."
  - "Ảnh không tồn tại: {id}."
- `TimelineEventAdminDto`: `mediaIds: List<Long>` thay cho `mediaId`. DTO này cũng là bản chụp trong nhật ký (audit). Bản chụp cũ có `mediaId` (một số hoặc null) vẫn phải đọc được và khôi phục được: đọc thành `[mediaId]` hoặc `[]`.
- Khôi phục mốc đã xóa (`TimelineAuditedHandler`): ghi lại các dòng `timeline_event_media` theo thứ tự; kiểm tra mọi ảnh còn tồn tại như hiện nay.
- API công khai (`TimelinePublicDto`): `images: ImageRefDto[]` theo thứ tự, thay cho `image`. Ảnh không tải được thì bỏ khỏi danh sách.
- `MediaRepository.isUsed` đọc `timeline_event_media` thay cho `timeline_event.media_id`.
- `DevSeed` và mọi chỗ đọc `getMediaId()` của mốc đổi theo.
- Không giữ hai cách lưu song song: `mediaId` và `image` của mốc bị xóa hẳn khỏi code, DTO và test.

## Trang quản trị
- Form mốc (`TimelineEventForm`): phần "Ảnh" chọn được tối đa 3 ảnh, xem trước từng ảnh, đổi thứ tự (lên, xuống), xóa từng ảnh. Dùng lại cách màn Sản phẩm làm (`MediaPicker`, `useMediaByIds`), không viết cách mới.
- Khi đã đủ 3 ảnh thì nút thêm ảnh bị tắt và nói lý do.
- Danh sách mốc (`TimelineList`) hiện ảnh đầu tiên nếu có (như hiện nay hiện ảnh duy nhất).
- `web/src/lib/admin/types.ts`: `mediaIds: number[]` thay cho `mediaId`.

## Web công khai
- `TimelineEvent` (`web/src/lib/content/types.ts`): `images: ImageRef[]` thay cho `image`.
- Khối Hành trình:
  - 0 ảnh: không có khung.
  - 1 ảnh: khung 4:3 như hiện nay.
  - 2 hoặc 3 ảnh (sửa theo chủ dự án, 2026-11-06): các khung chồng nhẹ ở góc, theo hình chủ dự án vẽ. Mỗi khung theo chiều của ảnh: ảnh dọc khung 3:4, ảnh ngang khung 4:3, ảnh gần vuông khung vuông. Mọi khung cao bằng nhau. Khung 1 và 3 sát mép trái, khung 2 sát mép phải, mỗi cặp liền nhau chồng ít nhất 7,33% chiều rộng. Khung nằm trên có viền màu nền tạo rãnh khoét lõm. Cụm nhiều ảnh không có viền vàng, thay bằng bóng đổ nhẹ màu nâu đất. Cách tính: `web/src/components/home/journey-stagger.ts`.
  - Mốc 1 ảnh giữ viền vàng và bo góc như cũ. Ở 375 px vẫn so le, khung co theo chiều rộng cột, không tràn ngang.
- Mỗi ảnh là một nút. Bấm (hoặc Enter, Space) mở cửa sổ xem ảnh lớn, bắt đầu ở ảnh đó:
  - ảnh hiện đủ, không cắt (`object-contain`);
  - có nút ảnh trước và ảnh sau khi mốc có từ 2 ảnh;
  - Esc, nút X, bấm ra ngoài đều đóng;
  - giữ focus trong cửa sổ, đóng xong trả focus về nút ảnh;
  - chữ của nút và cửa sổ lấy từ từ điển vi/en.
- Cửa sổ xem ảnh lớn hiện nằm trong `Gallery.tsx` (khối Sản phẩm). Tách nó ra thành một component dùng chung (`web/src/components/ui/Lightbox.tsx`). `Gallery` và khối Hành trình cùng dùng component này. Không để hai bản cửa sổ.
- Hiệu ứng cây lúa của khối Hành trình (`web/src/lib/motion/journey.ts`) vẫn chạy với khung ảnh mới.

## Ảnh
- Giấy chứng nhận: cắt sát viền giấy, làm thẳng, tăng tương phản cho chữ rõ, lưu WebP. Không dùng AI vẽ lại.
- Dữ liệu mẫu (`web/src/fixtures/home.{vi,en}.json`): mốc 2021 có `[giấy chứng nhận, bao gạo]`; các mốc khác giữ ảnh hiện có, viết dưới dạng danh sách.
- `docs/noi-dung/hanh-trinh.md` ghi thêm ảnh giấy chứng nhận ở mốc 2021.

## Test
- API: migration chép dữ liệu cũ đúng; tạo và sửa mốc với 0, 1, 3 ảnh; 4 ảnh, ảnh trùng, ảnh không tồn tại bị từ chối; thứ tự giữ đúng; `isUsed` thấy ảnh của mốc; khôi phục mốc từ bản chụp mới và bản chụp cũ (`mediaId`); API công khai trả `images` theo thứ tự.
- Trang quản trị: chọn, đổi thứ tự, xóa ảnh; nút thêm tắt ở 3 ảnh; gửi `mediaIds` đúng thứ tự.
- Web: khung theo số ảnh (0, 1, 2, 3); mở, chuyển, đóng cửa sổ bằng chuột và bàn phím; focus trả về đúng chỗ; `Gallery` vẫn qua hết test cũ.
- Full-stack và e2e: luồng mốc có 2 ảnh từ trang quản trị tới web; mở cửa sổ ảnh ở khối Hành trình; không tràn ngang ở 375 px.

## Ngoài phạm vi
- Chú thích riêng cho từng ảnh (chỉ dùng alt của ảnh trong thư viện).
- Nhiều hơn 3 ảnh một mốc.
