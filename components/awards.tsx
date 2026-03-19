import { stemAwards, humanitiesAwards } from "@/data/awards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function Awards() {
  return (
    <section className="px-6 py-20">
      <div className="max-w-7xl mx-auto w-full">
        <h2 className="text-5xl md:text-6xl font-bold mb-12">Awards</h2>
        <Tabs defaultValue="stem" className="w-full">
          <div className="flex justify-start mb-8">
            <TabsList className="grid grid-cols-2 w-full max-w-md rounded-full h-14">
              <TabsTrigger value="stem" className="rounded-full text-base">
                STEM
              </TabsTrigger>
              <TabsTrigger value="humanities" className="rounded-full text-base">
                Humanities
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="stem">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stemAwards.map((award) => (
                <Card key={award.id} className="rounded-3xl border-2 hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-balance">{award.title}</CardTitle>
                    <CardDescription className="text-base">{award.organization}</CardDescription>
                    <CardDescription className="text-sm">{award.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{award.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="humanities">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {humanitiesAwards.map((award) => (
                <Card key={award.id} className="rounded-3xl border-2 hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl text-balance">{award.title}</CardTitle>
                    <CardDescription className="text-base">{award.organization}</CardDescription>
                    <CardDescription className="text-sm">{award.date}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{award.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
