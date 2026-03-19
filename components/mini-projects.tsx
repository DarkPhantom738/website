"use client"

import { miniProjects } from "@/data/mini-projects"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export function MiniProjects() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold mb-12 whitespace-nowrap">Mini Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {miniProjects.map((project) => (
            <Link key={project.id} href={`/mini-projects/${project.id}`}>
              <Card className="h-full cursor-pointer overflow-hidden rounded-3xl border-2 transition-shadow hover:shadow-xl">
                <CardHeader>
                  <div className="relative mb-4 h-44 w-full overflow-hidden rounded-2xl border border-border bg-muted">
                    <Image
                      src={project.image || "/placeholder.jpg"}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardTitle className="text-xl">{project.title}</CardTitle>
                  <CardDescription className="text-sm">{project.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">{project.description}</p>
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
