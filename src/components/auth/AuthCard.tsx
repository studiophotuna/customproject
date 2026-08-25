import { Container } from "@/components/ui/Container";

/** Centered card used by the customer login and register pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="flex justify-center py-16">
      <div className="w-full max-w-sm rounded-card border border-line bg-background p-8 shadow-sm">
        <h1 className="section-title text-center text-2xl uppercase text-brand">{title}</h1>
        {subtitle && <p className="mb-6 mt-2 text-center text-sm text-muted">{subtitle}</p>}
        <div className={subtitle ? "" : "mt-6"}>{children}</div>
      </div>
    </Container>
  );
}
