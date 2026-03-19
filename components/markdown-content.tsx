"use client"

import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mt-8 mb-4 text-4xl font-bold text-balance">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-8 mb-4 text-3xl font-bold text-balance">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-6 mb-3 text-2xl font-bold text-balance">{children}</h3>,
          p: ({ node, children }) => {
            const hasStandaloneImage = node?.children?.some(
              (child: any) => child.type === "element" && child.tagName === "img",
            )

            if (hasStandaloneImage) {
              return <div className="my-4">{children}</div>
            }

            return <p className="my-4 text-base leading-8 text-foreground/90 md:text-lg">{children}</p>
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) => {
            if (!src) return null

            return (
              <figure className="my-8 overflow-hidden rounded-3xl border border-border bg-card/60 p-3">
                <div className="relative aspect-[2/1] w-full">
                  <Image
                    src={src as string}
                    alt={alt || ""}
                    fill
                    className="rounded-2xl object-cover"
                  />
                </div>
                {alt && <figcaption className="mt-3 text-center text-sm text-muted-foreground">{alt}</figcaption>}
              </figure>
            )
          },
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "")

            return !inline && match ? (
              <div className="my-6 overflow-hidden rounded-2xl border border-border bg-slate-950 shadow-sm">
                <SyntaxHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, "")}
                  language={match[1]}
                  PreTag="div"
                  style={vscDarkPlus}
                  wrapLongLines={false}
                  showLineNumbers={false}
                  customStyle={{
                    margin: 0,
                    padding: "1.25rem",
                    background: "transparent",
                    fontSize: "0.95rem",
                    lineHeight: "1.7",
                    tabSize: 2,
                    overflowX: "auto",
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        '"Geist Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
                    },
                  }}
                />
              </div>
            ) : (
              <code
                {...props}
                className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
              >
                {children}
              </code>
            )
          },
          ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2 marker:text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2 marker:font-semibold">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-8 text-foreground/90">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-r-2xl border-l-4 border-primary bg-muted/50 px-5 py-4 italic text-foreground/80">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-border" />,
          table: ({ children }) => (
            <div className="my-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="min-w-full border-collapse text-left text-sm md:text-base">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          tr: ({ children }) => <tr className="align-top">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-3 font-semibold tracking-tight text-foreground md:px-5">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-3 text-foreground/85 md:px-5">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
