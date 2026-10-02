import { useState, type ReactNode } from "react";
import { Heart, Inbox, Search, ShoppingBag, Sparkles } from "lucide-react";
import { ApiError } from "@/api/errors";
import { EmptyState } from "@/components/EmptyState";
import { LowStockBadge, NewBadge, OutOfStockBadge, SaleBadge } from "@/components/BookBadge";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { PasswordField, SelectField, TextAreaField, TextField } from "@/components/form/Field";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { CurrencySwitch } from "@/components/shell/CurrencySwitch";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton, SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rangeSummary } from "@/lib/pagination";
import { formatMoney, useCurrency } from "@/stores/currency";
import { toast } from "@/stores/toast";

/*
 * Living reference for the V2 UI kit (development builds only, /ui-kit).
 * Every component in its states, in both themes, so changes can be checked
 * against design-system/bookly/MASTER.md by eye and by keyboard.
 */

function Section({ id, title, spec, children }: { id: string; title: string; spec: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-header border-t border-border py-12 first:border-t-0">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="font-display text-[1.953rem] leading-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">MASTER {spec}</p>
      </div>
      {children}
    </section>
  );
}

const Row = ({ children, label }: { children: ReactNode; label?: string }) => (
  <div className="grid gap-2">
    {label ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p> : null}
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

const sections = [
  ["buttons", "Buttons"],
  ["fields", "Fields"],
  ["choices", "Choices"],
  ["badges", "Badges"],
  ["tabs", "Tabs"],
  ["overlays", "Dialog & drawer"],
  ["pagination", "Pagination"],
  ["loading", "Skeletons"],
  ["feedback", "Toasts & states"],
  ["motion", "Motion"],
] as const;

export default function UiKit() {
  const currency = useCurrency();
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(3);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const fakeLoad = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="container-shell py-12">
      <header className="grid max-w-3xl gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-text">Design system v3</p>
        <h1 className="font-display text-[2.441rem] leading-tight sm:text-[3.052rem]">UI kit</h1>
        <p className="text-lg text-muted-foreground">
          Every shared component in its states. Switch the theme and currency in the header, and try each control with the keyboard.
        </p>
        <nav aria-label="Sections" className="mt-2">
          <ul className="flex flex-wrap gap-2">
            {sections.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Section id="buttons" title="Buttons" spec="§6.1">
        <div className="grid gap-6">
          <Row label="Variants">
            <Button variant="cta">Add to cart</Button>
            <Button>Save changes</Button>
            <Button variant="outline">Cancel</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Remove</Button>
          </Row>
          <Row label="Sizes and icons">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline" aria-label="Add to wishlist">
              <Heart aria-hidden="true" />
            </Button>
            <Button variant="outline">
              <Search aria-hidden="true" /> With icon
            </Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="Loading">
            <Button loading={loading} onClick={fakeLoad}>
              {loading ? "Placing order…" : "Place order"}
            </Button>
          </Row>
          <div className="rounded-xl bg-lapis p-6">
            <Row>
              <Button variant="cta">Browse books</Button>
              <Button variant="on-lapis">See new arrivals</Button>
            </Row>
          </div>
        </div>
      </Section>

      <Section id="fields" title="Fields" spec="§6.2, §6.14">
        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <TextField label="Full name" autoComplete="name" placeholder="Sok Dara" />
          <TextField label="Email" type="email" autoComplete="email" error="Enter an email address like name@example.com." defaultValue="dara@" />
          <PasswordField label="Password" autoComplete="new-password" hint="At least 8 characters." />
          <TextField label="Phone" optional type="tel" autoComplete="tel" />
          <SelectField label="Province" defaultValue="">
            <option value="" disabled>
              Choose a province
            </option>
            <option>Phnom Penh</option>
            <option>Siem Reap</option>
            <option>Battambang</option>
          </SelectField>
          <div className="grid content-start gap-1.5">
            <span className="text-sm font-semibold" id="sort-label">
              Sort by (custom listbox)
            </span>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger aria-labelledby="sort-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Best match</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: low to high</SelectItem>
                <SelectItem value="price_desc">Price: high to low</SelectItem>
                <SelectItem value="rating">Best rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextAreaField label="Delivery note" optional containerClassName="sm:col-span-2" placeholder="Gate code, landmark…" />
        </div>
      </Section>

      <Section id="choices" title="Checkbox, radio, switch" spec="§6.15">
        <div className="grid gap-8 sm:grid-cols-3">
          <fieldset className="grid gap-1">
            <legend className="mb-2 text-sm font-semibold">Formats</legend>
            {["Hardcover", "Paperback", "Ebook"].map((format, i) => (
              <label key={format} className="flex min-h-11 cursor-pointer items-center gap-3">
                <Checkbox defaultChecked={i === 0} /> {format}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-3 opacity-60">
              <Checkbox disabled /> Audiobook (none in stock)
            </label>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Payment</legend>
            <RadioGroup defaultValue="cod" aria-label="Payment">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <RadioGroupItem value="cod" /> Cash on delivery
              </label>
              <label className="flex min-h-11 items-center gap-3 text-muted-foreground">
                <RadioGroupItem value="card" disabled /> Card (coming soon)
              </label>
              <label className="flex min-h-11 items-center gap-3 text-muted-foreground">
                <RadioGroupItem value="khqr" disabled /> Bakong KHQR (coming soon)
              </label>
            </RadioGroup>
          </fieldset>
          <div className="grid content-start gap-1">
            <p className="mb-2 text-sm font-semibold">Filters</p>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              In stock only <Switch defaultChecked />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
              Show ebooks <Switch />
            </label>
          </div>
        </div>
      </Section>

      <Section id="badges" title="Badges" spec="§6.3">
        <div className="grid gap-6">
          <Row label="Book">
            <SaleBadge label="Sale −20%" />
            <NewBadge />
            <LowStockBadge remaining={3} />
            <OutOfStockBadge />
          </Row>
          {(["tint", "solid", "outline"] as const).map((shape) => (
            <Row key={shape} label={shape}>
              <Badge shape={shape} tone="neutral">Neutral</Badge>
              <Badge shape={shape} tone="info">Info</Badge>
              <Badge shape={shape} tone="success">Delivered</Badge>
              <Badge shape={shape} tone="warning">Pending</Badge>
              <Badge shape={shape} tone="danger">Rejected</Badge>
            </Row>
          ))}
          <Row label="Count">
            <span className="relative inline-grid size-11 place-items-center rounded-lg border border-border">
              <ShoppingBag className="size-5" aria-hidden="true" />
              <CountBadge count={3} className="absolute right-0.5 top-0.5" />
            </span>
            <CountBadge count={120} />
          </Row>
        </div>
      </Section>

      <Section id="tabs" title="Tabs" spec="§6.16">
        <Tabs defaultValue="description" className="max-w-2xl">
          <TabsList aria-label="Book information">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reviews">Reviews (128)</TabsTrigger>
          </TabsList>
          <TabsContent value="description">
            <p className="text-muted-foreground">A sweeping story told across three generations of a Phnom Penh family.</p>
          </TabsContent>
          <TabsContent value="details">
            <p className="text-muted-foreground">Paperback · 384 pages · English · ISBN 978-0-00-000000-0</p>
          </TabsContent>
          <TabsContent value="reviews">
            <p className="text-muted-foreground">Rated 4.5 out of 5 from 128 reviews.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section id="overlays" title="Dialog & drawer" spec="§6.17, §6.18">
        <Row>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit address</DialogTitle>
                <DialogDescription>Changes apply to future orders only.</DialogDescription>
              </DialogHeader>
              <div className="mt-6 grid gap-4">
                <TextField label="Street" autoComplete="street-address" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Save address</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Remove address…
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Remove this address?"
            description="Orders already placed keep their delivery address."
            confirmLabel="Remove address"
            loading={confirmBusy}
            onConfirm={() => {
              setConfirmBusy(true);
              window.setTimeout(() => {
                setConfirmBusy(false);
                setConfirmOpen(false);
                toast.success("Address removed");
              }, 900);
            }}
          />
          {(["right", "left", "bottom"] as const).map((side) => (
            <Drawer key={side}>
              <DrawerTrigger asChild>
                <Button variant="outline">
                  Drawer: {side}
                </Button>
              </DrawerTrigger>
              <DrawerContent side={side} aria-describedby={undefined}>
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                </DrawerHeader>
                <DrawerBody className="grid content-start gap-2">
                  {["Fiction", "History", "Children", "Science"].map((c) => (
                    <label key={c} className="flex min-h-11 items-center gap-3">
                      <Checkbox /> {c}
                    </label>
                  ))}
                </DrawerBody>
                <DrawerFooter>
                  <Button className="w-full">Show 42 books</Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ))}
        </Row>
      </Section>

      <Section id="pagination" title="Pagination" spec="§6.8">
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{rangeSummary((page - 1) * 24 + 1, Math.min(page * 24, 286), 286, "books")}</p>
          <Pagination page={page} lastPage={12} onPageChange={setPage} />
          <Pagination page={1} lastPage={5} hrefFor={(p) => `/ui-kit?page=${p}#pagination`} />
        </div>
      </Section>

      <Section id="loading" title="Skeletons" spec="§6.11">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
          <SkeletonGroup label="Loading books…" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </SkeletonGroup>
          <SkeletonGroup label="Loading cart…" className="grid content-start gap-5">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow thumb="circle" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </SkeletonGroup>
        </div>
      </Section>

      <Section id="feedback" title="Toasts & states" spec="§6.5, §6.6, §6.22">
        <div className="grid gap-8">
          <Row label="Toasts">
            <Button variant="outline" onClick={() => toast.success({ title: "Added to cart", description: "The Rice Mother · Paperback", action: { label: "View cart", href: "/cart" } })}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast.info("Prices now show in riel")}>
              Info
            </Button>
            <Button variant="outline" onClick={() => toast.error({ title: "Couldn't place your order", description: "Only 2 copies are left. Lower the quantity and try again." })}>
              Error (stays)
            </Button>
          </Row>
          <InlineError error={new ApiError({ kind: "server", status: 500, message: "Reviews couldn't load right now." })} onRetry={() => toast.info("Retrying…")} />
          <div className="grid gap-6 rounded-xl border border-border md:grid-cols-3">
            <EmptyState icon={Inbox} headingLevel="h3" title="Nothing saved yet" description="Tap the heart on any book to keep it here for later." action={<Button>Discover books</Button>} />
            <ErrorState headingLevel="h3" error={new ApiError({ kind: "network", message: "offline" })} onRetry={() => undefined} showHomeLink={false} />
            <ErrorState
              headingLevel="h3"
              error={new ApiError({ kind: "server", status: 500, message: "The server had a problem. Please try again.", requestId: "9f3c2a71" })}
              onRetry={() => undefined}
            />
          </div>
        </div>
      </Section>

      <Section id="motion" title="Motion" spec="§5">
        <div className="grid gap-6">
          <Row label="Currency">
            <CurrencySwitch />
            <span className="text-lg font-semibold tabular-nums">{formatMoney("12.50", "51250", currency)}</span>
          </Row>
          <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-4" as="div">
            {Array.from({ length: 8 }, (_, i) => (
              <StaggerItem key={i} index={i} className="grid aspect-[2/3] place-items-center rounded-sm bg-lapis-tint text-primary">
                <Sparkles aria-hidden="true" />
                <span className="sr-only">Item {i + 1}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Section>
    </div>
  );
}
