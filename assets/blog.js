// arkConvert blog posts — starter content, written for the owner to replace/extend.
// The owner publishes new posts by adding an object here and committing (see admin.html + README.md).
// A static Vercel site has no database, so blog posts do NOT publish instantly from a browser form.
window.ARK_BLOG_POSTS = [
  {
    slug: "pdf-vs-word-which-to-use",
    title: "PDF vs Word: Which File Should You Send?",
    excerpt: "PDF keeps your layout fixed. Word stays editable. Here is a simple way to choose — and convert — without breaking your document.",
    date: "2026-11-01",
    body: "<p><strong>Short answer:</strong> send a PDF when the layout must not change, and send a Word file when the other person needs to edit it.</p><p>PDF is best for CVs, invoices, certificates and final versions. Word (.docx) is best for drafts, reports and anything with tracked changes or comments.</p><p>When you convert PDF to Word with arkConvert, the text and reading order are preserved. Complex layouts, embedded fonts and scanned pages may need a quick check afterwards — that is true of every converter, and we say so openly rather than promising a pixel-perfect copy.</p><p><strong>Tip:</strong> if your PDF is a scan (a photo of a page), it has no selectable text. Use a text-based PDF for the cleanest conversion.</p>"
  },
  {
    slug: "convert-files-without-uploading",
    title: "Why Converting Files in Your Browser Is More Private",
    excerpt: "Most converters upload your file to a server. arkConvert converts in your browser, so your file never leaves your device.",
    date: "2026-11-01",
    body: "<p>Many free converters work by uploading your document, image or video to a remote server, converting it there, and sending it back. That creates a copy you cannot control.</p><p>arkConvert takes a different approach for documents, images and spreadsheets: the conversion runs in your browser with JavaScript libraries. Your file is processed on your own device and the download is created locally.</p><p>Video conversion uses ffmpeg.wasm, which also runs in your browser, but it downloads a larger engine file first, so it is slower and needs a modern desktop browser. If it cannot load, the site tells you plainly instead of pretending it worked.</p><p>Privacy is not a marketing line here — it is the architecture. No account, no upload queue, no sign-up.</p>"
  },
  {
    slug: "image-formats-explained",
    title: "PNG, JPG, WebP and AVIF Explained in Plain English",
    excerpt: "Use JPG for photos, PNG for graphics with sharp edges or transparency, WebP for the web, and AVIF when quality per megabyte matters most.",
    date: "2026-11-01",
    body: "<p><strong>JPG</strong> is best for photos. It compresses well, but it has no transparency and repeated saving loses quality.</p><p><strong>PNG</strong> is best for logos, screenshots and graphics with text, and it supports transparency. Files are usually larger than JPG.</p><p><strong>WebP</strong> is the modern web choice: smaller than JPG or PNG in most cases, with transparency support.</p><p><strong>AVIF</strong> can be even smaller than WebP at the same quality, but support depends on your browser. If your browser cannot encode AVIF, arkConvert falls back to PNG and tells you why.</p><p>HEIC is the format many iPhones use. arkConvert tries to decode HEIC in the browser where supported; if your browser cannot decode it, you will see a clear message instead of a broken download.</p>"
  }
];
