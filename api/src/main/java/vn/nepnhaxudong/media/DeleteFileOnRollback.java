package vn.nepnhaxudong.media;

import org.springframework.transaction.support.TransactionSynchronization;

/** Runs an action only when the transaction ended with a rollback. */
final class DeleteFileOnRollback implements TransactionSynchronization {

  private final Runnable deletion;

  DeleteFileOnRollback(Runnable deletion) {
    this.deletion = deletion;
  }

  @Override
  public void afterCompletion(int status) {
    if (status == STATUS_ROLLED_BACK) {
      deletion.run();
    }
  }
}
