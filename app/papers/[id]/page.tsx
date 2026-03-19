import { researchPapers, expositoryPapers } from "@/data/papers"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
import Link from "next/link"

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const researchPaper = researchPapers.find((p) => p.id === id)
  const expositoryPaper = expositoryPapers.find((p) => p.id === id)

  const paper = researchPaper || expositoryPaper

  if (!paper) {
    notFound()
  }

  const isResearch = !!researchPaper

  return (
    <main className="min-h-screen px-6 py-20">
      <div className="max-w-4xl mx-auto">
        <Link href="/papers" className="text-primary hover:underline mb-8 inline-block">
          ← Back to Papers
        </Link>

        <div className="mb-6">
          <Badge variant="secondary" className="rounded-full text-base px-4 py-1 mb-4">
            {isResearch ? "Research Paper" : "Expository Paper"}
          </Badge>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance">{paper.title}</h1>

        <div className="mb-12 flex flex-wrap gap-4">
          <a
            href={paper.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground transition-shadow hover:shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Read Full Paper
          </a>
          {paper.resources?.map((resource) => (
            <a
              key={resource.link}
              href={resource.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 transition-shadow hover:shadow-lg"
            >
              <FileText className="w-5 h-5" />
              {resource.label}
            </a>
          ))}
        </div>

        <Card className="rounded-3xl border-2 mb-8">
          <CardContent className="p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-6">Abstract</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {isResearch ? (researchPaper as any).fullAbstract : (expositoryPaper as any).fullContent}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
