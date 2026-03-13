"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Checkbox, Descriptions, Form, Input, InputNumber, Space, Tag, Typography } from "antd";
import styles from "@/components/withdraw/withdraw.module.css";
import { useWithdrawStore } from "@/lib/withdraw/store";

const statusToColor: Record<string, string> = {
  pending: "gold",
  processing: "blue",
  completed: "green",
  failed: "red",
};
const statusToLabel: Record<string, string> = {
  pending: "Ожидает",
  processing: "В обработке",
  completed: "Выполнено",
  failed: "Ошибка",
};

export function WithdrawPage() {
  const [form] = Form.useForm();
  const values = Form.useWatch([], form);
  const watchedAmount = Form.useWatch("amount", form);
  const [canSubmit, setCanSubmit] = useState(false);

  const {
    status,
    errorMessage,
    retryAvailable,
    createdWithdrawal,
    loadedWithdrawal,
    submit,
  } = useWithdrawStore((state) => state);

  const activeWithdrawal = loadedWithdrawal ?? createdWithdrawal;
  const isLoading = status === "loading";
  const showNegativeAmountWarning =
    typeof watchedAmount === "number" && watchedAmount < 0;
  const isRetryMode = status === "error" && retryAvailable;

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setCanSubmit(true))
      .catch(() => setCanSubmit(false));
  }, [form, values]);

  const submitDisabled = useMemo(() => isLoading || !canSubmit, [canSubmit, isLoading]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <Typography.Title level={2}>Вывод USDT</Typography.Title>
            <Typography.Text className={styles.subtitle}>
              Создайте заявку на вывод.
            </Typography.Text>
          </div>

          {status === "error" && errorMessage && (
            <Alert
              className={styles.alert}
              type="error"
              message={errorMessage}
              showIcon
            />
          )}

          {showNegativeAmountWarning && (
            <Alert
              className={styles.alert}
              type="warning"
              message="Сумма не может быть отрицательной."
              showIcon
            />
          )}

          <Form
            layout="vertical"
            form={form}
            initialValues={{
              amount: undefined,
              destination: "",
              confirm: false,
            }}
            onFinish={(formValues) => submit(formValues)}
          >
            <Form.Item
              name="amount"
              label="Сумма"
              rules={[
                { required: true, message: "Укажите сумму" },
                {
                  validator: (_, value) => {
                    if (typeof value === "number" && value > 0) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Сумма должна быть больше 0"));
                  },
                },
              ]}
            >
              <InputNumber
                placeholder="Введите сумму"
                precision={2}
                style={{ width: "100%" }}
                disabled={isLoading}
              />
            </Form.Item>

            <Form.Item
              name="destination"
              label="Адрес назначения"
              rules={[{ required: true, message: "Укажите адрес назначения" }]}
            >
              <Input placeholder="0x... или адрес кошелька" disabled={isLoading} />
            </Form.Item>

            <Form.Item
              name="confirm"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Подтвердите вывод средств")),
                },
              ]}
            >
              <Checkbox disabled={isLoading}>Подтверждаю вывод средств</Checkbox>
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" disabled={submitDisabled} loading={isLoading}>
                {isRetryMode ? (
                  "Повторить"
                ) : (
                  "Отправить заявку"
                )}
              </Button>
            </Space>
          </Form>

          {activeWithdrawal && status === "success" && (
            <Card className={styles.result} size="small" title="Созданная заявка" style={{ marginTop: 16 }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="ID">{activeWithdrawal.id}</Descriptions.Item>
                <Descriptions.Item label="Статус">
                  <Tag color={statusToColor[activeWithdrawal.status] ?? "default"}>
                    {statusToLabel[activeWithdrawal.status] ?? activeWithdrawal.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Сумма">{activeWithdrawal.amount} USDT</Descriptions.Item>
                <Descriptions.Item label="Адрес">{activeWithdrawal.destination}</Descriptions.Item>
                <Descriptions.Item label="Создано">{activeWithdrawal.createdAt}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
        </Card>
      </div>
    </main>
  );
}
