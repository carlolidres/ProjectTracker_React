import { Input, Select } from "antd";
import { WORKFLOW_PHASE_LABELS, WORKFLOW_PHASES } from "@/lib/projectManagementWorkflow";
import type { PortfolioFilters, PortfolioSourceType, PortfolioStatusGroup, WorkflowPhase } from "@/types";

interface PortfolioFiltersBarProps {
  filters: PortfolioFilters;
  onChange: (next: PortfolioFilters) => void;
}

const SOURCE_OPTIONS: Array<{ label: string; value: PortfolioFilters["sourceType"] }> = [
  { label: "All sources", value: "all" },
  { label: "Projects Database", value: "process" },
  { label: "Support Activities", value: "support" },
];

const STATUS_OPTIONS: Array<{ label: string; value: PortfolioFilters["statusGroup"] }> = [
  { label: "All statuses", value: "all" },
  { label: "Ongoing", value: "Ongoing" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const PHASE_OPTIONS: Array<{ label: string; value: PortfolioFilters["phase"] }> = [
  { label: "All phases", value: "all" },
  ...WORKFLOW_PHASES.map((phase) => ({ label: WORKFLOW_PHASE_LABELS[phase], value: phase })),
];

export function PortfolioFiltersBar({ filters, onChange }: PortfolioFiltersBarProps) {
  return (
    <div className="pm-filters">
      <Input.Search
        className="pm-filters-search"
        allowClear
        placeholder="Search product, unique batch, or owner"
        aria-label="Search portfolio"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
        onSearch={(value) => onChange({ ...filters, search: value })}
      />
      <Select
        aria-label="Filter by source"
        value={filters.sourceType}
        options={SOURCE_OPTIONS}
        onChange={(sourceType: "all" | PortfolioSourceType) => onChange({ ...filters, sourceType })}
      />
      <Select
        aria-label="Filter by status"
        value={filters.statusGroup}
        options={STATUS_OPTIONS}
        onChange={(statusGroup: "all" | PortfolioStatusGroup) => onChange({ ...filters, statusGroup })}
      />
      <Select
        aria-label="Filter by phase"
        value={filters.phase ?? "all"}
        options={PHASE_OPTIONS}
        onChange={(phase: "all" | WorkflowPhase) => onChange({ ...filters, phase })}
        popupMatchSelectWidth={false}
      />
    </div>
  );
}
