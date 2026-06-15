import { CameraOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Divider, Form, Input, Modal, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { changeOwnPassword } from "@/lib/auth";
import { newPasswordRules } from "@/lib/passwordValidation";
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
  const firstName = Form.useWatch("firstName", form);
  const middleInitial = Form.useWatch("middleInitial", form);
  const lastName = Form.useWatch("lastName", form);

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
      title="Profile"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={480}
      className="profile-settings-modal"
      styles={{ body: { maxHeight: "72vh", overflowY: "auto", paddingTop: 16 } }}
    >
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

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
          <button type="button" className="profile-settings-avatar-button" aria-label="Upload profile photo">
            <Avatar
              size={88}
              src={avatarPreview ?? undefined}
              icon={<UserOutlined />}
            >
              {getProfileInitials(profile)}
            </Avatar>
            <span className="profile-settings-avatar-overlay">
              <CameraOutlined />
            </span>
          </button>
        </Upload>
        <div className="profile-settings-avatar-text">
          <p className="profile-settings-avatar-name">{previewName}</p>
          <p className="profile-settings-avatar-hint">Click photo to upload a new image</p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSave(values)}
      >
        <Form.Item
          label="First Name"
          name="firstName"
          rules={[{ required: true, message: "First name is required" }]}
        >
          <Input autoComplete="given-name" />
        </Form.Item>
        <Form.Item label="M.I." name="middleInitial">
          <Input autoComplete="additional-name" maxLength={8} placeholder="Optional" />
        </Form.Item>
        <Form.Item
          label="Last Name"
          name="lastName"
          rules={[{ required: true, message: "Last name is required" }]}
        >
          <Input autoComplete="family-name" />
        </Form.Item>
        <Form.Item label="Department" name="department">
          <Input autoComplete="organization" placeholder="Optional" />
        </Form.Item>

        <div className="profile-settings-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save Profile
          </Button>
        </div>
      </Form>

      <Divider className="profile-settings-divider" />

      <section className="profile-settings-password-section">
        <h4 className="profile-settings-section-title">Change Password</h4>
        {passwordError ? (
          <Alert type="error" showIcon message={passwordError} style={{ marginBottom: 16 }} />
        ) : null}
        <Form
          form={passwordForm}
          layout="vertical"
          requiredMark={false}
          autoComplete="off"
          onFinish={(values) => void handleChangePassword(values)}
        >
          <Form.Item
            label="Current Password"
            name="currentPassword"
            rules={[{ required: true, message: "Enter your current password" }]}
          >
            <Input.Password autoComplete="current-password" visibilityToggle />
          </Form.Item>
          <Form.Item label="New Password" name="newPassword" rules={newPasswordRules()}>
            <Input.Password autoComplete="new-password" visibilityToggle />
          </Form.Item>
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
            <Input.Password autoComplete="new-password" visibilityToggle />
          </Form.Item>
          <div className="profile-settings-actions">
            <Button
              type="primary"
              htmlType="submit"
              loading={changingPassword}
            >
              Change Password
            </Button>
          </div>
        </Form>
      </section>
    </Modal>
  );
}
