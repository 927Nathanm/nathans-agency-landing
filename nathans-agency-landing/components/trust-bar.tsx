import { Zap, Phone, Calendar, Briefcase } from "lucide-react"

const trustItems = [
  { icon: Zap, text: "Fast setup" },
  { icon: Phone, text: "Works with call forwarding" },
  { icon: Calendar, text: "Calendar booking automation" },
  { icon: Briefcase, text: "Built for service businesses" },
]

export function TrustBar() {
  return (
    <section className="py-8 border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {trustItems.map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
