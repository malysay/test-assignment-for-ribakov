import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WithdrawPage } from "@/components/withdraw/withdraw-page";
import { useWithdrawStore } from "@/lib/withdraw/store";

const mockResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("Страница вывода", () => {
  beforeEach(() => {
    useWithdrawStore.getState().reset();
  });

  it("успешно отправляет валидную форму и показывает созданную заявку", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse(201, {
          id: "wd-1",
          amount: 10,
          destination: "0xabc",
          status: "pending",
          createdAt: "2026-03-13T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        mockResponse(200, {
          id: "wd-1",
          amount: 10,
          destination: "0xabc",
          status: "processing",
          createdAt: "2026-03-13T00:00:00.000Z",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<WithdrawPage />);

    await userEvent.type(screen.getByPlaceholderText("Введите сумму"), "10");
    await userEvent.type(screen.getByPlaceholderText("0x... или адрес кошелька"), "0xabc");
    await userEvent.click(screen.getByText("Подтверждаю вывод средств"));
    const submit = screen.getByRole("button", { name: "Отправить заявку" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await screen.findByText("Созданная заявка");
    expect(screen.getByText("wd-1")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/v1/withdrawals",
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/v1/withdrawals/wd-1");
    });
  });

  it("показывает сообщение о конфликте API", async () => {
    const conflictMessage =
      "Конфликт: для этого адреса уже есть заявка на вывод. Используйте другой адрес или дождитесь завершения текущей заявки.";
    const fetchMock = vi.fn().mockResolvedValueOnce(
      mockResponse(409, {
        message: conflictMessage,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<WithdrawPage />);

    await userEvent.type(screen.getByPlaceholderText("Введите сумму"), "12");
    await userEvent.type(screen.getByPlaceholderText("0x... или адрес кошелька"), "0xdef");
    await userEvent.click(screen.getByText("Подтверждаю вывод средств"));
    const submit = screen.getByRole("button", { name: "Отправить заявку" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    expect(
      await screen.findByText(conflictMessage),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Повторить" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Отправить заявку" }),
    ).not.toBeInTheDocument();
  });

  it("показывает предупреждение для отрицательной суммы и блокирует отправку", async () => {
    render(<WithdrawPage />);

    await userEvent.type(screen.getByPlaceholderText("Введите сумму"), "-5");
    await userEvent.type(screen.getByPlaceholderText("0x... или адрес кошелька"), "0xaaa");
    await userEvent.click(screen.getByText("Подтверждаю вывод средств"));

    expect(
      screen.getByText("Сумма не может быть отрицательной."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Отправить заявку" }),
      ).toBeDisabled();
    });
  });

  it("защищает от двойной отправки во время загрузки", async () => {
    let resolvePost: ((value: Response) => void) | null = null;
    const postPromise = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => postPromise)
      .mockResolvedValueOnce(
        mockResponse(200, {
          id: "wd-2",
          amount: 5,
          destination: "0x777",
          status: "pending",
          createdAt: "2026-03-13T00:00:00.000Z",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<WithdrawPage />);

    await userEvent.type(screen.getByPlaceholderText("Введите сумму"), "5");
    await userEvent.type(screen.getByPlaceholderText("0x... или адрес кошелька"), "0x777");
    await userEvent.click(screen.getByText("Подтверждаю вывод средств"));

    const submitButton = screen.getByRole("button", { name: "Отправить заявку" });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await userEvent.click(submitButton);
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    resolvePost?.(
      mockResponse(201, {
        id: "wd-2",
        amount: 5,
        destination: "0x777",
        status: "pending",
        createdAt: "2026-03-13T00:00:00.000Z",
      }),
    );

    await screen.findByText("Созданная заявка");
  });
});
