package vn.nepnhaxudong.media;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.nepnhaxudong.common.ApiException;

/** Image management in the admin area. Paths are relative to the context path {@code /api}. */
@RestController
@RequestMapping("/admin/media")
public class MediaAdminController {

  private final MediaService service;

  public MediaAdminController(MediaService service) {
    this.service = service;
  }

  /** Newest first, 50 images per page, pages count from 0. */
  @GetMapping
  public List<MediaAdminDto> list(@RequestParam(defaultValue = "0") int page) {
    return service.list(page);
  }

  /** Form fields: {@code file}, {@code altVi} and {@code altEn} (both texts are required). */
  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public MediaAdminDto upload(
      @RequestParam(value = "file", required = false) MultipartFile file,
      @RequestParam(value = "altVi", required = false) String altVi,
      @RequestParam(value = "altEn", required = false) String altEn) {
    if (file == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa chọn ảnh để tải lên.");
    }
    try {
      return service.upload(file.getInputStream(), altVi, altEn);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** Changes the alt texts only; the file stays as it is. */
  @PutMapping("/{id}")
  public MediaAdminDto update(@PathVariable long id, @RequestBody MediaAltRequest body) {
    return service.updateAltTexts(id, body);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable long id) {
    service.delete(id);
  }
}
