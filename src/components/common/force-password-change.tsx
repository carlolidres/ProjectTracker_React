import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { changeOwnPassword } from "@/lib/auth";
import { newPasswordRules } from "@/lib/passwordValidation";
import { clearMustChangePassword } from "@/services/passwordResetService";

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ForcePasswordChangeScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [form] = Form.useForm<PasswordFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: PasswordFormValues) {
    if (!user?.email) return;
    if (values.newPassword !== values.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await changeOwnPassword({
        email: user.email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await clearMustChangePassword();
      await refreshProfile();
      form.resetFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <Typography.Title level={4}>Password change required</Typography.Title>
        <Typography.Paragraph type="secondary">
          {profile?.email
            ? `Sign in as ${profile.email} succeeded, but you must set a new password before using Project Tracker.`
            : "You must set a new password before using Project Tracker."}
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        <Form form={form} layout="vertical" onFinish={(values) => void handleSubmit(values)}>
          <Form.Item
            label="Temporary password"
            name="currentPassword"
            rules={[{ required: true, message: "Enter your temporary password." }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item label="New password" name="newPassword" rules={newPasswordRules()}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Confirm new password"
            name="confirmPassword"
            rules={[{ required: true, message: "Confirm your new password." }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Save new password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
