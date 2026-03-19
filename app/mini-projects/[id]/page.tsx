"use client"

import { miniProjects } from "@/data/mini-projects"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Github } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MarkdownContent } from "@/components/markdown-content"

export default function MiniProjectDetailPage() {
  const params = useParams()
  const project = miniProjects.find((p) => p.id === params.id)

  if (!project) {
    notFound()
  }

  return (
    <main className="min-h-screen px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <Link href="/mini-projects" className="text-primary hover:underline mb-8 inline-block">
          ← Back to Mini Projects
        </Link>

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
