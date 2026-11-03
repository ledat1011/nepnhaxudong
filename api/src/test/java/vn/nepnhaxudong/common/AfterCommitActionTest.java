package vn.nepnhaxudong.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(OutputCaptureExtension.class)
class AfterCommitActionTest {

  @AfterEach
  void clean() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
  }

  @Test
  void theActionRunsAfterTheCommit() {
    var runs = new AtomicInteger();
    TransactionSynchronizationManager.initSynchronization();

    AfterCommitAction.run(runs::incrementAndGet);
    assertThat(runs).hasValue(0);
    commit();

    assertThat(runs).hasValue(1);
  }

  @Test
  void aFailingActionAfterTheCommitIsLoggedAndNotThrown(CapturedOutput output) {
    var later = new AtomicInteger();
    TransactionSynchronizationManager.initSynchronization();
    AfterCommitAction.run(
        () -> {
          throw new IllegalStateException("the file is locked");
        });
    AfterCommitAction.run(later::incrementAndGet);

    assertThatCode(this::commit).doesNotThrowAnyException();

    assertThat(output.getAll()).contains("WARN").contains("the file is locked");
    // The next action still runs.
    assertThat(later).hasValue(1);
  }

  @Test
  void aFailingActionWithoutATransactionIsLoggedAndNotThrown(CapturedOutput output) {
    assertThatCode(
            () ->
                AfterCommitAction.run(
                    () -> {
                      throw new IllegalStateException("no transaction failure");
                    }))
        .doesNotThrowAnyException();

    assertThat(output.getAll()).contains("WARN").contains("no transaction failure");
  }

  /** What the transaction manager does after a successful commit. */
  private void commit() {
    for (TransactionSynchronization synchronization :
        TransactionSynchronizationManager.getSynchronizations()) {
      synchronization.afterCommit();
    }
  }
}
