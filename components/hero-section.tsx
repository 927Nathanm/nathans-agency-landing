import { siteConfig } from '@/config/site'
import { Button } from "@/components/ui/button"
import { Check, Phone, Mail } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight text-balance">
              Never miss a booking when you don't answer.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              When customers call and get no answer, they call your competitor. Our AI receptionist answers missed calls 24/7, qualifies the lead, and books the appointment into your calendar—automatically. Save just 2 leads a month and the service pays for itself.
            </p>

            {/* Bullets */}
            <ul className="mt-8 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
                <span className="text-foreground">Only handles missed calls (your business keeps answering normally)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
                <span className="text-foreground">Books into your calendar with your rules (hours, services, buffers)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </span>
                <span className="text-foreground">Works 24/7—nights, weekends, holidays</span>
              </li>
            </ul>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="text-base">
                <a href={`tel:${siteConfig.contact.phoneE164}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call to Book a Demo
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-base bg-transparent">
                <a href={`mailto:${siteConfig.contact.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Or Email Us
                </a>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-square lg:aspect-[4/5] rounded-2xl bg-secondary overflow-hidden">
              <img 
                src="/images/hero-illustration.jpg" 
                alt="Phone receiving call with forward arrow pointing to calendar with confirmed checkmark - illustrating missed calls becoming booked appointments"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
