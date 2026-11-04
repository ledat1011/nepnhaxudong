package vn.nepnhaxudong.common;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs an action only when the current transaction ends with a rollback. Only a rollback counts:
 * when the outcome of the commit is unknown, the action does not run. It must be called inside a
 * transaction.
 */
public final class AfterRollbackAction implements TransactionSynchronization {

  private final Runnable action;

  private AfterRollbackAction(Runnable action) {
    this.action = action;
  }

  public static void run(Runnable action) {
    TransactionSynchronizationManager.registerSynchronization(new AfterRollbackAction(action));
  }

  @Override
  public void afterCompletion(int status) {
    if (status == STATUS_ROLLED_BACK) {
      action.run();
    }
  }
}
