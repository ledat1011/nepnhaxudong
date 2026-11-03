# 0005 — Spring Boot 4 cho API

## Bối cảnh
Spec và quyết định 0001 ghi API dùng Spring Boot 3. Khi bắt đầu phần B1 (API và cơ sở dữ liệu), cần chọn phiên bản Spring Boot cụ thể.

## Quyết định
- Dùng Spring Boot 4.0.x (bản vá mới nhất trên Maven Central lúc bắt đầu; hiện là 4.0.9) trên Java 21.
- Chủ dự án đã đồng ý đổi từ Spring Boot 3 sang 4.0.x.

## Lý do
Spring Boot 3.5 là nhánh 3.x cuối cùng, và hỗ trợ mã nguồn mở của nhánh này đã kết thúc vào 2026-06-30. Nhánh 4.0 là nhánh đang được hỗ trợ.

## Hệ quả
- Dùng API của Spring Framework 7 và Jakarta EE 11.
- Dùng Jackson 3.
- Auto-configuration được tách thành các module riêng, nên dùng các starter của Boot (ví dụ `spring-boot-starter-webmvc`, `spring-boot-starter-flyway`) thay cho thư viện gốc đơn lẻ.
- Quyết định 0001 vẫn đúng về hướng (Spring Boot trên Java 21); chỉ số phiên bản đổi từ 3 sang 4.
