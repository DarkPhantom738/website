"use client"

import { projects } from "@/data/projects"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Github } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MarkdownContent } from "@/components/markdown-content"

export default function ProjectDetailPage() {
  const params = useParams()
  const project = projects.find((p) => p.id === params.id)

  if (!project) {
    notFound()
  }

  return (
    <main className="min-h-screen px-6 py-20">
      <div className="max-w-4xl mx-auto" suppressHydrationWarning>
        <Link href="/projects" className="text-primary hover:underline mb-8 inline-block">
          ← Back to Projects
        </Link>

        {project.heroVideo && (
          <div className="mb-10 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <video
              className="aspect-video w-full bg-black object-cover"
              controls
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            >
              <source src={project.heroVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              If the embedded player stays blank, open the video directly{" "}
              <a
                href={project.heroVideo}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                here
              </a>
              .
            </div>
          </div>
        )}

        {project.heroEmbed && (
          <div className="mb-10 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <iframe
              src={project.heroEmbed}
              title={`${project.title} interactive demo`}
              className="h-[720px] w-full bg-white"
            />
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              This embedded graph is served from the portfolio itself, so public visitors can open it directly{" "}
              <a
                href={project.heroEmbed}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-4"
              >
                here
              </a>
              .
            </div>
          </div>
        )}

        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-balance">{project.title}</h1>
        
        <p className="text-xl text-muted-foreground mb-8">{project.description}</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {project.technologies.map((tech) => (
            <Badge key={tech} variant="secondary" className="rounded-full text-base px-4 py-1">
              {tech}
            </Badge>
          ))}
        </div>

        <div className="flex gap-4 mb-12">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-6 py-3 hover:shadow-lg transition-shadow"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-6 py-3 hover:shadow-lg transition-shadow"
            >
              <ExternalLink className="w-5 h-5" />
              View Demo
            </a>
          )}
        </div>

        <MarkdownContent content={project.content} />
      </div>
    </main>
  )
}
