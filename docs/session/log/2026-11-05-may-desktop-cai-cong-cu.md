# 2026-11-05 — máy `C:\Users\Admin\Desktop` — cài công cụ còn thiếu

## Phản hồi
- "Cài hết đống này giúp tôi" → agent tự cài plugin, uv, JDK 21, Docker và sửa MCP cho máy này (chỉ lần cài này; luật chung "không tự cài plugin" vẫn giữ).
- "Không cấm Docker Desktop nhé, máy này có cái nào thì dùng" → lệnh `docker` có thể đến từ Docker Desktop hoặc Rancher Desktop; máy nào có cái nào thì dùng cái đó. Đã sửa `CLAUDE.md` và `docs/setup.md`.

## Quyết định
- Máy này dùng Docker Desktop.

## Còn mở
- Chủ dự án đặt `setx GEMINI_API_KEY "<key>"` (agent không hỏi và không ghi key).
- Đăng nhập Recraft: trong terminal `claude` chạy `/mcp`, chọn `recraft`, rồi Authenticate.
- Thoát hẳn ứng dụng Claude rồi mở lại, để session mới thấy PATH, `JAVA_HOME`, `UV_PYTHON_INSTALL_DIR` và plugin mới.

## Đã làm
- Cài 7 plugin bằng `claude plugin install <tên>@<marketplace> --scope project` (antislop 3.2.25 và taste-skill 2.1.5 đúng bản ghim). `claude plugin list` báo cả 7 đã bật.
- Cài `uv` 0.13.7 và JDK 21 (Temurin 21.0.13) bằng `winget`; `JAVA_HOME` (người dùng và cả máy) trỏ tới JDK 21; `mvnw -v` báo Java 21.
- Chạy `wsl --update` (máy thiếu nhân WSL 2), rồi cài Docker Desktop 29.9.2 bằng `winget`; `docker run --rm hello-world` chạy được.
- MCP: `nanobanana` lỗi vì thiếu `uvx`, rồi vì ứng dụng Claude desktop ảo hóa `AppData` làm hỏng liên kết Python của `uv`. Sửa bằng biến người dùng `UV_PYTHON_INSTALL_DIR=%USERPROFILE%\.local\share\uv\python`; thử tay với khóa giả thì server khởi động được. `shadcn` và `next-devtools` khởi động trong 5–8 giây khi đã có gói trong cache; lần quá thời gian trước là do `npx` tải gói lần đầu.
- Node 24 và Python 3.8.3: không có gì lỗi vì chúng, nên giữ nguyên.
- Sửa `docs/setup.md` (lệnh `winget`, WSL, `UV_PYTHON_INSTALL_DIR`, cài plugin bằng dòng lệnh, Docker Desktop hoặc Rancher Desktop) và luật Docker trong `CLAUDE.md`.
