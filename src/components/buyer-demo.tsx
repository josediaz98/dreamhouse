"use client";

import { useRef, useState } from "react";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { useLots } from "@/lib/client/use-lots";
import { BeforeAfter } from "@/components/before-after";
import { CountersStrip } from "@/components/counters-strip";
import { ParcelSheet } from "@/components/parcel-sheet";
import { Playground, type PlaygroundHandle } from "@/components/playground";
import { RankedLots } from "@/components/ranked-lots";
import { ReceiptsPanel } from "@/components/receipts-panel";

function Section({
  id,
  title,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-fg">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function BuyerDemo() {
  const lotsState = useLots(DEFAULT_PROGRAM);
  const playground = useRef<PlaygroundHandle>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const openQuestions = new Set(
    lotsState.lots.flatMap(({ result }) => result?.openQuestionIds ?? []),
  ).size;

  return (
    <>
      <Section id="demo" title="Ask the lot">
        <Playground
          ref={playground}
          lots={lotsState.lots}
          loading={lotsState.status === "loading"}
          failed={lotsState.status === "error"}
          onLotChange={setSelectedId}
        />
        <RankedLots state={lotsState} />
      </Section>

      <Section title="Where the facts stop, the line is dashed.">
        <ParcelSheet
          state={lotsState}
          selectedId={selectedId}
          onSelect={(id) => playground.current?.runLot(id)}
        />
      </Section>

      <Section title="“I don’t know” vs a sourced answer">
        <BeforeAfter eliminatedCount={lotsState.eliminatedCount} openQuestions={openQuestions} />
      </Section>

      <Section title="Numbers from the dataset">
        <CountersStrip lots={lotsState.lots} eliminatedCount={lotsState.eliminatedCount} />
        <ReceiptsPanel version={lotsState.version} />
      </Section>
    </>
  );
}
