import { NextResponse } from "next/server";
import { withdrawalDb } from "@/lib/withdraw/mock-db";

interface Context {
  params: {
    id: string;
  };
}

export async function GET(_: Request, { params }: Context) {
  const withdrawal = withdrawalDb.getById(params.id);

  if (!withdrawal) {
    return NextResponse.json({ message: "Заявка на вывод не найдена." }, { status: 404 });
  }

  return NextResponse.json(withdrawal, { status: 200 });
}
