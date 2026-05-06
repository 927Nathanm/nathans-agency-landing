import Image from "next/image"
import { Shield, Zap, Mail } from "lucide-react"

export function TechnologySection() {
  return (
    <section id="technology" className="py-20 lg:py-32 bg-card">
      <div className="container px-4 md:px-6 mx-auto max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">
            Enterprise-Grade Technology
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance">
            Powered by n8n Automation
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            We use n8n, an industry-leading workflow automation platform trusted by thousands of businesses worldwide, to deliver reliable, scalable appointment booking.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* n8n Workflow Image */}
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <Image
                src="/images/n8n-workflow.png"
                alt="n8n workflow automation showing calendar integration, availability checking, and email confirmation nodes"
                width={800}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                Intelligent Workflow Automation
              </h3>
              <p className="text-muted-foreground">
                Our backend runs on n8n&apos;s visual workflow builder, connecting your Google Calendar, email, and AI receptionist into one seamless system. Every call triggers an automated sequence that checks availability, books appointments, and confirms with your customers—all in real time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Real-time calendar sync with Google Calendar</span>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Secure, encrypted data handling</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Automated email confirmations via Gmail</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Confirmation Email Image */}
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <Image
                src="/images/confirmation-email.png"
                alt="Professional appointment confirmation email showing booking details, date, time, and Google Calendar link"
                width={800}
                height={500}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                Professional Customer Communications
              </h3>
              <p className="text-muted-foreground">
                Your customers receive polished, branded confirmation emails the moment their appointment is booked. Each email includes all the details they need: service type, date and time, address, and a direct link to view the appointment in their own Google Calendar.
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Instant confirmation.</span> Customers get all the details they need right away—no waiting, no confusion, no missed appointments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 pt-12 border-t border-border">
          <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">SOC 2 Compliant Infrastructure</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span className="text-sm font-medium">Open-Source Technology</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">99.9% Uptime Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
