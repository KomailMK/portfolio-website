"use client";
import React, { type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

interface ProjectLink {
  label: string;
  url: string;
}
interface Project {
  index: string;
  title: string;
  category: string;
  date: string;
  description: string[];
  stack: string[];
  link?: ProjectLink;
}
const projects: Project[] = [
  {
    index: "01",
    title: "Federated Vision-Language Models for 3D Brain Tumor Segmentation",
    category: "Research · Medical imaging",
    date: "2026",
    description: [
      "Designed a privacy-preserving 3D medical imaging pipeline across heterogeneous clinical institutions.",
      "Applied deep learning, federated learning, and vision-language models.",
      "Co-authored a manuscript evaluating model accuracy and robustness; it is under academic peer review.",
    ],
    stack: ["Deep Learning", "Federated Learning", "Vision-Language Models"],
    link: {
      label: "Research Manuscript [Under Review]",
      url: "#contact",
    },
  },
  {
    index: "02",
    title: "Real-Time Crime & Incident Detection Using AI",
    category: "Research · Computer vision",
    date: "Jan 2026 — Jun 2026",
    description: [
      "Built a computer vision system to detect weapons and fire or smoke in live CCTV feeds.",
      "Used custom-trained YOLOv8 models for real-time threat detection.",
      "Received a provincial Undergraduate Research Support grant from DOST Peshawar; the research paper is under review.",
    ],
    stack: ["YOLOv8", "Computer Vision", "CCTV"],
    link: {
      label: "DOST Grant Report",
      url: "#contact",
    },
  },
  {
    index: "03",
    title: "AI-Based Anemia Detection Application",
    category: "Healthcare · Applied AI",
    date: "Apr 2025 — Nov 2026",
    description: [
      "Co-developed a diagnostic web app combining clinical test data with RGB pixel analysis of ocular images.",
      "Built a real-time prediction pipeline with Flask and optimized ONNX models.",
      "Focused on low-latency diagnostic inference for end users.",
    ],
    stack: ["Flask", "ONNX", "Python"],
    link: {
      label: "Diagnostic Pipeline Spec",
      url: "#contact",
    },
  },
  {
    index: "04",
    title: "Multilingual RAG Application",
    category: "Independent project · Applied AI",
    date: "2026",
    description: [
      "Independently engineered a multilingual retrieval-augmented generation system.",
      "Used LLMs, LangChain, and FastAPI.",
      "Built the system to deliver accurate, context-aware AI interactions.",
    ],
    stack: ["LLMs", "LangChain", "FastAPI"],
    link: {
      label: "RAG Architecture",
      url: "#contact",
    },
  },
  {
    index: "05",
    title: "Property Hub Pakistan",
    category: "Independent project · Full stack",
    date: "2026",
    description: [
      "Developed a full-stack real estate marketplace.",
      "Integrated MySQL for data storage.",
      "Implemented OTP authentication.",
    ],
    stack: ["MySQL", "OTP Authentication", "Full Stack"],
    link: {
      label: "Platform Case Study",
      url: "#contact",
    },
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
export default function WorkSection() {
  return (
    <section className="section work-section" id="work" aria-labelledby="work-heading">
      <div className="section-heading-row">
        <div className="section-heading-main">
          <SectionLabel>SELECTED WORK</SectionLabel>
          <h2 className="section-heading" id="work-heading" data-build="type">
            Work that ships<span className="accent-period">.</span>
          </h2>
          <p className="section-lede" data-build="type">
            Research and products built across healthcare, applied AI, and full-stack
            engineering.
          </p>
        </div>
        <div className="work-metrics" aria-label="Resume highlights">
          <div className="work-metric" data-build="type">
            <span>04</span>
            <small>research entries</small>
          </div>
          <div className="work-metric" data-build="type">
            <span>03</span>
            <small>professional roles</small>
          </div>
          <div className="work-metric" data-build="type">
            <span>3.20</span>
            <small>CGPA / 4.00</small>
          </div>
        </div>
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <article className="project-card" key={project.index}>
            <div className="project-topline">
              <span className="project-index" data-build="type">{project.index} / 05</span>
              <span className="project-date" data-build="type">{project.date}</span>
            </div>
            <div className="project-content">
              <div className="project-title-wrap">
                <p className="project-category" data-build="type">{project.category}</p>
                <h3 data-build="type">{project.title}</h3>
                {project.link && (
                  <div className="mt-4" data-build="pop">
                    <a
                      href={project.link.url}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-[#ff3b2f]/60 rounded-[2px] transition-all duration-200 group shadow-sm"
                    >
                      <span className="text-[#ff3b2f] select-none font-bold group-hover:translate-x-0.5 transition-transform">
                        //
                      </span>
                      <span>{project.link.label}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#ff3b2f] opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                )}
              </div>
              <div className="project-detail">
                <ul>
                  {project.description.map((item) => (
                    <li key={item} data-build="type">{item}</li>
                  ))}
                </ul>
                <div className="project-bottom">
                  <div className="chip-list" data-build="pop" aria-label={`${project.title} technologies`}>
                    {project.stack.map((item) => (
                      <span className="tech-chip" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="section-footnote" data-build="type">
        Project descriptions and research milestones are drawn from verified academic and clinical work.
      </p>
    </section>
  );
}