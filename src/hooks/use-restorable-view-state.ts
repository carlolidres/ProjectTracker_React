import { useEffect, useRef } from "react";
import { useNavigationHistory } from "@/app/navigation-history-provider";

/**
 * Persist a JSON-serializable UI snapshot for the bound history entry.
 * Writes always target the location key from when this page owned the state,
 * so unmount during navigation does not save under the next route’s key.
 */
export function useRestorableViewState<T>(slotKey: string, state: T, setState: (next: T) => void) {
  const { locationKey, getViewStateAt, setViewStateAt } = useNavigationHistory();
  const boundKeyRef = useRef(locationKey);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const previousKey = boundKeyRef.current;
    if (previousKey && previousKey !== locationKey) {
      setViewStateAt(previousKey, slotKey, stateRef.current);
    }
    boundKeyRef.current = locationKey;
    const saved = getViewStateAt<T>(locationKey, slotKey);
    if (saved !== undefined) {
      setState(saved);
    }
  }, [getViewStateAt, locationKey, setState, setViewStateAt, slotKey]);

  useEffect(() => {
    setViewStateAt(boundKeyRef.current, slotKey, state);
  }, [setViewStateAt, slotKey, state]);

  useEffect(() => {
    return () => {
      setViewStateAt(boundKeyRef.current, slotKey, stateRef.current);
    };
  }, [setViewStateAt, slotKey]);
}
