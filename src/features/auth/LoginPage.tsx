import { Alert, Button, Card, Form, Input, Modal, Select, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { signIn, signUp } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { passwordRules } from "@/lib/passwordValidation";
import { requestPasswordReset } from "@/services/passwordResetService";
import type { UserRole } from "@/types";

export function LoginPage() {
  const { user, profile, initializing } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [forgotForm] = Form.useForm<{ email: string }>();

  useEffect(() => {
    form.resetFields();
  }, [form, isSigningUp, user]);

  useEffect(() => {
    if (submitting && !initializing) {
      setSubmitting(false);
    }
  }, [submitting, initializing]);

  if (!initializing && user && profile?.status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  async function onFinish(values: { email: string; password: string }) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const { error: signInError } = await signIn(values.email, values.password);
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message);
      return;
    }
  }

  async function onForgotPassword(values: { email: string }) {
    setForgotSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await requestPasswordReset(values.email);
      setSuccess("Password reset request sent to an administrator.");
      setForgotOpen(false);
      forgotForm.resetFields();
    } catch (forgotError) {
      setError(forgotError instanceof Error ? forgotError.message : "Failed to submit password reset request.");
    } finally {
      setForgotSubmitting(false);
    }
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
        {isSigningUp ? (
          <Typography.Paragraph type="secondary">
            Request an account. An administrator will review your role before access is activated.
          </Typography.Paragraph>
        ) : null}
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}
        {success ? <Alert type="success" showIcon message={success} style={{ marginBottom: 16 }} /> : null}
        <Form
          form={form}
          layout="vertical"
          onFinish={isSigningUp ? onSignUp : onFinish}
          requiredMark={false}
          autoComplete="off"
        >
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
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={passwordRules()}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            {isSigningUp ? "Request account" : "Sign in"}
          </Button>
        </Form>
        <Space style={{ width: "100%", justifyContent: "center", marginTop: 16 }} wrap>
          {!isSigningUp ? (
            <Button
              type="link"
              onClick={() => {
                setForgotOpen(true);
                setError(null);
                setSuccess(null);
              }}
            >
              Forgot password?
            </Button>
          ) : null}
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

      <Modal
        title="Request password reset"
        open={forgotOpen}
        onCancel={() => setForgotOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          Enter your account email. An administrator will review the request and reset your password.
        </Typography.Paragraph>
        <Form form={forgotForm} layout="vertical" onFinish={(values) => void onForgotPassword(values)}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: "email", message: "Enter your account email" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setForgotOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={forgotSubmitting}>
              Send request
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
