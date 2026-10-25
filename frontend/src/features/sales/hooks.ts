import { useQueryClient } from "@tanstack/react-query";
import type { Sale } from "../../domain/types";

/** After any change the server answers with the updated sale; put it in the cache and refresh the lists. */
export function useSaleCache(id: string) {
  const qc = useQueryClient();
  return (s: Sale) => {
    qc.setQueryData(["sale", id], s);
    qc.invalidateQueries({ queryKey: ["sales"] });
  };
}
