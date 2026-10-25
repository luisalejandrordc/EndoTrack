import { useCallback, useState } from "react";
import type { Toast } from "./toast";

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const notify = useCallback((next: Toast) => setToast(next), []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, notify, dismiss };
}
