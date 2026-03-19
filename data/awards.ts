export interface Award {
  id: string
  title: string
  organization: string
  date: string
  description: string
}

export const stemAwards: Award[] = [
  {
    id: "1",
    title: "USAJMO Qualifier",
    organization: "MAA",
    date: "2025",
    description: "Had performed well in both AMC10 and AIME and scored higher than top 1% of all AMC Test Takers",
  },
  {
    id: "2",
    title: "2x AIME Qualifier",
    organization: "MAA",
    date: "2024, 2025",
    description: "Had scored in the top 5% of all AMC10 test takers and qualified for the following selection exam",
  },
  {
    id: "3",
    title: "AMC10 Distinguished Qualifier",
    organization: "MAA",
    date: "2024",
    description: "Scored in the top 1% of AMC10 test takers with a score of 136.5",
  },
  {
    id: "4",
    title: "USAMTS Perfect Scorer/Gold Medalist",
    organization: "Art of Problem Solving",
    date: "2025",
    description: "Received a perfect score in three-rounded proof-based competition",
  },
  {
    id: "5",
    title: "Distinguished Honor Roll/Honor Roll/Top 10 in Several College Math Competitions",
    organization: "SMT, BMT, etc.",
    date: "2023, 2024, 2025",
    description: "Had performed in the top20% as well as top 10 range in various college competitions",
  },
  {
    id: "6",
    title: "National Science Bowl Top 8 Qualifier",
    organization: "NSB",
    date: "2023",
    description:
      "Had not only qualified for NSB Nationals which is a fully-paid trip to Washington D.C., but also earned top 8 of the 48 teams there",
  },
  {
    id: "7",
    title: "FTC #2 NPR In Bay Area",
    organization: "FTC",
    date: "2024, 2025",
    description:
      "Led team #21227 Legends to second highest robot point scoring in the most competetive region, Bay Area. We also had qualified for regionals, top 24 of hundreds of teams in NorCal, as well as won the prestigious invitation Kentucky Premeir Event 2025",
  },

]

export const humanitiesAwards: Award[] = [
  {
    id: "1",
    title: "ICDC Qualifier",
    organization: "DECA",
    date: "2025",
    description: "Part of the top 10% of over 200,000 DECA competetitors who were judged based on their speaking and qualified for the International Carreer Development Conference",
  },
  {
    id: "2",
    title: "Eagle Scout",
    organization: "Boy Scouts of America",
    date: "2025",
    description: "Awarded the prestigious Eagle Rank as validation of my community efforts in Troop 125",
  },
]
