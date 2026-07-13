import { Modal, Radio, Space, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isValidUniqueBatchForNavigation } from "@/lib/cnfProjectIntegration";
import { isMissingValue, valueOrNA } from "@/lib/utils";

interface UniqueBatchProjectLinkProps {
  uniqueBatch: string;
  projectIds: string[];
  cnfTrackerId?: string;
  className?: string;
}

export function UniqueBatchProjectLink({
  uniqueBatch,
  projectIds,
  cnfTrackerId,
  className,
}: UniqueBatchProjectLinkProps) {
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const label = valueOrNA(uniqueBatch);
  const validIds = projectIds.filter((id) => !isMissingValue(id));

  if (!isValidUniqueBatchForNavigation(uniqueBatch)) {
    return <span className={className}>{label}</span>;
  }

  function goToProjects() {
    if (validIds.length === 1) {
      navigate(`/projects?projectId=${encodeURIComponent(validIds[0])}`);
      return;
    }
    if (validIds.length === 0) {
      const params = new URLSearchParams();
      if (cnfTrackerId) params.set("cnfTrackerId", cnfTrackerId);
      navigate(`/projects?${params.toString()}`);
      return;
    }
    setSelected(validIds[0]);
    setPickerOpen(true);
  }

  return (
    <>
      <Typography.Link
        className={className ?? "cnf-unique-batch-link"}
        onClick={(event) => {
          event.preventDefault();
          goToProjects();
        }}
        title="Open related project"
        aria-label="Open related project"
      >
        {label}
      </Typography.Link>
      <Modal
        open={pickerOpen}
        title="Select related project"
        onCancel={() => setPickerOpen(false)}
        onOk={() => {
          if (selected) navigate(`/projects?projectId=${encodeURIComponent(selected)}`);
          setPickerOpen(false);
        }}
        okText="Open project"
        okButtonProps={{ disabled: !selected }}
        destroyOnHidden
      >
        <Radio.Group value={selected} onChange={(event) => setSelected(event.target.value)}>
          <Space direction="vertical">
            {validIds.map((id) => (
              <Radio key={id} value={id}>
                {id}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Modal>
    </>
  );
}
