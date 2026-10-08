import { AppShell } from "@/components/layout/app-shell";
import { BoardPage } from "@/features/project-management/board/BoardPage";

/** Popup shows the board alone. The same address in this tab keeps the app menu. */
export function ProjectBoardWindow() {
  const board = <BoardPage />;
  if (window.name === "project-tracker-board") {
    return <div className="pmb-window">{board}</div>;
  }
  return <AppShell>{board}</AppShell>;
}
