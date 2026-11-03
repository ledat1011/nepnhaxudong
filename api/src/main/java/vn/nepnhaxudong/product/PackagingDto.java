package vn.nepnhaxudong.product;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * One pack size. In a request the position in the list decides the order, so a sent
 * {@code sortOrder} is ignored; in a response it is the stored order.
 */
public record PackagingDto(
    @NotNull(message = "Khối lượng quy cách không được để trống.")
        @Positive(message = "Khối lượng quy cách phải lớn hơn 0.")
        Integer weightGrams,
    @PositiveOrZero(message = "Giá quy cách không được âm.") Long priceVnd,
    Integer sortOrder) {}
