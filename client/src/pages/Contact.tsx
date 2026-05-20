import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const notify = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      toast.error("Failed to send message. Please email us directly at hello@blastly.ai");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    notify.mutate({
      title: `New Contact: ${form.subject || "General Enquiry"} from ${form.name}`,
      content: `Name: ${form.name}\nEmail: ${form.email}\nSubject: ${form.subject || "General Enquiry"}\n\nMessage:\n${form.message}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src="/manus-storage/blastly-icon-512_d2809e7c.png" alt="Blastly" className="h-12 w-12 rounded-xl object-cover cursor-pointer" />
              <span className="text-2xl font-black tracking-tight">Blastly</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Contact Us</h1>
        </div>
        <p className="text-muted-foreground mb-8">We'd love to hear from you. Send us a message and we'll get back to you within 24 hours.</p>

        {submitted ? (
          <div className="text-center py-16">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Message sent!</h2>
            <p className="text-muted-foreground mb-6">Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> within 24 hours.</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Question about Pro plan, Technical issue..."
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
              <Textarea
                id="message"
                placeholder="Tell us how we can help..."
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-0 hover:opacity-90"
              disabled={notify.isPending}
            >
              {notify.isPending ? "Sending..." : "Send Message"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}

        {/* Direct contact info */}
        <div className="mt-10 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            Prefer email? Reach us directly at{" "}
            <a href="mailto:hello@blastly.ai" className="text-blue-600 hover:underline font-medium">
              <Mail className="w-3 h-3 inline mr-1" />hello@blastly.ai
            </a>
          </p>
        </div>
      </div>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground mt-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/"><img src="/manus-storage/blastly-icon-512_d2809e7c.png" alt="Blastly" className="h-8 w-auto object-contain" /></Link>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <p>© 2026 Blastly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
