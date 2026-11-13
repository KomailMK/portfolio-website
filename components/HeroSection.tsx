"use client";
import React from "react";
import Image from "next/image";
import { ArrowDown, ArrowDownRight, ArrowUpRight } from "lucide-react";
import SplitText from "./SplitText";
import TextType from "./TextType";
export default function HeroSection() {
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
          <p className="handwritten">
            <SplitText
              tag="span"
              text="Hello, I'm"
              effect="rise"
              splitType="chars"
              delay={50}
              duration={1.25}
              staggerFrom="start"
              trigger="view"
              hoverEffect="lift"
              loop={false}
              loopDelay={1.5}
              mask={false}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
          </p>
          <h1
            className="hero-name"
            id="hero-name"
            aria-label="Komail Ahmad Khalil"
          >
            <SplitText
              tag="span"
              text="Komail"
              className="hero-name-line"
              effect="rise"
              splitType="chars"
              delay={50}
              duration={1.25}
              staggerFrom="start"
              trigger="view"
              hoverEffect="lift"
              touchHover
              loop={false}
              loopDelay={1.5}
              mask={false}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
            <SplitText
              tag="span"
              text="Ahmad Khalil"
              className="hero-name-line"
              effect="rise"
              splitType="chars"
              delay={50}
              duration={1.25}
              staggerFrom="start"
              trigger="view"
              hoverEffect="lift"
              touchHover
              loop={false}
              loopDelay={1.5}
              mask={false}
              threshold={0.1}
              rootMargin="-100px"
              textAlign="left"
            />
            <span className="name-period"></span>
          </h1>
          <p className="hero-role" data-build="type">
            Software Engineer <span className="hero-role-sep">·</span> Data Science &amp; AI Specialist
          </p>
          <TextType
            as="p"
            className="hero-bio"
            text={[
              "Welcome to my portfolio.\nGood to see you here!",
              "I build some amazing experiences",
              "Have fun while exploring",
            ]}
            typingSpeed={75}
            pauseDuration={1500}
            deletingSpeed={50}
            deleteMode="backspace"
            typeEffect="none"
            mistakes={0}
            cursorStyle="underscore"
            cursorGlide
            showCursor
            cursorColor="currentColor"
            prefixColor="currentColor"
            cursorBlinkDuration={0.5}
            cursorCharacter="_"
            prefix=""
          />
          <div className="hero-actions">
            <a className="button button-primary" href="#work" data-build="pop">
              View work <ArrowDownRight size={16} aria-hidden="true" />
            </a>
            <a
              className="text-link"
              href="mailto:komikhalils091@gmail.com"
              onClick={handleEmailClick}
              data-build="type"
            >
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
