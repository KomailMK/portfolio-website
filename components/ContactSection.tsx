"use client";

import React, { type ReactNode } from "react";
import { Mail, Linkedin, ArrowUpRight, ArrowDownRight } from "lucide-react";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="section-label" data-build="type">
      <span className="label-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function ContactSection() {
  const handleEmailClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }
    const isMobile =
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    if (!isMobile) {
      e.preventDefault();
      window.open(
        "https://mail.google.com/mail/?view=cm&fs=1&to=komikhalils091@gmail.com",
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <section className="section contact-section" id="contact" aria-labelledby="contact-heading">
      <SectionLabel>THE NEXT CHAPTER</SectionLabel>
      <div className="contact-card" data-build="pop">
        <div className="contact-card-glow" aria-hidden="true" />
        <div className="contact-copy">
          <span className="contact-overline" data-build="type">HAVE A GOOD CHALLENGE?</span>
          <h2 id="contact-heading" data-build="type">
            Let&apos;s make
            <br />
            something matter<span className="accent-period">.</span>
          </h2>
          <p data-build="type">Reach out for conversations about software, applied AI, and research.</p>
          <a
            className="button button-primary contact-button"
            href="mailto:komikhalils091@gmail.com"
            onClick={handleEmailClick}
            data-build="pop"
          >
            <Mail size={16} aria-hidden="true" />
            Send me an email <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="contact-side">
          <span className="contact-side-mark" data-build="pop" aria-hidden="true">
            <ArrowDownRight size={52} strokeWidth={0.75} />
          </span>
          <span className="contact-location" data-build="type">
            <span className="location-marker" aria-hidden="true" />
            <span>Peshawar, Pakistan</span>
          </span>
        </div>
      </div>

      <footer className="site-footer">
        <a className="footer-brand" href="#top" data-build="type">MK</a>
        <span className="footer-note" data-build="type" style={{ fontSize: '10px', lineHeight: '1.5' }}>
          Data Science & AI Specialist
        </span>
        <div className="footer-links" data-build="pop">
          <a
            href="mailto:komikhalils091@gmail.com"
            onClick={handleEmailClick}
            aria-label="Email Komail Ahmad Khalil"
            title="Email"
          >
            <Mail size={17} />
          </a>
          <a
            href="https://linkedin.com/in/get-in-touch-with-komail-ahmad"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            title="LinkedIn"
          >
            <Linkedin size={17} />
          </a>
          <a href="#top" className="back-to-top" aria-label="Back to top" title="Back to top">
            <ArrowUpRight size={17} />
          </a>
        </div>
        <span className="footer-credit" data-build="type">BUILT WITH INTENTION</span>
      </footer>
    </section>
  );
}
