# Тестовое задание: вывод средств (Next.js + TypeScript)

Реализация задания из `frontend-test-assignment.md`.

## Стек

- Next.js 14 (App Router)
- TypeScript
- Ant Design
- Zustand
- Vitest + Testing Library
- Bun (пакетный менеджер и раннер)

## Запуск

```bash
bun install
bun dev
```

Откройте `http://localhost:3000`.

## Тесты

```bash
bun run test
```

## Что реализовано

- Форма вывода с полями:
  - `amount` (`> 0`)
  - `destination`
  - `confirm` (чекбокс)
- Кнопка отправки активна только при валидной форме.
- Во время запроса отправка заблокирована.
- Интеграция с API:
  - `POST /v1/withdrawals`
  - `GET /v1/withdrawals/{id}`
- Генерация и отправка `idempotency_key`.
- Обработка `409` с понятным сообщением.
- Retry при сетевой ошибке без потери введённых данных.
- После успеха показывается созданная заявка и её статус.
- Состояния в UI/сторе:
  - `idle`
  - `loading`
  - `success`
  - `error`
- Защита от двойного submit:
  - блокировка кнопки на уровне UI
  - дополнительный guard в Zustand-сторе

## Mock API

Локальные route handlers:

- `app/v1/withdrawals/route.ts`
- `app/v1/withdrawals/[id]/route.ts`

Логика идемпотентности:
- Одинаковый ключ + одинаковый payload возвращают существующую заявку.
- Одинаковый ключ + другой payload возвращают `409`.
- Повторная отправка новой заявки на тот же `destination` возвращает `409` (чтобы сценарий конфликта был воспроизводим в UI).

## Безопасность

- Небезопасный HTML-рендер (`dangerouslySetInnerHTML`) не используется.
- Access token не хранится в `localStorage`.
- Прод-подход для токенов: короткоживущий access token в памяти, refresh token в `HttpOnly`, `Secure`, `SameSite` cookie.

## Покрытие тестами (минимум из задания)

- happy-path submit: `tests/withdraw-page.test.tsx`
- ошибка API: `tests/withdraw-page.test.tsx`
- защита от двойного submit: `tests/withdraw-page.test.tsx`

## Деплой

Публичный деплой из sandbox-среды не выполнялся.

Как опубликовать:
1. Запушить репозиторий в GitHub.
2. Импортировать проект в Vercel.
3. Добавить публичную ссылку в этот README.
