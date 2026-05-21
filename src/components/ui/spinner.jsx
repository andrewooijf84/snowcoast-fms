import { cn } from '@/lib/utils'

export function Spinner({ className }) {
  return (
    <div className={cn('w-6 h-6 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin', className)} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner className="w-8 h-8" />
    </div>
  )
}

export function InlineError({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
      <span>⚠ {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-auto underline text-xs hover:no-underline">
          Retry
        </button>
      )}
    </div>
  )
}
