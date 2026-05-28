"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Mail, Lock, Chrome, Github, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isMagic, setIsMagic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (isMagic) {
        toast.success("Magic Link sent successfully!", {
          description: "Check your email inbox to log in automatically.",
        });
        router.push("/auth/verify");
      } else {
        if (!password) {
          toast.error("Password required for standard log in.");
          return;
        }
        localStorage.setItem("datalens-user", JSON.stringify({ email, name: "Power Analyst" }));
        toast.success("Successfully logged in!");
        router.push("/dashboard");
      }
    }, 1500);
  };

  const handleOAuth = (provider: string) => {
    toast.loading(`Connecting to ${provider} OAuth...`, { id: "oauth" });
    setTimeout(() => {
      localStorage.setItem("datalens-user", JSON.stringify({ email: `oauth-${provider.toLowerCase()}@datalens.ai`, name: `${provider} User` }));
      toast.success(`Successfully authenticated via ${provider}!`, { id: "oauth" });
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface2 dark:bg-gray-950 font-sans relative overflow-hidden">
      {/* Visual background details */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100/20 via-transparent to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto shadow-md">
          <Layers className="w-7 h-7 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-text-primary">
          Sign in to DataLens
        </h2>
        <p className="mt-1.5 text-xs text-text-tertiary">
          Or{" "}
          <a href="/auth/register" className="font-bold text-brand hover:underline">
            create a new professional account
          </a>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white dark:bg-gray-900 py-8 px-4 border border-border/80 shadow-card-lg rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleEmailLogin}>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input pl-9.5 py-3"
                  required
                />
              </div>
            </div>

            {!isMagic && (
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-9.5 py-3"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-1 text-xs">
              <button
                type="button"
                onClick={() => setIsMagic(!isMagic)}
                className="font-bold text-brand hover:underline"
              >
                {isMagic ? "Use standard Password instead" : "Send Magic Sign-in Link"}
              </button>
              <a href="#" className="text-text-tertiary hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              {loading ? (
                "Authenticating credentials..."
              ) : (
                <>
                  {isMagic ? "Send Magic Verification Link" : "Log in to Workspace"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Sign In Divider */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 border-t" />
              <span className="relative px-3 bg-white dark:bg-gray-900 text-[10px] uppercase font-bold text-text-tertiary">
                Or authorize with oauth providers
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuth("Google")}
                className="py-2.5 px-4 border rounded-xl flex items-center justify-center gap-2 hover:bg-muted/40 transition-colors text-xs font-bold text-text-primary"
              >
                <Chrome className="w-4 h-4 text-red-500" />
                Google
              </button>
              <button
                onClick={() => handleOAuth("GitHub")}
                className="py-2.5 px-4 border rounded-xl flex items-center justify-center gap-2 hover:bg-muted/40 transition-colors text-xs font-bold text-text-primary"
              >
                <Github className="w-4 h-4 text-black dark:text-white" />
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
