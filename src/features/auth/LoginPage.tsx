import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { signIn } from "@/lib/auth";

export function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onFinish(values: { email: string; password: string }) {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    navigate(from, { replace: true });
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>Project Tracker</Typography.Title>
        <Typography.Paragraph type="secondary">
          Sign in with your Supabase account to access CNF and support activity records.
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
