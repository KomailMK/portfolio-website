"use client";
import React, { type ReactNode } from "react";
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
      <div className="section stack-categories">
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">01 / LANGUAGES</span>
          <p data-build="type">Python · JavaScript · TypeScript · Go (Golang) · Kotlin · Rust · Swift · HTML/CSS · SQL</p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">02 / WEB</span>
          <p data-build="type">React · Next.js · Node.js · Flask · FastAPI · Gin / Fiber · Actix-web / Axum · RESTful APIs · MySQL</p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">03 / AI &amp; ML</span>
          <p data-build="type">
            Deep Learning · Federated Learning · VLMs · YOLOv8 · RAG · LangChain · NLP · PyTorch · TensorFlow · OpenCV · Scikit-Learn · ONNX
          </p>
        </div>
        <div className="stack-category">
          <span className="stack-category-label" data-build="type">04 / WORKFLOWS</span>
          <p data-build="type">Git · Web Deployment · Postman · CI/CD · Agile</p>
        </div>
      </div>
    </section>
  );
}
