"use client";
import React, { type ReactNode } from "react";
const tools = [
  "Python",
  "JavaScript",
  "TypeScript",
  "HTML/CSS",
  "SQL",
  "React",
  "Next.js",
  "Node.js",
  "Flask",
  "FastAPI",
  "RESTful APIs",
  "MySQL",
  "Deep Learning",
  "Federated Learning",
  "Vision-Language Models",
  "YOLOv8",
  "RAG pipelines",
  "LangChain",
  "NLP",
  "PyTorch",
  "TensorFlow",
  "OpenCV",
  "Scikit-Learn",
  "ONNX",
  "Git",
  "Web Deployment",
  "Postman",
  "CI/CD",
  "Agile Methodologies",
  "Pandas",
  "NumPy",
];
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="section-label" data-build="type">
      <span className="label-dot" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
export default function StackMarquee() {
  return (
    <section className="stack-section" id="stack" aria-labelledby="stack-heading">
      <div className="section stack-intro">
        <div className="section-heading-row">
          <div className="section-heading-main">
            <SectionLabel>TOOLS OF THE TRADE</SectionLabel>
            <h2 className="section-heading" id="stack-heading" data-build="type">
              My stack<span className="accent-period">.</span>
            </h2>
            <p className="section-lede" data-build="type">
              Every tool listed on my resume, all in one place.
            </p>
          </div>
        </div>
      </div>
      <div className="marquee-viewport" data-build="pop">
        <div className="marquee-track">
          {[...tools, ...tools].map((tool, index) => (
            <span className="marquee-item" key={`${tool}-${index}`}>
              <span className="marquee-star" aria-hidden="true">
                ✳
              </span>
              {tool}
            </span>
          ))}
        </div>
      </div>
      <div className="section stack-categories">
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">01 / LANGUAGES</span>
          <p data-build="type">Python · JavaScript · TypeScript · HTML/CSS · SQL</p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">02 / WEB</span>
          <p data-build="type">React · Next.js · Node.js · Flask · FastAPI · RESTful APIs · MySQL</p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">03 / AI &amp; ML</span>
          <p data-build="type">
            Deep Learning · Federated Learning · VLMs · YOLOv8 · RAG · LangChain ·
            NLP · PyTorch · TensorFlow · OpenCV · Scikit-Learn · ONNX
          </p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">04 / WORKFLOWS</span>
          <p data-build="type">Git · Web Deployment · Postman · CI/CD · Agile · Pandas · NumPy</p>
        </div>
      </div>
    </section>
  );
}
