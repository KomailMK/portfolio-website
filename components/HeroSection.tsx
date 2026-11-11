"use client";
import React from "react";
import Image from "next/image";
import { ArrowDown, ArrowDownRight, ArrowUpRight } from "lucide-react";
export default function HeroSection() {
  return (
    <header className="hero pt-16 sm:pt-20" id="top">
      <div className="hero-noise" aria-hidden="true" />
      <p className="hero-giant" data-build="wipe" aria-hidden="true">
        PORTFOLIO
      </p>
      <div className="hero-photo-glow" data-build="pop" aria-hidden="true" />
      <div className="hero-portrait" data-build="pop">
        <Image
          src="/headshot.png"
          alt="Portrait of Komail Ahmad Khalil"
          fill
          priority
          sizes="(max-width: 700px) 90vw, 58vw"
          className="portrait-image"
        />
        <span className="portrait-bottom-fade" aria-hidden="true" />
      </div>

      <div className="hero-content">
        <section className="hero-intro" aria-labelledby="hero-name">
          <p className="handwritten" data-build="type">
            Hello, I&apos;m
          </p>
          <h1
            className="hero-name"
            id="hero-name"
            aria-label="Komail Ahmad Khalil"
            data-build="type"
          >
            Komail
            <br />
            Ahmad Khalil<span className="name-period"></span>
          </h1>
          <p className="hero-role" data-build="type">
            Software Engineer <span className="hero-role-sep">·</span> Data Science &amp; AI Specialist
          </p>
          <p className="hero-bio" data-build="type">
            I build full-stack products and applied AI for real-world healthcare
            challenges.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work" data-build="pop">
              View work <ArrowDownRight size={16} aria-hidden="true" />
            </a>
            <a className="text-link" href="#contact" data-build="type">
              <span>Get in touch</span> <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="location-line" data-build="type">
            <span className="location-marker" aria-hidden="true" />
            <span>Based in Peshawar, Pakistan</span>
          </p>
        </section>

        <aside className="hero-stats" aria-label="At a glance">
          <p className="stats-eyebrow" data-build="type">
            A LITTLE CONTEXT
          </p>
          <div className="hero-stat">
            <span className="hero-stat-value" data-build="type">
              Software Engineer
            </span>
            <span className="hero-stat-label" data-build="type">
              Khyber College of Dentistry
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value" data-build="type">DOST</span>
            <span className="hero-stat-label" data-build="type">
              Provincial research support grant
            </span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value" data-build="type">2026</span>
            <span className="hero-stat-label" data-build="type">
              Research &amp; engineering
            </span>
          </div>
        </aside>
      </div>

      <a className="hero-scroll" href="#work" data-build="type">
        <span>SCROLL TO EXPLORE</span> <ArrowDown size={13} aria-hidden="true" />
      </a>
      <span className="hero-index" data-build="type" aria-hidden="true">
        <span>01 / 05</span>
      </span>
    </header>
  );
}
