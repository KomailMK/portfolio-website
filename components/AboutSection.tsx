"use client";
import React, { type ReactNode } from "react";
const skills = [
  {
    group: "Build",
    items: "Full-stack development · Responsive web apps · RESTful APIs · Database-driven products",
  },
  {
    group: "Applied AI",
    items: "Multimodal fusion architecture · Cross-attention transformers · Retrieval-augmented generation (RAG) · Vision-language model fine-tuning · Large language model distillation",
  },
  {
    group: "Machine learning",
    items: "Retrieval-augmented generation (RAG) · Knowledge distillation & compression · Federated learning · Meta-learning & few-shot adaptation",
  },
  {
    group: "Ways of working",
    items: "Cross-functional collaboration · Research · Technical reporting · Agile",
  },
];
const principles = [
  {
    number: "01",
    title: "Make complexity useful.",
    body: "Turn complex technical requirements into intuitive, reliable digital products.",
  },
  {
    number: "02",
    title: "Build with care.",
    body: "Treat privacy, data security, and system reliability as part of the product.",
  },
  {
    number: "03",
    title: "Stay close to the problem.",
    body: "Work alongside domain teams to build for real clinical and operational needs.",
  },
  {
    number: "04",
    title: "Learn through research.",
    body: "Pair practical engineering with careful experimentation and evaluation.",
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
export default function AboutSection() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-heading">
      <div className="section about-wrap">
        <div className="about-main">
          <SectionLabel>A LITTLE ABOUT ME</SectionLabel>
          <h2 className="section-heading" id="about-heading" data-build="type">
            Thoughtful by design<span className="accent-period">.</span>
          </h2>
          <div className="about-copy">
            <p data-build="type">
              I&apos;m a software engineer and data science specialist based in
              Peshawar, Pakistan. My work spans full-stack development, applied AI,
              and machine learning from secure clinical software to computer vision
              and language systems.
            </p>
            <p data-build="type">
              I translate complex technical requirements into dependable products,
              collaborate across disciplines, and ground new ideas in research and
              careful evaluation.
            </p>
          </div>
          <div className="skills-panel">
            <div className="subsection-title" data-build="type">
              <span>THE TOOLKIT</span>
              <span className="subsection-rule" aria-hidden="true" />
            </div>
            <div className="skills-grid">
              {skills.map((skill) => (
                <div className="skill-cell" key={skill.group}>
                  <span data-build="type">{skill.group}</span>
                  <p data-build="type">{skill.items}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="principles-panel">
          <div className="subsection-title" data-build="type">
            <span>WHAT I BELIEVE</span>
            <span className="subsection-rule" aria-hidden="true" />
          </div>
          {principles.map((principle) => (
            <article className="principle" key={principle.number}>
              <span className="principle-number" data-build="type">{principle.number}</span>
              <div>
                <h3 data-build="type">{principle.title}</h3>
                <p data-build="type">{principle.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
