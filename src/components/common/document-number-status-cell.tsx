import { WorkflowStatusBadge } from "@/components/common/workflow-status-badge";
import { valueOrNA } from "@/lib/utils";

interface DocumentNumberStatusCellProps {
  number: string;
  status: string;
}

/** Document number with compact status icon on the right (single non-wrapping row). */
export function DocumentNumberStatusCell({ number, status }: DocumentNumberStatusCellProps) {
  return (
    <span className="cnf-doc-number-status">
      <span className="cnf-doc-number-status__value">{valueOrNA(number)}</span>
      <WorkflowStatusBadge status={status} />
    </span>
  );
}
