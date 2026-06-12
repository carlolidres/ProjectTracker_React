import { Alert, Button, Card, Form, Input, Select, Space, Typography } from "antd";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { signIn, signUp } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@/types";

export function LoginPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  if (!loading && user && profile?.status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  async function onFinish(values: { email: string; password: string }) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { error: signInError } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    navigate(from, { replace: true });
  }

  async function onSignUp(values: {
    email: string;
    password: string;
    fullName: string;
    requestedRole: UserRole;
  }) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { data, error: signUpError } = await signUp(values);
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSuccess(
      data.session
        ? "Account created. An administrator must approve your access before you can use Project Tracker."
        : "Account created. Check your email, then wait for administrator approval.",
    );
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>Project Tracker</Typography.Title>
        <Typography.Paragraph type="secondary">
          {isSigningUp
            ? "Request an account. An administrator will review your role before access is activated."
            : "Sign in with your approved Supabase account to access Project Tracker."}
        </Typography.Paragraph>
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        {success ? <Alert type="success" showIcon message={success} style={{ marginBottom: 16 }} /> : null}
        <Form layout="vertical" onFinish={isSigningUp ? onSignUp : onFinish} requiredMark={false}>
          {isSigningUp ? (
            <>
              <Form.Item label="Full name" name="fullName" rules={[{ required: true }]}>
                <Input autoComplete="name" />
              </Form.Item>
              <Form.Item label="Requested role" name="requestedRole" rules={[{ required: true }]}>
                <Select
                  options={(Object.entries(ROLE_LABELS) as [UserRole, string][])
                    .filter(([role]) => role !== "admin")
                    .map(([value, label]) => ({ value, label }))}
                />
              </Form.Item>
            </>
          ) : null}
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true }, { min: 8, message: "Use at least 8 characters." }]}
          >
            <Input.Password autoComplete={isSigningUp ? "new-password" : "current-password"} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {isSigningUp ? "Request account" : "Sign in"}
          </Button>
        </Form>
        <Space style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
          <Button
            type="link"
            onClick={() => {
              setIsSigningUp((current) => !current);
              setError(null);
              setSuccess(null);
            }}
          >
            {isSigningUp ? "Back to sign in" : "Create an account"}
          </Button>
        </Space>
      </Card>
    </div>
  );
}
