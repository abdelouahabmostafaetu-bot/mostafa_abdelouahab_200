'use client';

import { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle, ArrowRight } from 'lucide-react';
import emailjs from '@emailjs/browser';

// ============================================================
// TODO: Replace these placeholders with your real EmailJS IDs
// 1. Go to https://www.emailjs.com/ and create a free account
// 2. Add an email service (Gmail, Outlook, etc.) → copy SERVICE_ID
// 3. Create an email template → copy TEMPLATE_ID
// 4. Go to Account → copy your PUBLIC_KEY
// ============================================================
const EMAILJS_SERVICE_ID = 'service_23v7xkn';
const EMAILJS_TEMPLATE_ID = 'template_v0pz5co';
const EMAILJS_PUBLIC_KEY = 'e5WN5YFhN6mFynUwJ';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
        EMAILJS_PUBLIC_KEY
      );

      setStatus('sent');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-12 fade-in-up">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-accent)] font-medium mb-3">
            Reach Out
          </p>
          <h1
            className="text-3xl md:text-5xl font-semibold text-[var(--color-text)] mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Get in Touch
          </h1>
          <p className="max-w-2xl text-[var(--color-text-secondary)] text-[0.95rem] leading-7">
            Feel free to reach out for collaborations, questions, or to say hello.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            <a
              href="mailto:mostafaabdelouahab.etu@centre-univ-mila.dz"
              className="group flex items-center gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all duration-200 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="rounded-2xl bg-[var(--color-bg)] p-3 text-[var(--color-accent)]">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] mb-1">Email</p>
                <p className="text-sm text-[var(--color-text)] truncate font-medium">
                  mostafaabdelouahab.etu@centre-univ-mila.dz
                </p>
              </div>
            </a>
            <div className="flex items-center gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="rounded-2xl bg-[var(--color-bg)] p-3 text-[var(--color-accent)]">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] mb-1">Location</p>
                <p className="text-sm text-[var(--color-text)] font-medium">University of Mila, Algeria</p>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                Notes
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                Use the form for collaboration requests, questions about a post, or general academic contact.
              </p>
            </div>
          </div>

        <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
          {status === 'sent' ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                Message Sent Successfully
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs mx-auto">
                Thank you for reaching out. I&apos;ll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="group inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-light)] transition-colors duration-200 font-medium"
              >
                Send another message
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] resize-none"
                  placeholder="Your message..."
                />
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Something went wrong. Please try again or email me directly.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-[var(--color-text)] px-6 py-3 text-sm font-medium text-[var(--color-bg)] transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              >
                <Send size={15} />
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
