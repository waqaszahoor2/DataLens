"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all input fields.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("datalens-user", JSON.stringify({ email, name }));
      toast.success("Account successfully created!", {
        description: "Welcome to DataLens! Setting up default workspace...",
      });
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface2 dark:bg-gray-950 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100/20 via-transparent to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mx-auto shadow-md">
          <Layers className="w-7 h-7 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-text-primary">
          Create professional account
        </h2>
        <p className="mt-1.5 text-xs text-text-tertiary">
          Already have an account?{" "}
          <a href="/auth/login" className="font-bold text-brand hover:underline">
            Sign in here
          </a>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white dark:bg-gray-900 py-8 px-4 border border-border/80 shadow-card-lg rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input pl-9.5 py-3"
                  required
                />
              </div>
            </div>

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

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Create Strong Password
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

            <div className="flex items-start text-xs pt-1 text-text-secondary">
              <input type="checkbox" className="mt-0.5 mr-2 rounded border-border" required />
              <span>
                I agree to the terms and privacy conditions, and consent to anonymous usage analytics under GDPR policies.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            >
              {loading ? (
                "Creating profile space..."
              ) : (
                <>
                  Register & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
