# Personal Portfolio

An ultra-clean, high-performance portfolio website built with **Next.js 15 App Router**, **TypeScript**, **Tailwind CSS v4**, **lucide-react**, and **next/font**.

---

## How to Run Locally

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm or pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Test Production Output
```bash
npm run build
npm start
```

---

## How to Deploy Free on Vercel

### Method A: Deploy via GitHub (Recommended)
1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "feat: portfolio with autonomous agent build engine"
   ```
2. Create a new repository on [GitHub](https://github.com) (public or private).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
4. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
5. Click **"Add New..."** &rarr; **"Project"**.
6. Select your repository from the list and click **"Import"**.
7. Vercel automatically detects Next.js:
   - Framework Preset: `Next.js`
   - Build Command: `next build`
   - Output Directory: `.next`
8. Click **"Deploy"**. Your portfolio will be live in under 60 seconds with a free `.vercel.app` URL and free SSL!

### Method B: Deploy using Vercel CLI
1. Install Vercel CLI globally or run with npx:
   ```bash
   npx vercel
   ```
2. Follow the short terminal prompts to link and deploy your project for free.


## Features & Highlights

- **Aesthetic**: Minimalist dark `#09090b` canvas, refined zinc greys, and one vibrant accent red `#ff3b2f`. No purple gradients or glass cards.
- **Hero Section**:
  - Fullscreen Anton typography featuring the giant word **PORTFOLIO** with a metallic gradient (bright red fading to black) and a slow light sheen sweeping across.
  - Centered black-and-white headshot with high contrast, standing above a soft red radial glow with a seamless bottom fade.
  - Handwritten "Hello, I'm" in Caveat Brush, name, role, 2-line bio, "View work" CTA, and location badge (`Peshawar, Pakistan`).
  - 3 real stats directly from resume (1st Place Competition Winner, DOST Peshawar Grant, 3.20/4.00 CGPA at UET Mardan).
- **Signature Autonomous Agent Animation**:
  - 12 autonomous robot cursors (`Scout`, `Layout`, `Typeset`, `Motion`, `QA`, `Deploy`, `Copy`, `Lint`, `Index`, `Render`, `Palette`, `Review` — scaled to 6 on mobile devices).
  - Each cursor has a directional pointer and a colored badge with a miniature robot head (pulsing LED antenna, blinking LED eyes).
  - Cursors glide to elements, drag out dashed blue wireframe boxes with corner resize handles and monospace tags, then assemble the element live:
    - `data-build="type"`: Types out text letter-by-letter.
    - `data-build="pop"`: Smooth scale bounce entry.
    - `data-build="wipe"`: Left-to-right clip-path reveal.
  - Max 6 elements building simultaneously in reading order using a single `requestAnimationFrame` loop + `IntersectionObserver`.
  - Zero content flash: An inline script in `<head>` applies `.build-mode` before paint to keep unbuilt elements `visibility: hidden`.
- **Dock Controls & Screen Recording Tour**:
  - Floating pill dock at the bottom: Pause/Resume, Agents On/Off (saved in `localStorage`), and Tour mode.
  - **Tour Mode**: Auto-scrolls the site smoothly (ease-in, steady, ease-out) so you can capture clean screen recordings. Any mouse scroll, touch gesture, or `Escape` key immediately stops the tour.
  - **Keyboard Shortcuts**:
    - `T`: Start / Stop Tour
    - `A`: Toggle Agents On / Off
    - `P`: Pause / Resume Build Loop
    - `Esc`: Cancel Tour
  - **URL Query Parameters**:
    - `?agents=on`: Forces the building animation even when system reduced motion is enabled.
    - `?agents=off`: Disables agents and displays all elements instantly.
- **Sections**:
  1. **Work ("Work that ships")**: 6 real projects (Federated VLMs for 3D Brain Tumor Segmentation, DOST Grant CCTV Crime & Threat Detection, UET Mardan Official Web Portal Redesign, AI Anemia Detection, Multilingual RAG Marketplace, Dental Hospital Clinical Workflow System). Text cards with 3-4 bullets, tech chips, and live/code links (no screenshots).
  2. **Stack**: Complete marquee of all tools from resume moving endlessly left to right with faded edges, pausing on hover.
  3. **Record**: Chronological timeline of clinical engineering roles, provincial research grants, university hackathons/competitions, and academic degrees.
  4. **About**: 2 short fact-grounded paragraphs, 4-column categorized skills taxonomy, and 4 core engineering principles.
  5. **Contact**: Big CTA card, direct email (`komikhalils091@gmail.com`), copy button, LinkedIn, and resume download. Zero phone number shown.

---