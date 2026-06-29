export const PROJECT_DATA_CHANGED_EVENT = "project-data-changed";

export interface ProjectDataChangedDetail {
  projectId: string;
  action: "create" | "update" | "archive";
}

export function emitProjectDataChanged(detail: ProjectDataChangedDetail): void {
  window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT, { detail }));
}

export function subscribeProjectDataChanged(
  listener: (detail: ProjectDataChangedDetail) => void,
): () => void {
  function handle(event: Event) {
    const detail = (event as CustomEvent<ProjectDataChangedDetail>).detail;
    if (detail?.projectId) listener(detail);
  }
  window.addEventListener(PROJECT_DATA_CHANGED_EVENT, handle);
  return () => window.removeEventListener(PROJECT_DATA_CHANGED_EVENT, handle);
}
