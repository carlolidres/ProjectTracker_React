import {
  BankOutlined,
  CameraOutlined,
  LockOutlined,
  MailOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { changeOwnPassword } from "@/lib/auth";
import { newPasswordRules } from "@/lib/passwordValidation";
import { clearMustChangePassword } from "@/services/passwordResetService";
import {
  buildFullName,
  getProfileDisplayName,
  getProfileInitials,
  getProfileNameParts,
} from "@/lib/profileName";
import { updateOwnProfile, uploadProfileAvatar } from "@/services/profileService";

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileFormValues {
  firstName: string;
  middleInitial: string;
  lastName: string;
  department: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [form] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const firstName = Form.useWatch("firstName", open ? form : undefined);
  const middleInitial = Form.useWatch("middleInitial", open ? form : undefined);
  const lastName = Form.useWatch("lastName", open ? form : undefined);

  useEffect(() => {
    if (!open) {
      passwordForm.resetFields();
      setPasswordError(null);
      return;
    }

    const parts = getProfileNameParts(profile);
    form.setFieldsValue({
      firstName: parts.firstName,
      middleInitial: parts.middleInitial,
      lastName: parts.lastName,
      department: profile?.department ?? "",
    });
    setAvatarPreview(profile?.avatar_url ?? null);
    setPendingAvatarFile(null);
    setError(null);
    setPasswordError(null);
    passwordForm.resetFields();
  }, [open, profile, form, passwordForm]);

  async function handleSave(values: ProfileFormValues) {
    if (!user?.id) return;

    setSaving(true);
    setError(null);
    try {
      let avatarUrl: string | null | undefined;
      if (pendingAvatarFile) {
        avatarUrl = await uploadProfileAvatar(user.id, pendingAvatarFile);
      }

      await updateOwnProfile({
        firstName: values.firstName,
        middleInitial: values.middleInitial,
        lastName: values.lastName,
        department: values.department,
        avatarUrl,
      });
      await refreshProfile();
      message.success("Profile updated");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(values: PasswordFormValues) {
    if (!user?.email) return;

    setChangingPassword(true);
    setPasswordError(null);
    try {
      await changeOwnPassword({
        email: user.email,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      await clearMustChangePassword();
      await refreshProfile();
      passwordForm.resetFields();
      message.success("Password changed successfully");
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(messageText);
      message.error(messageText);
    } finally {
      setChangingPassword(false);
    }
  }

  const previewName =
    buildFullName(firstName ?? "", middleInitial ?? "", lastName ?? "")
    || getProfileDisplayName(profile)
    || profile?.email
    || "User";

  return (
    <Modal
      title={
        <Space size={10}>
          <UserOutlined aria-hidden />
          <span>Profile</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={720}
      centered
      className="profile-settings-modal"
      styles={{
        body: {
          maxHeight: "min(72vh, 680px)",
          overflowY: "auto",
          padding: "20px 24px 24px",
        },
      }}
    >
      {error ? (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          role="alert"
        />
      ) : null}

      <Card size="small" className="profile-settings-hero" bordered={false}>
        <div className="profile-settings-avatar-row">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={(file) => {
              setPendingAvatarFile(file);
              setAvatarPreview(URL.createObjectURL(file));
              return false;
            }}
          >
            <button
              type="button"
              className="profile-settings-avatar-button"
              aria-label="Upload profile photo"
            >
              <Avatar
                size={96}
                src={avatarPreview ?? undefined}
                icon={<UserOutlined />}
                className="profile-settings-avatar"
              >
                {getProfileInitials(profile)}
              </Avatar>
              <span className="profile-settings-avatar-overlay" aria-hidden>
                <CameraOutlined />
              </span>
            </button>
          </Upload>
          <div className="profile-settings-avatar-text">
            <Typography.Title level={4} className="profile-settings-avatar-name">
              {previewName}
            </Typography.Title>
            {profile?.email ? (
              <Typography.Text type="secondary" className="profile-settings-avatar-email">
                <MailOutlined aria-hidden /> {profile.email}
              </Typography.Text>
            ) : null}
            <Typography.Paragraph type="secondary" className="profile-settings-avatar-hint">
              Click photo to upload a new image
            </Typography.Paragraph>
          </div>
        </div>
      </Card>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        onFinish={(values) => void handleSave(values)}
        className="profile-settings-form"
      >
        <Card
          size="small"
          className="profile-settings-section-card"
          title={
            <Space size={8}>
              <UserOutlined aria-hidden />
              <span>Personal details</span>
            </Space>
          }
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={10}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input
                  prefix={<UserOutlined aria-hidden />}
                  autoComplete="given-name"
                  placeholder="First name"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item label="M.I." name="middleInitial">
                <Input
                  autoComplete="additional-name"
                  maxLength={8}
                  placeholder="MI"
                  aria-label="Middle initial"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input autoComplete="family-name" placeholder="Last name" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Department" name="department">
                <Input
                  prefix={<BankOutlined aria-hidden />}
                  autoComplete="organization"
                  placeholder="Optional"
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="profile-settings-actions">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
              Save Profile
            </Button>
          </div>
        </Card>
      </Form>

      <section className="profile-settings-password-section" aria-labelledby="profile-password-heading">
        <Card
          size="small"
          className="profile-settings-section-card"
          title={
            <Space size={8} id="profile-password-heading">
              <LockOutlined aria-hidden />
              <span>Change Password</span>
            </Space>
          }
        >
          {passwordError ? (
            <Alert
              type="error"
              showIcon
              message={passwordError}
              style={{ marginBottom: 16 }}
              role="alert"
            />
          ) : null}
          <Form
            form={passwordForm}
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
            onFinish={(values) => void handleChangePassword(values)}
          >
            <Row gutter={[16, 0]}>
              <Col xs={24}>
                <Form.Item
                  label="Current Password"
                  name="currentPassword"
                  rules={[{ required: true, message: "Enter your current password" }]}
                >
                  <Input.Password
                    prefix={<LockOutlined aria-hidden />}
                    autoComplete="current-password"
                    visibilityToggle
                    placeholder="Current password"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="New Password" name="newPassword" rules={newPasswordRules()}>
                  <Input.Password
                    autoComplete="new-password"
                    visibilityToggle
                    placeholder="New password"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Confirm New Password"
                  name="confirmPassword"
                  dependencies={["newPassword"]}
                  rules={[
                    { required: true, message: "Confirm your new password" },
                    ({ getFieldValue }) => ({
                      validator: async (_, value: string) => {
                        if (!value || getFieldValue("newPassword") === value) {
                          return;
                        }
                        throw new Error("Passwords do not match");
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    autoComplete="new-password"
                    visibilityToggle
                    placeholder="Confirm new password"
                  />
                </Form.Item>
              </Col>
            </Row>
            <div className="profile-settings-actions">
              <Button
                type="primary"
                htmlType="submit"
                loading={changingPassword}
                icon={<LockOutlined />}
              >
                Change Password
              </Button>
            </div>
          </Form>
        </Card>
      </section>
    </Modal>
  );
}
