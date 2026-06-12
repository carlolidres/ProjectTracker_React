import { CameraOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Form, Input, Modal, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
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
}

export function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const { profile, user, refreshProfile } = useAuth();
  const [form] = Form.useForm<ProfileFormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const firstName = Form.useWatch("firstName", form);
  const middleInitial = Form.useWatch("middleInitial", form);
  const lastName = Form.useWatch("lastName", form);

  useEffect(() => {
    if (!open) return;

    const parts = getProfileNameParts(profile);
    form.setFieldsValue({
      firstName: parts.firstName,
      middleInitial: parts.middleInitial,
      lastName: parts.lastName,
    });
    setAvatarPreview(profile?.avatar_url ?? null);
    setPendingAvatarFile(null);
    setError(null);
  }, [open, profile, form]);

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
      width={420}
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

        <div className="profile-settings-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save Profile
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
