import { QuestionCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

interface FieldHelpIconProps {
  title: string;
  className?: string;
}

export function FieldHelpIcon({ title, className }: FieldHelpIconProps) {
  return (
    <Tooltip title={title}>
      <QuestionCircleOutlined
        className={className ? `field-help-icon ${className}` : "field-help-icon"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
      />
    </Tooltip>
  );
}
