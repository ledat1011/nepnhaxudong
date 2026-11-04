package vn.nepnhaxudong.media;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.nepnhaxudong.common.AfterCommitAction;
import vn.nepnhaxudong.common.AfterRollbackAction;

/**
 * The image files in the media folder ({@code app.media.dir}). A file is addressed by its relative
 * path, for example {@code 2031/01/<uuid>.jpg}; that is the value stored in {@code media.path}.
 */
@Component
public class MediaStorage {

  private static final Logger LOG = LoggerFactory.getLogger(MediaStorage.class);

  private final Path root;

  public MediaStorage(@Value("${app.media.dir}") Path dir) {
    this.root = dir.toAbsolutePath().normalize();
  }

  /**
   * Writes the file into a temporary name in the same folder and then renames it in one step, so a
   * reader never sees a half-written file. The folders are created when needed. The temporary file
   * is created with the normal file permissions of the process, not with the owner-only permissions
   * of {@code Files.createTempFile}, because the web server that serves {@code /media/} must be
   * able to read the final file.
   */
  public void write(String relativePath, byte[] bytes) {
    Path target = resolve(relativePath);
    Path temporary = target.resolveSibling("." + target.getFileName() + ".tmp");
    try {
      Files.createDirectories(target.getParent());
      Files.write(temporary, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
      Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE);
    } catch (IOException e) {
      try {
        Files.deleteIfExists(temporary);
      } catch (IOException suppressed) {
        e.addSuppressed(suppressed);
      }
      throw new UncheckedIOException("Could not write an image file", e);
    }
  }

  /**
   * Deletes the file after the current transaction commits (at once when there is none). A missing
   * file is only logged: the row it belonged to is gone anyway. The path is checked now, so that a
   * bad path fails the request and not the commit.
   */
  public void deleteAfterCommit(String relativePath) {
    Path file = resolve(relativePath);
    AfterCommitAction.run(() -> deleteQuietly(file));
  }

  /**
   * Deletes the file when the current transaction is rolled back. Only a rollback counts: when the
   * outcome of the commit is unknown, a file that may be needed is kept.
   */
  public void deleteOnRollback(String relativePath) {
    Path file = resolve(relativePath);
    AfterRollbackAction.run(() -> deleteQuietly(file));
  }

  /** The absolute path of a stored file; it must stay inside the media folder. */
  Path resolve(String relativePath) {
    Path path = root.resolve(relativePath).normalize();
    if (!path.startsWith(root) || path.equals(root)) {
      throw new IllegalArgumentException("The image path leaves the media folder");
    }
    return path;
  }

  private static void deleteQuietly(Path path) {
    try {
      if (!Files.deleteIfExists(path)) {
        LOG.warn("The image file {} does not exist, nothing to delete", path.getFileName());
      }
    } catch (IOException e) {
      LOG.warn("The image file {} could not be deleted: {}", path.getFileName(), e.toString());
    }
  }
}
