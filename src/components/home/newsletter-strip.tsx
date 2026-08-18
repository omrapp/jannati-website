import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Decorative only — there's no email-capture backend yet (out of Phase 5
 * scope), so the input is `disabled` rather than wired to a fake submit.
 * An honest "coming soon" beats a form that silently does nothing.
 */
export function NewsletterStrip({
  title,
  subtitle,
  placeholder,
  comingSoon,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  comingSoon: string;
}) {
  return (
    <section className="bg-secondary/40 flex flex-col items-center gap-3 rounded-lg px-6 py-10 text-center">
      <h2 className="font-display text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{subtitle}</p>
      <div className="mt-2 flex w-full max-w-sm gap-2">
        <Label htmlFor="newsletter-email" className="sr-only">
          {placeholder}
        </Label>
        <Input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={placeholder}
          disabled
          className="bg-background"
        />
      </div>
      <p className="text-muted-foreground text-xs">{comingSoon}</p>
    </section>
  );
}
