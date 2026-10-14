import { useEffect } from "react";
import { Modal } from "antd";
import { BoardPage } from "@/features/project-management/board/BoardPage";

/** Wide overlay for the independent board. It stays in this tab, so the sign-in is kept. */
export function ProjectBoardPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("pmb-close-popup", close);
    return () => window.removeEventListener("pmb-close-popup", close);
  }, [onClose]);

  return (
    <Modal
      open={open}
      title={(
        <div className="pmb-popup-title">
          <span>Project board</span>
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
