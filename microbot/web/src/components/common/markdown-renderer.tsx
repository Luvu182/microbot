// Sanitized markdown renderer using react-markdown + remark-gfm + rehype-sanitize
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // Code blocks — monospace with subtle background
          code({ className: cls, children, ...props }) {
            const isInline = !cls
            return isInline ? (
              <code
                className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-sm"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={`block p-3 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm overflow-x-auto ${cls ?? ''}`}
                {...props}
              >
                {children}
              </code>
            )
          },
          pre({ children }) {
            return (
              <pre className="my-2 overflow-x-auto rounded-lg bg-gray-100 dark:bg-gray-800">
                {children}
              </pre>
            )
          },
          // Links — open in new tab safely
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {children}
              </a>
            )
          },
          // Lists
          ul({ children }) {
            return <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
          },
          // Block elements
          p({ children }) {
            return <p className="my-1 leading-relaxed">{children}</p>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 text-gray-600 dark:text-gray-400 italic">
                {children}
              </blockquote>
            )
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mt-3 mb-1">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mt-3 mb-1">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
