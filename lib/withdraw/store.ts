import { create } from "zustand";
import { createWithdrawal, getWithdrawal, WithdrawalApiError } from "@/lib/api/withdrawals";
import type { Withdrawal } from "@/lib/withdraw/types";

type RequestStatus = "idle" | "loading" | "success" | "error";

export interface WithdrawFormValues {
  amount: number;
  destination: string;
  confirm: boolean;
}

interface LastSubmission {
  amount: number;
  destination: string;
  idempotencyKey: string;
}

interface WithdrawState {
  status: RequestStatus;
  errorMessage: string | null;
  retryAvailable: boolean;
  createdWithdrawal: Withdrawal | null;
  loadedWithdrawal: Withdrawal | null;
  lastSubmission: LastSubmission | null;
  submit: (values: WithdrawFormValues, opts?: { retry?: boolean }) => Promise<void>;
  reset: () => void;
}

const initialState = {
  status: "idle" as RequestStatus,
  errorMessage: null,
  retryAvailable: false,
  createdWithdrawal: null,
  loadedWithdrawal: null,
  lastSubmission: null as LastSubmission | null,
};

function toUserMessage(error: unknown) {
  if (error instanceof WithdrawalApiError) {
    if (error.status === 409) {
      return error.message;
    }

    return error.message;
  }

  return "Неизвестная ошибка. Попробуйте еще раз.";
}

function isRetryable(error: unknown) {
  return error instanceof WithdrawalApiError && Boolean(error.retryable);
}

export const useWithdrawStore = create<WithdrawState>((set, get) => ({
  ...initialState,
  async submit(values, opts) {
    if (get().status === "loading") {
      return;
    }

    const retry = opts?.retry === true;
    const previous = get().lastSubmission;

    const nextSubmission = retry
      ? previous
      : {
          amount: values.amount,
          destination: values.destination,
          idempotencyKey: crypto.randomUUID(),
        };

    if (!nextSubmission) {
      set({
        status: "error",
        errorMessage: "Нет заявки для повторной отправки.",
        retryAvailable: false,
      });
      return;
    }

    set({
      status: "loading",
      errorMessage: null,
      retryAvailable: false,
      lastSubmission: nextSubmission,
    });

    try {
      const created = await createWithdrawal({
        amount: nextSubmission.amount,
        destination: nextSubmission.destination,
        idempotency_key: nextSubmission.idempotencyKey,
      });

      const loaded = await getWithdrawal(created.id);

      set({
        status: "success",
        createdWithdrawal: created,
        loadedWithdrawal: loaded,
        errorMessage: null,
        retryAvailable: false,
      });
    } catch (error) {
      const hasRetryPayload = Boolean(get().lastSubmission);
      set({
        status: "error",
        errorMessage: toUserMessage(error),
        retryAvailable: hasRetryPayload || isRetryable(error),
      });
    }
  },
  reset() {
    set({ ...initialState });
  },
}));
