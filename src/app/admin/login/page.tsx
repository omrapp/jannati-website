import { LoginForm } from './login-form';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold">Jannati Admin</h1>
        <p className="text-muted-foreground text-sm">Staff sign-in</p>
      </header>

      <LoginForm />
    </div>
  );
}
