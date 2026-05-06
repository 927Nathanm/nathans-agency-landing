"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "Does this replace my phone?",
    answer: "No. You still answer your calls. The assistant only answers calls that forward when you don't pick up.",
  },
  {
    question: "What happens if I answer the call?",
    answer: "Nothing. The call never forwards, so the assistant never engages.",
  },
  {
    question: "Can I control what the assistant says?",
    answer: "Yes. We customize the script, intake questions, and booking rules.",
  },
  {
    question: "Can it book into my calendar?",
    answer: "Yes. It can check availability and book appointments based on your scheduling rules.",
  },
  {
    question: "What if the caller wants something unusual?",
    answer: "The assistant can collect details and route a message to you, or offer next steps.",
  },
  {
    question: "How long does setup take?",
    answer: "MVP: typically within a few days depending on your scheduling complexity.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
