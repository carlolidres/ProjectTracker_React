import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useNavigationHistoryOptional } from "@/app/navigation-history-provider";
import { cn } from "@/lib/utils";

interface NavHistoryButtonsProps {
  className?: string;
  /** Floating upper-right chrome when sidebar/topbar are collapsed. */
  floating?: boolean;
}

export function NavHistoryButtons({ className, floating = false }: NavHistoryButtonsProps) {
  const history = useNavigationHistoryOptional();
  if (!history) return null;

  const { canGoBack, canGoForward, goBack, goForward } = history;

  return (
    <div
      className={cn("nav-history-buttons", floating && "nav-history-buttons-floating", className)}
      role="group"
      aria-label="Page history"
    >
      <Tooltip title="Back">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          aria-label="Back"
          disabled={!canGoBack}
          onClick={goBack}
        />
      </Tooltip>
      <Tooltip title="Forward">
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          aria-label="Forward"
          disabled={!canGoForward}
          onClick={goForward}
        />
      </Tooltip>
    </div>
  );
}
