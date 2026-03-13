import type { Withdrawal } from "@/lib/withdraw/types";

interface IdempotencyRecord {
  withdrawalId: string;
  signature: string;
}

const withdrawals = new Map<string, Withdrawal>();
const idempotency = new Map<string, IdempotencyRecord>();
const destinationIndex = new Map<string, string>();

export const withdrawalDb = {
  getById(id: string) {
    return withdrawals.get(id);
  },
  findByIdempotencyKey(key: string) {
    return idempotency.get(key);
  },
  findByDestination(destination: string) {
    const id = destinationIndex.get(destination);
    if (!id) {
      return undefined;
    }
    return withdrawals.get(id);
  },
  save(withdrawal: Withdrawal, idempotencyKey: string, signature: string) {
    withdrawals.set(withdrawal.id, withdrawal);
    destinationIndex.set(withdrawal.destination, withdrawal.id);
    idempotency.set(idempotencyKey, {
      withdrawalId: withdrawal.id,
      signature,
    });
  },
};
