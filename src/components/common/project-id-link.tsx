import { Link } from "react-router-dom";
import { isMissingValue } from "@/lib/utils";

interface ProjectIdLinkProps {
  projectId: string;
  label?: string;
}

export function ProjectIdLink({ projectId, label }: ProjectIdLinkProps) {
  if (isMissingValue(projectId)) {
    return <span className="project-id-na">{label ?? "N/A"}</span>;
  }

  return (
    <Link
      to={`/projects?projectId=${encodeURIComponent(projectId)}`}
      className="project-id-link"
    >
      {label ?? projectId}
    </Link>
  );
}
