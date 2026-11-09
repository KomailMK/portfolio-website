import React from "react";
import CursorOrchestrator from "@/components/CursorOrchestrator";
import ExperienceEnhancer from "@/components/ExperienceEnhancer";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WorkSection from "@/components/WorkSection";
import StackMarquee from "@/components/StackMarquee";
import RecordSection from "@/components/RecordSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";

export default function Home() {
  return (
    <CursorOrchestrator>
      <ExperienceEnhancer />
      <Navbar />
      <main>
        <HeroSection />
        <WorkSection />
        <StackMarquee />
        <RecordSection />
        <AboutSection />
        <ContactSection />
      </main>
    </CursorOrchestrator>
  );
}
