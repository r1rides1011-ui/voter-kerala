"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: any) {
    e.preventDefault();
    await signIn("credentials", {
      username,
      password,
      callbackUrl: "/",
    });
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md px-4"
      >
        <GlassCard className="p-8 border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your credentials to access the system
            </p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">
                Username
              </label>
              <input
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter your username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">
                Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-5px_var(--primary)] transition-all duration-300"
              type="submit"
            >
              Login
            </Button>

            <p className="text-center text-muted-foreground text-xs mt-4">
              Need help? <span className="text-primary cursor-pointer hover:underline">Contact Admin</span>
            </p>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
