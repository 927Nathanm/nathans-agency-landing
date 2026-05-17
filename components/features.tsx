import { Calendar, RefreshCw, ClipboardList, Clock, Mail, FileText } from "lucide-react"

const features = [
  {
    icon: Calendar,
    title: "Book appointments automatically",
    description: "AI handles scheduling based on your availability rules.",
  },
  {
    icon: RefreshCw,
    title: "Answer common questions",
    description: "AI handles FAQs about your services, hours, and pricing.",
  },
  {
    icon: ClipboardList,
    title: "Collect customer details",
    description: "Name, service, address, notes. All captured automatically.",
  },
  {
    icon: Clock,
    title: "24/7 availability",
    description: "Works nights, weekends, and holidays. Unlike a traditional receptionist.",
  },
  {
    icon: Mail,
    title: "SMS/email confirmations",
    description: "Automatic confirmations keep everyone in the loop.",
  },
  {
    icon: FileText,
    title: "Call summaries + lead log",
    description: "Track every interaction with detailed records.",
  },
]

export function Features() {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            What the assistant can do
          </h2>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl bg-background border border-border hover:border-muted-foreground/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Dashboard placeholder */}
        <div className="mt-16">
          <div className="aspect-[16/9] max-w-3xl mx-auto rounded-xl bg-secondary border border-border overflow-hidden flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-full max-w-md mx-auto">
                {/* Dashboard mockup */}
                <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-foreground">Recent Calls</span>
                    <span className="text-xs text-muted-foreground">Today</span>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted">
                        <div className="w-8 h-8 rounded-full bg-secondary" />
                        <div className="flex-1">
                          <div className="h-3 w-24 bg-secondary rounded" />
                          <div className="h-2 w-16 bg-secondary rounded mt-1" />
                        </div>
                        <div className="text-xs text-muted-foreground">Booked</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm mt-4">
                Dashboard/report screenshot placeholder
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
