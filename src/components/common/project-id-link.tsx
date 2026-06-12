import { Link } from "react-router-dom";
import { isMissingValue } from "@/lib/utils";

interface ProjectIdLinkProps {
  projectId: string;
}

export function ProjectIdLink({ projectId }: ProjectIdLinkProps) {
  if (isMissingValue(projectId)) {
    return <span className="project-id-na">N/A</span>;
  }

  return (
    <Link
      to={`/projects?projectId=${encodeURIComponent(projectId)}`}
      className="project-id-link"
    >
      {projectId}
    </Link>
  );
}
