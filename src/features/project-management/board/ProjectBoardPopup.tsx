import { Modal } from "antd";
import { LucideIcon } from "@/components/common/lucide-icon";
import { BoardPage } from "@/features/project-management/board/BoardPage";
import { BOARD_WINDOW_NAME, stageBoardSessionHandoff } from "@/lib/boardSessionHandoff";

function openBoardWindow(): boolean {
  stageBoardSessionHandoff();
  const url = new URL(window.location.href);
  url.searchParams.set("board", String(Date.now()));
  url.hash = "/project-boards";
  return Boolean(window.open(url.toString(), BOARD_WINDOW_NAME));
}

/** Wide overlay for the independent board. It stays in this tab, so the sign-in is kept. */
export function ProjectBoardPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      title={(
        <div className="pmb-popup-title">
          <span>Project board</span>
          <span className="pmb-popup-actions">
            <button type="button" className="pmb-popup-window" aria-label="Archive" title="Archive" onClick={() => window.dispatchEvent(new Event("pmb-open-archive"))}>
              <LucideIcon name="archive" size={14} />
            </button>
            <button
              type="button"
              className="pmb-popup-window"
              aria-label="Open in new window"
              title="Open in new window"
              onClick={() => {
                if (openBoardWindow()) onClose();
              }}
            >
              <LucideIcon name="external-link" size={14} />
            </button>
          </span>
        </div>
      )}
      onCancel={onClose}
      footer={null}
      width="calc(100vw - 32px)"
      style={{ top: 16, paddingBottom: 0 }}
      zIndex={1200}
      destroyOnHidden
      maskClosable
      className="pmb-popup"
    >
      <BoardPage />
    </Modal>
  );
}
