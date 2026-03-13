import type {
  ApiErrorBody,
  CreateWithdrawalRequest,
  Withdrawal,
} from "@/lib/withdraw/types";

export class WithdrawalApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable?: boolean,
  ) {
    super(message);
    this.name = "WithdrawalApiError";
  }
}

async function parseErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return payload?.message ?? "Ошибка запроса. Попробуйте еще раз.";
}

export async function createWithdrawal(payload: CreateWithdrawalRequest) {
  let response: Response;

  try {
    response = await fetch("/v1/withdrawals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new WithdrawalApiError(
      "Сетевая ошибка при создании заявки на вывод. Повторите попытку.",
      undefined,
      true,
    );
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new WithdrawalApiError(message, response.status, response.status >= 500);
  }

  return (await response.json()) as Withdrawal;
}

export async function getWithdrawal(id: string) {
  let response: Response;

  try {
    response = await fetch(`/v1/withdrawals/${id}`);
  } catch {
    throw new WithdrawalApiError(
      "Сетевая ошибка при загрузке созданной заявки.",
      undefined,
      true,
    );
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new WithdrawalApiError(message, response.status, response.status >= 500);
  }

  return (await response.json()) as Withdrawal;
}
