package vn.nepnhaxudong.auth;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Runs an action after the current transaction commits, or at once when there is no transaction. */
public final class AfterCommitAction implements TransactionSynchronization {

  private final Runnable action;

  private AfterCommitAction(Runnable action) {
    this.action = action;
  }

  public static void run(Runnable action) {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new AfterCommitAction(action));
    } else {
      action.run();
    }
  }

  @Override
  public void afterCommit() {
    action.run();
  }
}
