package vn.nepnhaxudong.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs an action after the current transaction commits, or at once when there is no transaction.
 * The change is already saved when the action runs, so a failure of the action is logged and not
 * thrown: the caller must not answer an error (a 500) for a change that was kept.
 */
public final class AfterCommitAction implements TransactionSynchronization {

  private static final Logger LOG = LoggerFactory.getLogger(AfterCommitAction.class);

  private final Runnable action;

  private AfterCommitAction(Runnable action) {
    this.action = action;
  }

  public static void run(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new AfterCommitAction(action));
    } else {
      runQuietly(action);
    }
  }

  @Override
  public void afterCommit() {
    runQuietly(action);
  }

  private static void runQuietly(Runnable action) {
    try {
      action.run();
    } catch (RuntimeException e) {
      LOG.warn("An action after the commit failed; the change itself is saved", e);
    }
  }
}
