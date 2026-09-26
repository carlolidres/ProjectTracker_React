import { Button, Input, Select } from "antd";
import { useEffect, useState } from "react";
import { LucideIcon } from "@/components/common/lucide-icon";
import { BOARD_STATUS_ORDER, emptyPortfolioFilters, portfolioFiltersAreActive } from "@/lib/projectManagementPortfolio";
import { WORKFLOW_PHASE_LABELS, WORKFLOW_PHASES } from "@/lib/projectManagementWorkflow";
import type {
  PortfolioBoardStatus,
  PortfolioFilters,
  PortfolioSourceType,
  PortfolioStatusGroup,
  PmTaskPriority,
  WorkflowPhase,
} from "@/types";

interface PortfolioFiltersBarProps {
  filters: PortfolioFilters;
  owners: string[];
  showSearch?: boolean;
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

const BOARD_STATUS_OPTIONS: Array<{ label: string; value: PortfolioFilters["boardStatus"] }> = [
  { label: "All board statuses", value: "all" },
  ...BOARD_STATUS_ORDER.map((status) => ({ label: status, value: status })),
];

const PRIORITY_OPTIONS: Array<{ label: string; value: PortfolioFilters["priority"] }> = [
  { label: "All priorities", value: "all" },
  { label: "High", value: "High" },
  { label: "Medium", value: "Medium" },
  { label: "Low", value: "Low" },
];

const PHASE_OPTIONS: Array<{ label: string; value: PortfolioFilters["phase"] }> = [
  { label: "All phases", value: "all" },
  ...WORKFLOW_PHASES.map((phase) => ({ label: WORKFLOW_PHASE_LABELS[phase], value: phase })),
];

export function PortfolioFiltersBar({ filters, owners, showSearch = true, onChange }: PortfolioFiltersBarProps) {
  const [search, setSearch] = useState(filters.search);
  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== filters.search) onChange({ ...filters, search });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters, onChange, search]);

  return (
    <div className="pm-filters project-management-toolbar" role="search">
      {showSearch ? (
        <Input.Search
          className="pm-filters-search"
          allowClear
          placeholder="Search projects..."
          aria-label="Search portfolio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => onChange({ ...filters, search: value })}
        />
      ) : null}
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
        aria-label="Filter by board status"
        value={filters.boardStatus}
        options={BOARD_STATUS_OPTIONS}
        onChange={(boardStatus: "all" | PortfolioBoardStatus) => onChange({ ...filters, boardStatus })}
        popupMatchSelectWidth={false}
      />
      <Select
        aria-label="Filter by phase"
        value={filters.phase ?? "all"}
        options={PHASE_OPTIONS}
        onChange={(phase: "all" | WorkflowPhase) => onChange({ ...filters, phase })}
        popupMatchSelectWidth={false}
      />
      <Select
        aria-label="Filter by owner"
        value={filters.owner}
        options={[
          { label: "All owners", value: "all" },
          ...owners.map((owner) => ({ label: owner, value: owner })),
        ]}
        onChange={(owner: string) => onChange({ ...filters, owner })}
        popupMatchSelectWidth={false}
      />
      <Select
        aria-label="Filter by priority"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(priority: "all" | PmTaskPriority) => onChange({ ...filters, priority })}
      />
      {portfolioFiltersAreActive(filters) ? (
        <Button icon={<LucideIcon name="eraser" size={14} />} onClick={() => onChange(emptyPortfolioFilters())}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
