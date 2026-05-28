"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, CheckCircle2, ArrowRight } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVerified(true);
      localStorage.setItem("datalens-user", JSON.stringify({ email: "magic-user@datalens.ai", name: "Magic Analyst" }));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-surface2 dark:bg-gray-950 font-sans relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4 text-brand">
          {verified ? <CheckCircle2 className="w-7 h-7" /> : <Mail className="w-7 h-7 animate-pulse" />}
        </div>
        
        <h2 className="text-2xl font-extrabold text-text-primary">
          {verified ? "Magic Link Verified!" : "Check your Inbox"}
        </h2>
        
        <p className="mt-2 text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
          {verified 
            ? "Your identity has been authenticated successfully. Jumps you into the console workspace." 
            : "We sent a passwordless sign-in link to your work email. Click the verification link to log in directly."}
        </p>

        {verified ? (
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 py-2.5 px-6 bg-brand hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow inline-flex items-center gap-1.5 transition-all"
          >
            Enter DataLens Console
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-tertiary">
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
            Waiting for verification signal...
          </div>
        )}
      </div>
    </div>
  );
}
