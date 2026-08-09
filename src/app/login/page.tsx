"use client";
import { signIn } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">
          <Sparkles size={19} />
        </div>
        <p className="eyebrow">PRIVATE WARDROBE</p>
        <h1>
          Know what you own.
          <br />
          <i>Wear it well.</i>
        </h1>
        <p className="lead">
          A personal visual inventory, shaped around the clothes already in your life.
        </p>
        <Button
          onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
          className="google-button"
        >
          Continue with Google <span>→</span>
        </Button>
        <p className="fine-print">Your wardrobe is private to your account.</p>
      </section>
    </main>
  );
}
