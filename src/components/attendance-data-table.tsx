"use client"

import * as React from "react"
import {
  AlarmClock,
  ClockArrowDown,
  ClockArrowUp,
  ShieldCheck,
} from "lucide-react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type AttendanceRecord = {
  id: string
  name: string
  email: string
  loginTime: Date
  logoutTime: Date | null
}

type AttendanceDataTableProps = {
  data: AttendanceRecord[]
  currentSessionId: string | null
  formatDate: (date: Date | null) => string
  calculateDuration: (start: Date, end: Date | null) => string
  renderStatus: (record: AttendanceRecord) => React.ReactNode
}

export function AttendanceDataTable({
  data,
  currentSessionId,
  formatDate,
  calculateDuration,
  renderStatus,
}: AttendanceDataTableProps) {
  const columns = React.useMemo<ColumnDef<AttendanceRecord>[]>(
    () => [
      {
        accessorKey: "loginTime",
        header: () => (
          <span className="flex items-center gap-2 font-semibold">
            <ClockArrowUp className="h-4 w-4 text-muted-foreground" />
            Login Time
          </span>
        ),
        cell: ({ row }) => formatDate(row.original.loginTime),
      },
      {
        accessorKey: "logoutTime",
        header: () => (
          <span className="flex items-center gap-2 font-semibold">
            <ClockArrowDown className="h-4 w-4 text-muted-foreground" />
            Logout Time
          </span>
        ),
        cell: ({ row }) => formatDate(row.original.logoutTime),
      },
      {
        id: "duration",
        header: () => (
          <span className="flex items-center gap-2 font-semibold">
            <AlarmClock className="h-4 w-4 text-muted-foreground" />
            Duration
          </span>
        ),
        cell: ({ row }) =>
          calculateDuration(row.original.loginTime, row.original.logoutTime),
      },
      {
        id: "status",
        header: () => (
          <span className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Status
          </span>
        ),
        cell: ({ row }) => renderStatus(row.original),
      },
    ],
    [calculateDuration, formatDate, renderStatus]
  )

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    row.original.id === currentSessionId
                      ? "bg-emerald-50/60"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
