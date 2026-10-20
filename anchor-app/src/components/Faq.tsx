"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion.Root type="multiple" className="divide-y divide-border rounded-[12px] border border-border bg-surface">
      {items.map((item, i) => (
        <Accordion.Item key={item.q} value={`faq-${i}`}>
          <Accordion.Header asChild>
            <h3>
              <Accordion.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3 text-left font-medium">
                {item.q}
                <ChevronDown
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-muted transition-transform group-data-[state=open]:rotate-180"
                />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="px-5 pb-4 text-muted">{item.a}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
