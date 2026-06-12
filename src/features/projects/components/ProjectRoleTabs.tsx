import {
  ExperimentOutlined,
  KeyOutlined,
  ProjectOutlined,
  SearchOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ProjectTab } from "@/lib/projectFormFields";
import { PROJECT_TABS, projectTabKey } from "@/lib/projectFormFields";

const TAB_ICONS: Record<ProjectTab, React.ReactNode> = {
  "AM/BM/PL": <UserAddOutlined />,
  PP: <ProjectOutlined />,
  TSD: <KeyOutlined />,
  VAL: <ExperimentOutlined />,
  QC: <SearchOutlined />,
};

interface ProjectRoleTabsProps {
  activeTab: ProjectTab;
  onChange: (tab: ProjectTab) => void;
}

export function ProjectRoleTabs({ activeTab, onChange }: ProjectRoleTabsProps) {
  return (
    <div className="project-tabs" role="tablist" aria-label="Project role tabs">
      {PROJECT_TABS.map((tab) => {
        const key = projectTabKey(tab);
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`project-tab project-tab-${key}${isActive ? " project-tab-active" : ""}`}
            onClick={() => onChange(tab)}
          >
            <span className="project-tab-icon">{TAB_ICONS[tab]}</span>
            {tab}
          </button>
        );
      })}
    </div>
  );
}
