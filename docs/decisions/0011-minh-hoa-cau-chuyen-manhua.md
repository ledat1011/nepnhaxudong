# 0011 — Tranh minh họa Câu chuyện theo phong cách manhua bán thực tế

Ngày: 2026-11-05. Người quyết định: chủ dự án.

## Bối cảnh
Chủ dự án muốn tranh vẽ theo phong cách manhua kiếm hiệp bán thực tế (ảnh mẫu: một nhân vật võ tướng vẽ nét mực, nền thủy mặc xám trắng). Chủ dự án đã có API key Nano Banana (Gemini).

## Quyết định
- **Chỉ dùng cho tranh của phần Câu chuyện**: ảnh bìa và ảnh trong bài.
- **Giữ nguyên** mascot cô bé nón lá, logo, font (Pacifico, Quicksand) và bảng màu trong `brand/README.md`.
- Chỉ lấy **phong cách vẽ** của ảnh mẫu. Không chép nhân vật, trang phục, vũ khí hay bố cục của game trong ảnh mẫu. Nhân vật trong tranh là người nông dân Hải Dương, áo nâu, nón lá.
- Vẽ bằng Nano Banana qua MCP `nanobanana` đã khai báo trong `.mcp.json` (đọc `GEMINI_API_KEY`).
- Ảnh bìa câu chuyện có tỉ lệ 16:9 (`web/src/components/story/StoryCard.tsx`). Xuất WebP, rộng 1600 px, rồi tải lên bằng trang quản trị (mục Câu chuyện → ảnh bìa). Ảnh không vào repo.

## Lý do
- Mascot là SVG tách lớp, có hiệu ứng xoay đầu và bó lúa theo cuộn. Ảnh AI bán thực tế là ảnh bitmap, không giữ được hiệu ứng đó.
- Tranh câu chuyện là ảnh tải lên, đã có chỗ sẵn trên web, nên đổi phong cách không cần sửa mã.

## Mẫu prompt
Thay `<CẢNH>` bằng cảnh của bài viết. Prompt viết bằng tiếng Anh cho mô hình vẽ.

```
Semi-realistic Chinese manhua illustration, wuxia comic style.
Confident black ink linework with dry-brush strokes, detailed faces and cloth folds,
soft grey ink-wash background that fades to off-white paper (#FBF7EE), loose splatter at the edges.
Limited warm palette: earth brown (#4A2C1A, #8B5A2B), golden rice (#D9A13B), straw (#F2E2B6),
a small touch of young-rice green (#6E8B3D). No other strong colours.
Scene: <CẢNH>, in the countryside of Hải Dương, northern Vietnam.
People wear Vietnamese brown peasant clothes (áo nâu) and conical hats (nón lá). No armour, no weapons.
Wide 16:9 composition, main subject on one side, calm empty space on the other side.
No text, no letters, no watermark, no logo.
```

Ví dụ `<CẢNH>`: "a farmer cutting golden yellow-flower sticky rice with a sickle at harvest time"; "hands winnowing sticky rice grains in a round bamboo tray"; "a family sharing a tray of steamed sticky rice in a wooden house".

## Hệ quả
- Tranh câu chuyện khác phong cách với mascot hoạt hình phẳng ở hero. Chủ dự án xem 3 tranh thử trên trang danh sách câu chuyện trước khi vẽ cho mọi bài.
