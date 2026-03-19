"use client"

import { researchPapers, expositoryPapers } from "@/data/papers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export function Papers() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold mb-12">My Papers</h2>
        <Tabs defaultValue="research" className="w-full">
          {/* Changed toggle alignment from right to left */}
          <div className="flex justify-start mb-8">
            <TabsList className="grid grid-cols-2 w-full max-w-md rounded-full h-14">
              <TabsTrigger value="research" className="rounded-full text-base">
                Research Papers
              </TabsTrigger>
              <TabsTrigger value="expository" className="rounded-full text-base">
                Expository Papers
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="research">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {researchPapers.map((paper) => (
                <Link key={paper.id} href={`/papers/${paper.id}`}>
                  <Card className="rounded-3xl border-2 hover:shadow-xl transition-shadow h-full cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-2xl text-balance">{paper.title}</CardTitle>
                      <CardDescription className="text-base">{paper.journal}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 leading-relaxed">{paper.abstract}</p>
                      <span className="inline-flex items-center text-primary hover:underline font-medium">
                        Read Paper →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="expository">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {expositoryPapers.map((paper) => (
                <Link key={paper.id} href={`/papers/${paper.id}`}>
                  <Card className="rounded-3xl border-2 hover:shadow-xl transition-shadow h-full cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-2xl text-balance">{paper.title}</CardTitle>
                      <CardDescription className="text-base">{paper.publication}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 leading-relaxed">{paper.summary}</p>
                      <span className="inline-flex items-center text-primary hover:underline font-medium">
                        Read Paper →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
