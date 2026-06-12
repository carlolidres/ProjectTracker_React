import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MeetingViewBar } from "@/components/layout/MeetingViewBar";
import { MeetingViewOverlay } from "@/features/dashboard/components/MeetingViewOverlay";

const STORAGE_KEY = "project-tracker-meeting-view";

interface MeetingViewContextValue {
  isMeetingView: boolean;
  enterMeetingView: () => void;
  exitMeetingView: () => void;
  goToMeetingDashboard: () => void;
}

const MeetingViewContext = createContext<MeetingViewContextValue | null>(null);

function readStoredMeetingView() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function MeetingViewProvider({ children }: { children: ReactNode }) {
  const [isMeetingView, setIsMeetingView] = useState(readStoredMeetingView);
  const location = useLocation();
  const navigate = useNavigate();

  const enterMeetingView = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setIsMeetingView(true);
  }, []);

  const exitMeetingView = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setIsMeetingView(false);
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }, [location.pathname, navigate]);

  const goToMeetingDashboard = useCallback(() => {
    if (location.pathname !== "/dashboard") {
      navigate("/dashboard");
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onMeetingSubPage = isMeetingView && location.pathname !== "/dashboard";
    document.documentElement.classList.toggle("meeting-view-nav-active", onMeetingSubPage);
    document.documentElement.classList.toggle("meeting-view-active", isMeetingView);
    return () => {
      document.documentElement.classList.remove("meeting-view-nav-active");
      document.documentElement.classList.remove("meeting-view-active");
    };
  }, [isMeetingView, location.pathname]);

  const value = useMemo(
    () => ({ isMeetingView, enterMeetingView, exitMeetingView, goToMeetingDashboard }),
    [isMeetingView, enterMeetingView, exitMeetingView, goToMeetingDashboard],
  );

  return (
    <MeetingViewContext.Provider value={value}>
      {children}
      {isMeetingView && location.pathname === "/dashboard" ? (
        <MeetingViewOverlay onExit={exitMeetingView} />
      ) : null}
      {isMeetingView && location.pathname !== "/dashboard" ? (
        <MeetingViewBar onExit={exitMeetingView} onBack={goToMeetingDashboard} />
      ) : null}
    </MeetingViewContext.Provider>
  );
}

export function useMeetingView() {
  const context = useContext(MeetingViewContext);
  if (!context) {
    throw new Error("useMeetingView must be used within MeetingViewProvider");
  }
  return context;
}

export function useMeetingViewReadOnly() {
  const { isMeetingView } = useMeetingView();
  return isMeetingView;
}
