"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Table Props Interface
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  defaultSorting?: SortingState;
}

export const DataTable = <TData, TValue>({
  columns,
  data,
  emptyMessage,
  defaultSorting = [],
}: DataTableProps<TData, TValue>) => {
  // Row selection state
  const [rowSelection, setRowSelection] = useState({});
  // Sorting state
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);

  // Init table
  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      rowSelection,
      sorting,
    },
    manualPagination: true,
    enableRowSelection: true,
    enableSorting: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-auto">
      <table className="w-full text-[15px]">
        <thead className="border-b bg-secondary tracking-wide dark:bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                
                return (
                  <th
                    className={cn(
                      "h-12 px-6 text-left font-medium whitespace-nowrap",
                      canSort && "cursor-pointer select-none hover:bg-muted/50 transition-colors"
                    )}
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {canSort && (
                          <span className="text-muted-foreground">
                            {sortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted/50"
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className="min-h-14 truncate px-6 py-2.5 text-sm"
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-28 pt-6 text-center text-lg text-muted-foreground"
              >
                {emptyMessage || "No data available"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
