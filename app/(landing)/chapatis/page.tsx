import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChefHat, Flame, Soup, Sparkles, Wheat } from "lucide-react";
import { socialPreviewImage } from "@/lib/seo";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "Chapatis – Soft, Layered, Made by Hand",
  description:
    "Learn the art of the perfect chapati—soft, flaky, golden. Discover the story, the technique, and where to taste the real thing.",
  openGraph: {
    title: "Chapatis – Soft, Layered, Made by Hand",
    description:
      "The unleavened flatbread that turns any meal into an occasion. Soft, flaky, golden, and made with love.",
    images: [socialPreviewImage],
  },
};

const steps = [
  {
    icon: Wheat,
    title: "Knead with patience",
    body: "Warm water, a pinch of salt, a splash of oil. Knead until the dough is smooth and supple, then rest it—good chapatis are never rushed.",
  },
  {
    icon: ChefHat,
    title: "Roll & layer",
    body: "Coil, flatten, and roll thin. The secret to those signature flaky layers is a light brush of oil folded back into the dough.",
  },
  {
    icon: Flame,
    title: "Cook on the moto",
    body: "A hot pan, a little ghee, and quick hands. Watch for the golden-brown blisters—that's how you know it's ready.",
  },
];

const pairings = [
  {
    name: "Beef stew",
    body: "Slow-simmered with tomatoes, onions, and dhania. The classic Sunday companion.",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1200&h=900&fit=crop",
  },
  {
    name: "Ndengu",
    body: "Creamy green grams in a rich coconut sauce—humble, hearty, and unforgettable.",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1200&h=900&fit=crop",
  },
  {
    name: "Chai & honey",
    body: "Tear, dip, repeat. Sometimes the simplest pairing is the most loved.",
    image:
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=1200&h=900&fit=crop",
  },
];

const heroImages = {
  hero: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1800&h=1000&fit=crop",
  stack:
    "https://images.unsplash.com/photo-1574653853027-5382a3d23a7d?w=1200&h=900&fit=crop",
  cooking:
    "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=1200&h=900&fit=crop",
};

export default function ChapatisPage() {
  return (
    <main className="bg-background text-foreground">
      <Navbar />

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div aria-hidden className="absolute inset-0 z-0">
          <Image
            src={heroImages.hero}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover opacity-40"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-950/90 to-slate-900/60" />
        <div className="relative z-10 mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              <Soup className="size-4" aria-hidden />
              Made by hand
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
              The art of the chapati
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl [font-family:var(--font-heading)]">
              Soft. Flaky. Golden.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              The unleavened flatbread that turns any meal into an occasion. Layered
              by hand, cooked on a hot pan, and best enjoyed warm with people you love.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#recipe"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                See how it&apos;s made
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="#pairings"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                What to serve it with
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative min-h-[280px] overflow-hidden rounded-[2rem] sm:row-span-2 sm:min-h-[420px]">
              <Image
                src={heroImages.stack}
                alt="A stack of warm chapatis"
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Fresh off the pan</p>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-[2rem]">
              <Image
                src={heroImages.cooking}
                alt="Chapati cooking on a hot pan"
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Golden blisters</p>
            </div>
            <div className="relative min-h-[180px] overflow-hidden rounded-[2rem]">
              <Image
                src={heroImages.hero}
                alt="Chapatis served at the table"
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-5 left-5 text-sm font-semibold">Better shared</p>
            </div>
          </div>
        </div>
      </section>

      <section id="recipe" className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              Three steps
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
              How the perfect chapati comes together.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              No fancy equipment, no shortcuts—just flour, patience, and a hot pan.
              Here&apos;s the rhythm every great cook keeps.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <step.icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold [font-family:var(--font-heading)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pairings" className="border-b border-border bg-muted/20 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Perfect pairings
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl [font-family:var(--font-heading)]">
              What to serve alongside.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pairings.map((pairing) => (
              <div
                key={pairing.name}
                className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={pairing.image}
                    alt={pairing.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold [font-family:var(--font-heading)]">
                    {pairing.name}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{pairing.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white sm:p-10 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Sparkles className="size-8 text-orange-400" aria-hidden />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
                Hungry yet?
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight [font-family:var(--font-heading)]">
                Roll up your sleeves and make a batch.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                There&apos;s nothing quite like a warm chapati straight off the pan.
                Gather the family, put the kettle on, and get rolling.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#recipe"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Start the recipe
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
