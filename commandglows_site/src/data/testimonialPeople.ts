export type TestimonialPerson = {
  name: string
  role: string
  avatarRepresentation: 'portrait' | 'appsumo-generic'
  avatarSrc?: string
  sourceCapture: string
  title: string
  quote: string
  rating: number
  verified: boolean
}

export const testimonialPeople: readonly TestimonialPerson[] = [
  {
    name: 'Florin Muresan',
    role: 'CEO & Co-Founder at Squirrly',
    avatarRepresentation: 'portrait',
    avatarSrc: 'https://winflowz.b-cdn.net/Florin_muresan.jpg',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104159259.webp',
    title: 'One of the Best Deals I Purchased All Year!',
    quote:
      "I just spent 20 minutes in it and I'm already wondering what I've been doing with my life until now :)) Lots of goodies to improve my work. I love it! I thought I was being productive and that my setup was good and adapted for speed... but I guess I was wrong. There's a lot to go through and it's so well organized. I feel like I've discovered hidden treasure.",
    rating: 5,
    verified: true,
  },
  {
    name: 'Alex',
    role: 'Verified Purchaser',
    avatarRepresentation: 'portrait',
    avatarSrc: 'https://winflowz.b-cdn.net/alex-dynapictures.png',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104200667.webp',
    title: 'Actionable Advice and Profound Market Research',
    quote:
      'This product contains lots of useful information, obviously the authors are experts in market analysis and productivity tools. I like the idea of working smarter, not harder, and one can achieve this by applying the right tools for the job. Nice, they even covered how to stay focused, what tools to use to eliminate distractions and not to procrastinate!',
    rating: 5,
    verified: true,
  },
  {
    name: 'HoangV',
    role: 'Verified Purchaser',
    avatarRepresentation: 'appsumo-generic',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104200332.webp',
    title: 'Love it!',
    quote:
      'I was skeptical at first. It was not easy to buy truly helpful Notion templates. But I made the right decision. It contains numerous information about various "handy hacks" to make me much more productive without having to search too much. I feel lucky that I pulled the trigger — Desktop Enhanced already more than paid off my investment.',
    rating: 5,
    verified: true,
  },
  {
    name: 'Digital_Nomad',
    role: 'Verified Purchaser',
    avatarRepresentation: 'appsumo-generic',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170731648.webp',
    title: 'Must have for windows user',
    quote:
      "Even if one is a windows geek, one will find golden nuggets on hacks, shortcuts which save time and fasten your work. Very neatly organized in sections. Already got my money's worth. As the name of the product will definitely enhance the way one will use their windows OS.",
    rating: 5,
    verified: true,
  },
  {
    name: 'g273',
    role: 'Verified Purchaser',
    avatarRepresentation: 'appsumo-generic',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170715647.webp',
    title: 'Best ROI ever!!!',
    quote:
      'This list of useful apps and websites will optimize the crap out of your life "literally". Thank you for putting this together.',
    rating: 5,
    verified: true,
  },
  {
    name: 'lamefusioncake',
    role: 'Verified Purchaser',
    avatarRepresentation: 'appsumo-generic',
    sourceCapture: 'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170751387.webp',
    title: 'useful',
    quote: 'Thank you',
    rating: 5,
    verified: true,
  },
]
