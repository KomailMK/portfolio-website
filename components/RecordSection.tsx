"use client";
import React, { type ReactNode } from "react";
import { Sparkles } from "lucide-react";
const experience = [
  {
    period: "Jun 2026 — Present",
    role: "Software Engineer",
    organization: "Khyber College of Dentistry",
    details: [
      "Building software for clinical workflows, patient data management, and hospital operations.",
      "Working with healthcare teams on secure, scalable web applications.",
      "Optimizing system architecture for availability and low-latency performance.",
    ],
  },
  {
    period: "Nov 2025 — Nov 2026",
    role: "Full Stack Developer",
    organization: "University of Engineering & Technology (UET) Mardan",
    details: [
      "Led the redesign and full-stack development of the official university web portal.",
      "The portal won a university-wide web design competition.",
      "Moved the platform from a static prototype to a responsive, database-driven application.",
    ],
  },
  {
    period: "Dec 2024 — May 2025",
    role: "AI & Data Science Intern",
    organization: "AI and Data Science Career Launchpad Program",
    details: [
      "Engineered predictive healthcare solutions, including anemia detection and heart disease prediction.",
      "Built end-to-end machine learning pipelines with Python, Pandas, and Scikit-Learn.",
      "Contributed to research tasks, technical reports, and presentations.",
    ],
  },
];
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="section-label" data-build="type">
      <span className="label-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
export default function RecordSection() {
  return (
    <section className="section record-section" id="record" aria-labelledby="record-heading">
      <div className="section-heading-row">
        <div className="section-heading-main">
          <SectionLabel>THE RECORD</SectionLabel>
          <h2 className="section-heading" id="record-heading" data-build="type">
            Built over time<span className="accent-period">.</span>
          </h2>
          <p className="section-lede" data-build="type">
            Experience, research, and education: one step at a time.
          </p>
        </div>
        <span className="record-mark" data-build="pop" aria-hidden="true">
          <Sparkles size={24} strokeWidth={1.2} />
        </span>
      </div>
      <div className="timeline">
        {experience.map((item, index) => (
          <article className="timeline-entry" key={item.role}>
            <div className="timeline-date" data-build="type">{item.period}</div>
            <span className="timeline-node" data-build="pop" aria-hidden="true" />
            <div className="timeline-content">
              <span className="timeline-type" data-build="type">EXPERIENCE / 0{index + 1}</span>
              <h3 data-build="type">{item.role}</h3>
              <p className="timeline-organization" data-build="type">{item.organization}</p>
              <ul className="timeline-points">
                {item.details.map((detail) => (
                  <li key={detail} data-build="type">{detail}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
        <article className="timeline-entry">
          <div className="timeline-date" data-build="type">2026</div>
          <span className="timeline-node" data-build="pop" aria-hidden="true" />
          <div className="timeline-content">
            <span className="timeline-type" data-build="type">RESEARCH / RECOGNITION</span>
            <h3 data-build="type">Undergraduate Research Support grant</h3>
            <p className="timeline-organization" data-build="type">DOST Peshawar</p>
            <p className="timeline-copy" data-build="type">
              Provincial support for the Real-Time Crime &amp; Incident Detection
              research project.
            </p>
          </div>
        </article>
        <article className="timeline-entry">
          <div className="timeline-date" data-build="type">Jun 2026</div>
          <span className="timeline-node" data-build="pop" aria-hidden="true" />
          <div className="timeline-content">
            <span className="timeline-type" data-build="type">EDUCATION / 04</span>
            <h3 data-build="type">Bachelor of Science in Computer Science</h3>
            <p className="timeline-organization" data-build="type">
              Data Science track · University of Engineering &amp; Technology (UET)
              Mardan
            </p>
          </div>
        </article>
        <article className="timeline-entry">
          <div className="timeline-date" data-build="type">Jul 2022</div>
          <span className="timeline-node" data-build="pop" aria-hidden="true" />
          <div className="timeline-content">
            <span className="timeline-type" data-build="type">EDUCATION / 05</span>
            <h3 data-build="type">FSc / High School in Computer Science</h3>
            <p className="timeline-organization" data-build="type">Capital Degree College</p>
          </div>
        </article>
      </div>
    </section>
  );
}
