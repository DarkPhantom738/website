"use client"

import { projects } from "@/data/projects"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

export function Projects() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold mb-12">My Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full cursor-pointer overflow-hidden rounded-3xl border-2 transition-shadow hover:shadow-xl">
                <CardHeader>
                  <div className="relative mb-4 h-48 w-full overflow-hidden rounded-2xl border border-border bg-muted">
                    {project.heroEmbed ? (
                      <iframe
                        src={project.heroEmbed}
                        title={`${project.title} thumbnail preview`}
                        className="h-full w-full scale-[1.35] origin-center bg-white pointer-events-none"
                      />
                    ) : (
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <CardTitle className="text-2xl">{project.title}</CardTitle>
                  <CardDescription className="text-base">{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="rounded-full">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                  <span className="inline-flex items-center text-primary hover:underline font-medium">
                    View Project →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
