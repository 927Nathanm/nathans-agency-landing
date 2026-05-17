import { siteConfig } from '@/config/site'
import { Button } from "@/components/ui/button"
import { Phone, Mail } from "lucide-react"

export function FinalCTA() {
  return (
    <section id="book-demo" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Stop losing leads to competitors
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Every missed call is a customer calling someone else. Our AI answers 24/7 so you never lose another booking. Save just 2 leads a month and the service pays for itself.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
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

          <p className="mt-8 text-sm text-muted-foreground">
            {siteConfig.contact.phoneDisplay} | {siteConfig.contact.email}
          </p>
        </div>
      </div>
    </section>
  )
}
