import Image from "next/image"
import { Mic, Brain, Zap, Shield } from "lucide-react"

export function AIVoiceSection() {
  return (
    <section id="ai-voice" className="py-20 md:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-wider mb-3">
            AI Voice Technology
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Powered by Vapi + OpenAI
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Your AI receptionist uses the same technology behind ChatGPT to have natural, 
            human-like conversations with your customers.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="order-2 lg:order-1">
            <div className="relative rounded-xl overflow-hidden border border-border shadow-lg">
              <Image
                src="/images/vapi-interface.png"
                alt="Vapi AI voice assistant configuration showing GPT-4o model and custom greeting message"
                width={1200}
                height={900}
                className="w-full h-auto"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Custom-configured AI assistant tailored to your business
            </p>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 space-y-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">GPT-4o Powered</h3>
                  <p className="text-muted-foreground text-sm">
                    Uses OpenAI&apos;s most advanced model for natural, context-aware conversations 
                    that understand what your customers actually need.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Natural Voice</h3>
                  <p className="text-muted-foreground text-sm">
                    Sounds like a real person, not a robot. Your customers won&apos;t know 
                    they&apos;re talking to an AI unless you tell them.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Instant Response</h3>
                  <p className="text-muted-foreground text-sm">
                    Answers immediately. No hold music, no voicemail. Converts missed calls 
                    into booked appointments in real-time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Custom Trained</h3>
                  <p className="text-muted-foreground text-sm">
                    Configured specifically for your business. Knows your services, hours, 
                    and how to handle common questions.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-5 border border-border">
              <p className="text-sm italic text-muted-foreground">
                &ldquo;Thank you for calling Nathan&apos;s Plumbing. This is Riley, your scheduling 
                assistant. How may I help you today?&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Example AI greeting (fully customizable)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
