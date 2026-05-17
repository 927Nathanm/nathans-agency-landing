const steps = [
  {
    number: "01",
    title: "You keep answering calls like normal",
    description: "Nothing changes when you pick up. Your business stays personal.",
  },
  {
    number: "02",
    title: "Missed calls forward to your AI receptionist",
    description: "When you can't answer, calls forward to your dedicated line. Works 24/7—nights, weekends, holidays.",
  },
  {
    number: "03",
    title: "AI answers + books instantly",
    description: "Instead of losing the lead to a competitor, your AI assistant captures the booking. Save just 2 leads a month and it pays for itself.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
              How it works
            </h2>
            <div className="mt-12 space-y-10">
              {steps.map((step) => (
                <div key={step.number} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image Placeholder */}
          <div className="order-first lg:order-last">
            <div className="aspect-[4/3] rounded-2xl bg-secondary overflow-hidden flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-full max-w-xs mx-auto">
                  {/* Calendar mockup */}
                  <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-foreground">January 2026</span>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded bg-muted" />
                        <div className="w-6 h-6 rounded bg-muted" />
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-2">
                      <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-xs text-center">
                      {Array.from({ length: 31 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded flex items-center justify-center ${
                            i === 14 ? "bg-primary text-primary-foreground" : "text-foreground"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mt-4">
                  Calendar booking UI mockup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
