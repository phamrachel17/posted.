"use client";

import { useCallback, type ReactNode } from "react";
import { reorderNotebooks } from "@/app/actions/notebooks";
import { useDragSort } from "@/lib/drag-sort";

/** The notebook shelf, in the order you dragged the covers into. */
export function SortableShelf({ items, children }: { items: { id: string; node: ReactNode }[]; children?: ReactNode }) {
  const save = useCallback((ids: string[]) => void reorderNotebooks(ids), []);
  const { order, itemProps } = useDragSort(items.map((i) => i.id), save);
  return (
    <div className="shelf sortable">
      {order.map((id) => {
        const item = items.find((i) => i.id === id);
        return item ? (
          <div key={id} className="sort-item" {...itemProps(id)}>
            {item.node}
          </div>
        ) : null;
      })}
      {children}
    </div>
  );
}
