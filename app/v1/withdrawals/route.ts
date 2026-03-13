import { NextResponse } from "next/server";
import { z } from "zod";
import { withdrawalDb } from "@/lib/withdraw/mock-db";
import type { Withdrawal } from "@/lib/withdraw/types";

const requestSchema = z.object({
  amount: z.number().positive(),
  destination: z.string().trim().min(1),
  idempotency_key: z.string().trim().min(1),
});

const STATUS_FLOW = ["pending", "processing", "completed"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Некорректные данные заявки на вывод." },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const signature = `${payload.amount}:${payload.destination}`;
  const existing = withdrawalDb.findByIdempotencyKey(payload.idempotency_key);

  if (existing) {
    if (existing.signature !== signature) {
      return NextResponse.json(
        {
          message:
            "Idempotency key уже использован с другими данными. Используйте новый ключ.",
        },
        { status: 409 },
      );
    }

    const existingWithdrawal = withdrawalDb.getById(existing.withdrawalId);
    if (!existingWithdrawal) {
      return NextResponse.json(
        { message: "Данные заявки на вывод недоступны." },
        { status: 500 },
      );
    }

    return NextResponse.json(existingWithdrawal, { status: 200 });
  }

  const existingByDestination = withdrawalDb.findByDestination(payload.destination);
  if (existingByDestination) {
    return NextResponse.json(
      {
        message:
          "Конфликт: для этого адреса уже есть заявка на вывод. Используйте другой адрес или дождитесь завершения текущей заявки.",
      },
      { status: 409 },
    );
  }

  const createdAt = new Date().toISOString();
  const status = STATUS_FLOW[Math.floor(Math.random() * STATUS_FLOW.length)];
  const withdrawal: Withdrawal = {
    id: crypto.randomUUID(),
    amount: payload.amount,
    destination: payload.destination,
    status,
    createdAt,
  };

  withdrawalDb.save(withdrawal, payload.idempotency_key, signature);

  return NextResponse.json(withdrawal, { status: 201 });
}
