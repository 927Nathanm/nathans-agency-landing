import { Wrench, Sparkles, Stethoscope, HardHat, PhoneMissed } from "lucide-react"

const niches = [
  {
    icon: Wrench,
    title: "Home services",
    description: "HVAC, plumbing, electrical",
  },
  {
    icon: Sparkles,
    title: "Med spas / salons",
    description: "Appointments made simple",
  },
  {
    icon: Stethoscope,
    title: "Clinics / dental offices",
    description: "Patient scheduling automated",
  },
  {
    icon: HardHat,
    title: "Contractors / field services",
    description: "Never miss a job lead",
  },
  {
    icon: PhoneMissed,
    title: "Any business losing leads",
    description: "To missed calls",
  },
]

export function WhoItsFor() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Built for busy businesses
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {niches.map((niche) => (
            <div
              key={niche.title}
              className="text-center p-6 rounded-xl bg-card border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-secondary flex items-center justify-center">
                <niche.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{niche.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{niche.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-muted-foreground">
          If one extra booked job pays for the month, the system is already profitable.
        </p>
      </div>
    </section>
  )
}
