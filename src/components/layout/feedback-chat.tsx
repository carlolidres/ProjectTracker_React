import { CopyOutlined, MessageOutlined, ReloadOutlined, SendOutlined } from "@ant-design/icons";
import {
  App as AntApp,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/app/auth-provider";
import { formatAppDateTime } from "@/lib/date";
import {
  formatFeedbackForCopy,
  listAppFeedback,
  submitAppFeedback,
  type AppFeedback,
  type FeedbackType,
} from "@/services/feedbackService";

interface FeedbackFormValues {
  feedbackType: FeedbackType;
  message: string;
}

function feedbackTypeLabel(type: FeedbackType) {
  return type === "bug" ? "Bug report" : "Improvement idea";
}

function FeedbackSubmitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<FeedbackFormValues>();

  function handleClose() {
    onClose();
    form.resetFields();
  }

  async function handleSubmit(values: FeedbackFormValues) {
    if (!user?.id || !user.email) {
      message.error("You must be signed in to send feedback.");
      return;
    }

    setSubmitting(true);
    try {
      await submitAppFeedback({
        feedbackType: values.feedbackType,
        message: values.message,
        userId: user.id,
        userEmail: user.email,
        pagePath: location.pathname,
        isAdmin: false,
      });
      message.success("Thank you — your feedback has been sent to the administrator.");
      handleClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Share Feedback"
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={480}
      className="feedback-chat-modal"
    >
      <div className="feedback-chat-window">
        <div className="feedback-chat-bubble feedback-chat-bubble-system">
          <Typography.Text>
            Help us improve Project Tracker. Share an idea for a better experience or report a bug you encountered.
            Your message will be sent to the administrator.
          </Typography.Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          className="feedback-chat-form"
          initialValues={{ feedbackType: "improvement" as FeedbackType }}
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            name="feedbackType"
            label="What would you like to share?"
            rules={[{ required: true, message: "Select a feedback type." }]}
          >
            <Radio.Group>
              <Radio.Button value="improvement">Improvement idea</Radio.Button>
              <Radio.Button value="bug">Bug report</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="message"
            label="Your message"
            rules={[
              { required: true, message: "Please describe your feedback." },
              { min: 10, message: "Please provide at least 10 characters." },
            ]}
          >
            <Input.TextArea
              rows={5}
              maxLength={2000}
              showCount
              placeholder="Describe the improvement you would like or the steps to reproduce the bug..."
            />
          </Form.Item>

          <div className="feedback-chat-actions">
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting}>
              Send to Admin
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

function FeedbackInboxModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AppFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listAppFeedback());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  async function handleCopy(item: AppFeedback) {
    try {
      await navigator.clipboard.writeText(formatFeedbackForCopy(item));
      message.success("Feedback copied to clipboard.");
    } catch {
      message.error("Could not copy feedback. Please copy manually.");
    }
  }

  return (
    <Modal
      title="User Feedback"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      destroyOnClose
      width={560}
      className="feedback-chat-modal"
    >
      <div className="feedback-chat-window">
        <div className="feedback-chat-bubble feedback-chat-bubble-system">
          <Typography.Text>
            Messages submitted by non-admin users. Administrators cannot send feedback to themselves.
          </Typography.Text>
        </div>

        <div className="feedback-inbox-toolbar">
          <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        </div>

        {error ? (
          <Typography.Text type="danger">{error}</Typography.Text>
        ) : loading && !items.length ? (
          <div className="feedback-inbox-loading">
            <Spin aria-label="Loading feedback" />
          </div>
        ) : items.length ? (
          <div className="feedback-inbox-list">
            {items.map((item) => (
              <article key={item.id} className="feedback-inbox-item">
                <div className="feedback-inbox-item-header">
                  <Space size={6} wrap>
                    <Typography.Text strong>{item.user_email}</Typography.Text>
                    <Tag color={item.feedback_type === "bug" ? "red" : "blue"}>
                      {feedbackTypeLabel(item.feedback_type)}
                    </Tag>
                  </Space>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => void handleCopy(item)}
                  >
                    Copy
                  </Button>
                </div>
                <Typography.Paragraph className="feedback-inbox-message">
                  {item.message}
                </Typography.Paragraph>
                <Typography.Text type="secondary" className="feedback-inbox-meta">
                  {formatAppDateTime(item.created_at)}
                  {item.page_path ? ` · ${item.page_path}` : ""}
                </Typography.Text>
              </article>
            ))}
          </div>
        ) : (
          <Empty description="No user feedback yet" />
        )}
      </div>
    </Modal>
  );
}

export function FeedbackChat() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={isAdmin ? "View user feedback" : "Send feedback to admin"}>
        <Button
          type="text"
          icon={<MessageOutlined />}
          aria-label={isAdmin ? "Open user feedback inbox" : "Open feedback chat"}
          onClick={() => setOpen(true)}
        />
      </Tooltip>

      {isAdmin ? (
        <FeedbackInboxModal open={open} onClose={() => setOpen(false)} />
      ) : (
        <FeedbackSubmitModal open={open} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
