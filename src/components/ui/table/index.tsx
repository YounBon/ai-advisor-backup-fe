import type { ReactNode } from 'react'

// Props for Table
interface TableProps {
  children: ReactNode // Table content (thead, tbody, etc.)
  className?: string // Optional className for styling
  /** Bọc bảng trong khung bo góc + viền (mặc định: true) */
  framed?: boolean
}

// Props for TableHeader
interface TableHeaderProps {
  children: ReactNode // Header row(s)
  className?: string // Optional className for styling
}

// Props for TableBody
interface TableBodyProps {
  children: ReactNode // Body row(s)
  className?: string // Optional className for styling
}

// Props for TableRow
interface TableRowProps {
  children: ReactNode // Cells (th or td)
  className?: string // Optional className for styling
}

// Props for TableCell
interface TableCellProps {
  children: ReactNode // Cell content
  isHeader?: boolean // If true, renders as <th>, otherwise <td>
  className?: string // Optional className for styling
  colSpan?: number
  rowSpan?: number
}

// Table Component — khung giúp bảng nhất quán, dễ đọc trên nền card
const Table: React.FC<TableProps> = ({ children, className = '', framed = true }) => {
  const table = (
    <table className={`min-w-full border-collapse text-sm ${className}`}>{children}</table>
  )
  if (!framed) return table
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200/85 bg-gradient-to-b from-white to-gray-50/90 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.08)] ring-1 ring-gray-900/[0.025] dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/80 dark:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.45)] dark:ring-white/[0.04]">
      {table}
    </div>
  )
}

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={className}>{children}</thead>
}

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={className}>{children}</tbody>
}

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({ children, className }) => {
  return <tr className={className}>{children}</tr>
}

// TableCell Component
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className = '',
  colSpan,
  rowSpan,
}) => {
  const CellTag = isHeader ? 'th' : 'td'
  return (
    <CellTag
      className={className}
      colSpan={colSpan}
      rowSpan={rowSpan}
      {...(isHeader ? { scope: 'col' as const } : {})}
    >
      {children}
    </CellTag>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableCell }
