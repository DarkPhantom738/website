export interface PaperResource {
  label: string
  link: string
}

export interface ResearchPaper {
  id: string
  title: string
  journal: string
  date: string
  abstract: string
  link: string
  fullAbstract: string
  authors: string[]
  keywords: string[]
  sections: {
    title: string
    content: string
  }[]
  resources?: PaperResource[]
  citations?: number
  doi?: string
}

export interface ExpositoryPaper {
  id: string
  title: string
  publication: string
  date: string
  summary: string
  link: string
  fullContent: string
  authors: string[]
  topics: string[]
  sections: {
    title: string
    content: string
  }[]
  resources?: PaperResource[]
}

export const researchPapers: ResearchPaper[] = [
  {
    id: "main-paper",
    title: "STRIDE: Autoencoder-Based Intrinsic Structural Malware Detection",
    journal: "Independent Research",
    date: "2026",
    abstract:
      "Malware remains one of the most significant threats to modern computing systems. Most current malware detectors still depend on signature matching, supervised learning on known malware, or sandbox analysis, which makes them less reliable against zero-day attacks. STRIDE instead models the intrinsic structural patterns of benign PDFs so that malicious files appear as structural outliers.",
    link: "/papers/main-paper.pdf",
    fullAbstract:
      "Malware remains one of the most significant threats to modern computing systems. Cybercrime caused over $10.5 trillion in global damages annually in 2025, making it one of the largest digital threats to the world economy. Many attacks are file-based, and PDF documents are especially relevant because they are trusted, widely exchanged, and capable of carrying malicious payloads through embedded content or exploit structures. Most current malware detectors still depend on one of three strategies: signature matching, supervised machine learning on known malware, or behavioral analysis in a sandbox. These methods work well for already-seen malware, but they are less reliable against zero-day or previously unseen attacks. This led me to the central question of this project: can malware be detected without training on malware at all? My approach was to model the intrinsic structural patterns of benign PDFs instead of learning malware signatures. If benign documents lie on a relatively consistent manifold in feature space, then malicious files should appear as structural outliers. That idea motivated STRIDE, the Structural Intrinsic Detection Engine.",
    authors: ["Aniket Mangalampalli"],
    keywords: ["Research", "Manuscript", "Mathematics", "Portfolio"],
    resources: [
      { label: "View Poster", link: "/posters/stride-poster.pdf" },
      { label: "View Slides", link: "/slides/stride-slides.pdf" },
    ],
    sections: [],
  },
  {
    id: "linalg-agents",
    title: "Comparing Centralized and Decentralized Optimization Methods for Multi-Agent Task Allocation Using Linear Programming and Auction Algorithms",
    journal: "Independent Research",
    date: "2026",
    abstract:
      "In this project, I explored how groups of agents, such as robots or delivery drones, can divide tasks among themselves in the most efficient way possible. I compared three different methods for assigning tasks: a centralized linear programming model, a decentralized auction system, and a hybrid version that combines both.",
    link: "/papers/linalg-agents.pdf",
    fullAbstract:
      "In this project, I explored how groups of agents, such as robots or delivery drones, can divide tasks among themselves in the most efficient way possible. I compared three different methods for assigning tasks: a centralized linear programming model, a decentralized auction system, and a hybrid version that combines both. The centralized model uses a mathematical solver to find the absolute best solution, but it requires all the information in one place. The decentralized auction lets each agent make its own decisions by bidding on tasks, which makes it faster and more flexible but not always perfectly optimal. The hybrid model starts with estimated prices from the centralized system and then lets agents continue bidding, which helps it reach high accuracy with less communication. To test these methods, I created simulations where multiple agents had to complete sets of random tasks with different costs. The results showed that while the centralized model produced the lowest total cost, the decentralized and hybrid systems achieved almost the same efficiency with much shorter runtimes and fewer data exchanges. Overall, the hybrid approach gave the best balance between accuracy and speed, showing that combining optimization and self-coordination can be an effective way to manage multi-agent systems.",
    authors: ["Aniket Mangalampalli"],
    keywords: ["Linear Algebra", "Agents", "Research", "Mathematics"],
    sections: [],
  },
]

export const expositoryPapers: ExpositoryPaper[] = [
  {
    id: "banach-tarski",
    title: "Banach-Tarski Paradox",
    publication: "Expository Mathematics Writing",
    date: "2026",
    summary:
      "This expository paper will delve into basic ZFC set theory, elementary measure theory, and group actions, in order to present a clear proof to how a solid three-dimensional ball can be duplicated via the Banach-Tarski paradox.",
    link: "/papers/banach-tarski-paper.pdf",
    fullContent:
      "This expository paper will delve into basic ZFC set theory, elementary measure theory, and group actions, in order to present a clear proof to how a solid three-dimensional ball can be duplicated via the Banach-Tarski Paradox. In particular, we trace how the Axiom of Choice enables paradoxical decompositions, leading to results that defy classical intuition about volume and congruence. Our goal is to demystify what makes Banach-Tarski possible, showcase its far-reaching implications, and provide readers with a gateway to one of mathematics' most baffling and beautiful results.",
    authors: ["Aniket Mangalampalli"],
    topics: ["Banach-Tarski Paradox", "Set Theory", "Geometry", "Exposition"],
    resources: [
      { label: "View Slides", link: "/slides/banach-tarski-slides.pdf" },
    ],
    sections: [],
  },
  {
    id: "linear-programming",
    title: "Linear Programming",
    publication: "Expository Mathematics Writing",
    date: "2026",
    summary:
      "Linear programming is the problem of optimizing a linear objective function subject to a collection of linear constraints. Although the problem appears simple in form, it captures an astonishing range of mathematical structures, from geometry to optimization to computational complexity.",
    link: "/papers/linear-programming.pdf",
    fullContent:
      "Linear programming is the problem of optimizing a linear objective function subject to a collection of linear constraints. Although the problem appears simple in form, it captures an astonishing range of mathematical structures, from geometry to optimization to computational complexity. This paper introduces the theory of linear programming, explains the geometry of feasible regions, describes the simplex and interior-point algorithms, and outlines why the problem is solvable in polynomial time. We conclude with examples illustrating the power and scope of linear programming in modern mathematics and computer science.",
    authors: ["Aniket Mangalampalli"],
    topics: ["Linear Programming", "Optimization", "Exposition", "Mathematics"],
    sections: [],
  },
]
