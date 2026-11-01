# arkConvert — Free File Converter by ARK

Tagline: **Convert anything, right in your browser. No uploads, no waiting, no sign-up.**

A complete, working **static site** — no build step, no server, no database. It deploys directly on Vercel.

Brand is Abdur Rahman Khan / ARK only. There is no "Muse AI" branding anywhere on the site.

> **Domain placeholder:** canonical URLs, sitemap and robots.txt currently use `https://arkconvert.app` as a placeholder. **Replace it with your real domain** everywhere (search for `arkconvert.app`) before you claim ownership in Google Search Console. Do not claim a domain you do not own.

## About the builder (GitHub-verified, 2026-11-01)

Abdur Rahman Khan, UET Peshawar, Peshawar, Pakistan.
Bio: Computer Science Undergraduate | DevOps & Cloud Engineer | Certified Ethical Hacker | Programming Expert | AI System Developer.
GitHub: 20 public repos — https://github.com/AbdurRahmanKhan000

ARK Ecosystem, currently building per his GitHub README: arkEngine, arkBrowse, GitGuard, PasteWrap, and DevCost Lens — plus arkAI, Tech by ARK, and now arkConvert. Other real repos mentioned briefly: VocalFlow-AI, arkSnap, TrustWrap, CaseBridge, arkType.

Approach: secure, scalable, offline-first architectures; local LLM inference (Ollama / Llama 3.2), RAG, LangChain4j, FAISS, JavaFX, Spring Boot; zero-trust security, performance, production-grade documentation.
Stack shown: Java, Python, Spring Boot, RAG, Ollama, Docker, AWS/GCP.
Experience: Cloud Computing Intern @ CodeAlpha (Oct 2026); Web Dev & SEO Intern @ INOVENTRA TECHNOLOGIES, Peshawar (Jul–Oct 2026, WordPress/HTML/CSS, on-page/technical/local SEO).

LinkedIn is linked only (https://www.linkedin.com/in/abdur-rahman-khan-a51ba33ab/). LinkedIn itself blocked a direct text fetch (HTTP 999), so no LinkedIn-specific projects or counts are claimed on the site.

Portfolio: https://portfolio-arkmfk.vercel.app/ • Contact: arkmfk27@gmail.com

## What is in this repo

- `index.html` — animated homepage: hero with the main H1, a direct-answer paragraph for AEO/GEO, the converter wheel demo, category cards, ARK Ecosystem, How it works, Why private, FAQ, blog preview, footer.
- `tools.html` — all categories in one wheel, plus the honest support matrix.
- `convert/*.html` — 28 programmatic SEO pages (see list below), each with a unique H1, direct-answer intro, steps, the working wheel pre-set to that conversion, FAQ, and JSON-LD (FAQPage + HowTo).
- `blog/index.html` + `blog/post.html?slug=...` — public blog, driven by `assets/blog.js` (3 genuine starter posts, clearly starter content).
- `admin.html` — **not linked from the main navigation**. Owner-only by obscurity + Google sign-in gate (see below).
- `assets/app.js` — the wheel + all converters. `assets/style.css` — dark navy/teal theme, CSS animations, no heavy framework. `assets/blog.js` — blog data.
- `robots.txt`, `sitemap.xml`, `vercel.json`.

## The wheel (the core interaction, from the owner's video)

- Pick a category (Documents / Images / Video & Audio / Data) and a circular wheel appears with output formats as segments around the centre.
- Desktop: drag a file **while holding Shift** and the wheel appears at your cursor; drop the file on a segment to convert to that format.
- Also supported: drag-and-drop onto the wheel centre, a Browse button, and clicking a segment after selecting a file.
- Mobile/touch fallback: pick a file, then tap a segment — no Shift key needed.
- Every wheel shows file name/size, progress, a status message, and a Download button. Wrong file types are validated first, with a clear, non-crashing error.

## Converters that actually work (all in the browser)

Libraries are loaded from CDN only when needed, with a graceful error if a CDN fails (pdf.js, mammoth, JSZip, pptxgenjs, SheetJS, jsPDF, heic2any, ffmpeg.wasm 0.11 for video):

- **PDF →** TXT, Markdown, DOCX, PPTX, JPG, PNG (pdf.js text extraction in reading order; per-page canvas renders for images; multi-page images download as a ZIP).
- **DOCX →** TXT, Markdown (mammoth); DOCX → PDF (jsPDF from extracted text).
- **TXT / Markdown →** DOCX (hand-built DOCX via JSZip), PDF, PPTX.
- **PPTX →** TXT, Markdown (JSZip + slide XML text).
- **Images →** PNG, JPG, WebP, GIF, BMP, AVIF via canvas where the browser supports it, plus image → PDF. HEIC input is tried via heic2any, otherwise a clear Safari/native-support message. HEIC output is attempted and falls back to PNG with a clear note if the browser cannot encode HEIC.
- **Video/Audio via ffmpeg.wasm:** MP4 → MP3, MOV → MP4, MKV → MP4, MP4 → MKV.
- **Data:** TXT → CSV/XLSX, CSV → XLSX/TXT, XLSX → CSV/TXT (SheetJS).
- **Image inputs:** JPG/PNG/WebP/TIFF are handled via canvas where decodable; TIFF input may fail in some browsers and shows a clear message instead of crashing.

Every conversion path is reachable from the wheel and either downloads a real file or shows a specific reason.

## Honest limitations — do not remove these from the copy

- Text-based conversions preserve content and structure/reading order. They are **not** claimed pixel-perfect.
- Complex Word/PowerPoint layouts, embedded fonts, and scanned/image PDFs may need checking. Scanned PDFs have no selectable text to extract.
- GIF, BMP and AVIF encoding depends on the browser; if unsupported, the site says so and suggests PNG/WebP.
- TIFF and HEIC decoding depends on the browser/device; failures show a specific message, not a broken download.
- Video conversion downloads a large ffmpeg.wasm engine, works best on desktop Chrome with smaller files, and may fail on mobile or slow connections. No file is ever uploaded for any conversion.
- No fake "100% perfect" claims are made anywhere.

## Deploy on Vercel

1. Push this folder to a GitHub repo (the parent agent owns the push; this build task does not push).
2. Vercel → Add New → Project → Import the repo.
3. Framework Preset: **Other** (static). Build Command: *(leave empty / none)*. Output Directory: *(root / leave empty)*. There is no build step.
4. Deploy. Then add your real domain in Vercel → Domains, and replace `arkconvert.app` in all HTML files, `sitemap.xml` and `robots.txt` with that domain, then redeploy.
5. Google Search Console: add the property for your real domain, verify via the DNS/Vercel method Google offers, and submit `sitemap.xml`.
6. Analytics (optional): add your Google Analytics / Plausible snippet to the shared header in each HTML file, or add a single snippet include step when you move to a templated build. No analytics code is baked in by default, so nothing tracks visitors until you add it.

## SEO checklist (what is done, what is still yours to do)

- **On-page:** unique title (≤60 chars where possible), meta description, canonical, Open Graph, Twitter card, semantic H1/H2, alt-ready structure and internal links between conversion pages — on every page. Homepage has WebApplication/SoftwareApplication JSON-LD; conversion pages have FAQPage + HowTo JSON-LD.
- **Technical:** static HTML (fast, no server), `robots.txt` (admin disallowed), `sitemap.xml` listing only pages that exist, mobile-legible CSS, no render-blocking framework.
- **Programmatic:** 28 real `/convert/` pages, each with unique copy and a working pre-set wheel — not thin doorway pages with the same text.
- **GEO / AEO:** every homepage and conversion page opens with a direct answer to the query ("Yes — you can convert X to Y free, right here…"), plus steps and FAQ in plain language, so AI answers and featured snippets can lift a complete answer.
- **Off-page (owner to do):** link from the portfolio, GitHub profile/README, LinkedIn posts and Tech by ARK descriptions; publish genuinely useful blog posts; earn links from real tool directories. Do **not** buy links, use link farms, or use bots/fake traffic — those risk penalties and termination-style consequences on other platforms.
- **After launch:** check Search Console for indexing/coverage, fix any "page not indexed" items, add real screenshots/OG image, and monitor which conversion pages get impressions before adding more pages.

## Programmatic SEO pages (28)

pdf-to-word, pdf-to-text, pdf-to-markdown, pdf-to-pptx, word-to-pdf, word-to-text, word-to-markdown, text-to-word, text-to-pdf, text-to-pptx, pptx-to-text, pptx-to-markdown, png-to-jpg, jpg-to-webp, png-to-webp, jpg-to-png, webp-to-png, png-to-pdf, mp4-to-mp3, mov-to-mp4, mkv-to-mp4, mp4-to-mkv, text-to-csv, text-to-excel, csv-to-excel, excel-to-csv, csv-to-text, excel-to-text — all under `convert/`.

## Blog: how the owner publishes a post

The blog is **public to read**. Writing/uploading is **owner-only**, enforced in two layers:

1. `admin.html` is not linked from any navigation menu.
2. It uses Google Identity Services. Only `arkmfk27@gmail.com` may open the editor; everyone else sees "owner only".

**Important — static-site honesty:** a static Vercel site has no server database, so the admin editor does **not** publish instantly to the live site. The workflow is:

1. Open `/admin.html`, sign in with Google as arkmfk27@gmail.com.
2. Write title / excerpt / body, preview it.
3. Click "Download .md" (a backup) and "Download blog.js snippet".
4. Add that snippet object to `window.ARK_BLOG_POSTS` in `assets/blog.js` and commit + push. Vercel redeploys and the post appears on `/blog/` and the homepage preview.

**Documented next step (not implemented):** one-click publish via the GitHub API — the admin page could, after owner sign-in, use a GitHub fine-grained token (stored by the owner, never in the repo) to commit the new `blog.js` via the Contents API and trigger a Vercel redeploy. That needs the owner's token and is deliberately not wired up here, so no credential is baked into this static site.

### Setting the Google client ID

1. Google Cloud Console → create/select a project → APIs & Services → Credentials → Create OAuth client ID (Web).
2. Add your real site origin (e.g. `https://yourdomain.com`) to Authorized JavaScript origins.
3. Replace `REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID` in `admin.html` (the `data-client_id` attribute) with that client ID, or set it via an environment/build step. Until you do, Google sign-in will not work and the editor stays gated — which is the safe default.

## Local check

```bash
node --check assets/app.js
node --check assets/blog.js
python3 -c "import xml.etree.ElementTree as ET, pathlib; urls=[u.text for u in ET.parse('sitemap.xml').getroot() for u in [u.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]]; print([u for u in urls if not pathlib.Path('.'+u.replace('https://arkconvert.app','')).exists()])"
```

The last check must print `[]` — sitemap lists only files that exist.
