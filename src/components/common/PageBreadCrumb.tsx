import { Link } from 'react-router'

interface BreadcrumbProps {
  pageTitle: string
}

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="relative pl-4 sm:pl-5">
        <span
          className="absolute bottom-0 left-0 top-1 w-1 rounded-full bg-gradient-to-b from-[#E02020] to-[#B01818] shadow-sm shadow-red-500/30"
          aria-hidden
        />
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#E02020] dark:text-red-400">
          Advisor
        </p>
        <h1 className="text-balance text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {pageTitle}
        </h1>
      </div>
      <nav aria-label="Breadcrumb">
        <ol className="inline-flex items-center gap-1 rounded-full border border-gray-200/90 bg-white/95 px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.03] dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-300 dark:ring-white/[0.06]">
          <li>
            <Link
              className="inline-flex items-center gap-1 text-gray-500 transition-colors duration-200 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white/90"
              to="/"
            >
              Trang chủ
              <svg
                className="stroke-current text-gray-400 dark:text-gray-500"
                width="14"
                height="14"
                viewBox="0 0 17 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </li>
          <li className="text-gray-400 dark:text-gray-500" aria-hidden>
            /
          </li>
          <li className="max-w-[12rem] truncate text-gray-800 dark:text-white/90" title={pageTitle}>
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  )
}

export default PageBreadcrumb
