import Image from "next/image"
import { Linkedin, Mail } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-32">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-16 text-balance">Aniket Mangalampalli</h1>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Photo */}
          <div className="lg:w-1/3 flex-shrink-0">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-lg">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-secondary to-accent overflow-hidden">
                <Image
                  src="/home-profile.jpg"
                  alt="Profile"
                  width={400}
                  height={400}
                  className="w-full h-full object-contain bg-muted"
                />
              </div>
              <div className="mt-6 flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5" />
                <a href="mailto:aniket.mangalampalli@gmail.com" className="hover:text-primary transition-colors">
                  aniket.mangalampalli@gmail.com
                </a>
              </div>
              <div className="mt-4 flex items-center gap-3 text-muted-foreground">
                <Linkedin className="w-5 h-5" />
                <a
                  href="https://www.linkedin.com/in/aniket-mangalampalli-465362294/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  My LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* About Me Content */}
          <div className="lg:w-2/3">
            <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-lg">
              <h2 className="text-4xl font-bold mb-6">About Me</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Hi! I’m a Class of 2027 high school student who is passionate about harnessing artificial intelligence to create meaningful social impact. I first fell in love with coding because of its limitless potential for innovation and problem-solving, a curiosity I’ve continued to grow through projects in AI and computational research. Alongside programming, I have a deep enthusiasm for mathematics ranging from competition problem-solving to exploring advanced theoretical concepts. Outside of academics, I enjoy playing soccer for a refreshing break and playing an intense game of frisbee with my dog.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
