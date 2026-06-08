import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import {
  Download, Plus, Trash2, ChevronUp, ChevronDown, Sparkles,
  RotateCcw, Upload, X, Loader2, LayoutTemplate, Eye, Edit3,
  Settings as SettingsIcon, Key, Check, AlertCircle,
} from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// =====================================================================
// TYPES
// =====================================================================

interface PersonalLink {
  label: string;
  url: string;
}

interface Personal {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  photo: string;
  links: PersonalLink[];
}

interface Experience {
  role: string;
  company: string;
  dates: string;
  bullets: string[];
}

interface Education {
  degree: string;
  school: string;
  dates: string;
}

interface Skill {
  category: string;
  items: string;
}

interface Certification {
  name: string;
  issuer: string;
}

interface Project {
  name: string;
  tech: string;
  description: string;
  link: string;
}

type TemplateId =
  | 'modern' | 'classic' | 'executive' | 'technical' | 'compact'
  | 'minimal' | 'sidebar' | 'professional' | 'creative';

interface ResumeData {
  personal: Personal;
  profile: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  certifications: Certification[];
  strengths: string[];
  projects: Project[];
  template: TemplateId;
  accent: string;
}

interface TemplateInfo {
  id: TemplateId;
  name: string;
  desc: string;
}

type AiTarget = 'profile' | 'all-experience' | 'skills' | 'projects' | `exp-${number}`;

// =====================================================================
// DATA
// =====================================================================

const STARTER_DATA: ResumeData = {
  personal: {
    name: 'Your Name',
    title: 'Your Title',
    email: 'your@email.com',
    phone: '000 0000000',
    location: 'City, Country',
    photo: '',
    links: [
      { label: 'Portfolio', url: '' },
      { label: 'GitHub', url: '' },
      { label: 'LinkedIn', url: '' },
    ],
  },
  profile: 'Write a short summary of your professional background, key skills, and what you bring to the table. This is the first thing recruiters read — keep it to 2–3 sentences.',
  experience: [
    {
      role: 'Job Title',
      company: 'Company Name',
      dates: 'Month Year — Present',
      bullets: [
        'Describe a key responsibility or achievement here',
        'Quantify impact where possible (e.g. reduced load time by 40%)',
      ],
    },
    {
      role: 'Previous Role',
      company: 'Previous Company',
      dates: 'Month Year — Month Year',
      bullets: [
        'Another responsibility or achievement',
        'Use action verbs: built, led, optimized, designed, delivered',
      ],
    },
  ],
  education: [
    { degree: "Bachelor's in Your Field", school: 'University Name', dates: 'Year — Year' },
  ],
  skills: [
    { category: 'Frontend', items: 'List your frontend skills here' },
    { category: 'Backend', items: 'List your backend skills here' },
    { category: 'Tools', items: 'List your tools here' },
  ],
  certifications: [],
  strengths: [],
  projects: [
    { name: 'Project Name', tech: 'Tech stack used', description: 'What it does and why it matters.', link: '' },
  ],
  template: 'modern',
  accent: '#1e40af',
};

const BLANK_DATA: ResumeData = {
  personal: { name: 'Your Name', title: 'Your Title', email: '', phone: '', location: '', photo: '', links: [{ label: 'LinkedIn', url: '' }] },
  profile: 'Brief professional summary highlighting your strengths and goals.',
  experience: [{ role: 'Job Title', company: 'Company Name', dates: 'Start — End', bullets: ['Achievement or responsibility'] }],
  education: [{ degree: 'Degree', school: 'School Name', dates: 'Year — Year' }],
  skills: [{ category: 'Skills', items: 'List your skills here' }],
  certifications: [],
  strengths: [],
  projects: [],
  template: 'modern',
  accent: '#1e40af',
};

const TEMPLATES: TemplateInfo[] = [
  { id: 'modern', name: 'Modern', desc: 'Clean two-column with colored sidebar. Most popular for tech & business.' },
  { id: 'classic', name: 'Classic', desc: 'Traditional single-column. Safest for finance, law, government & ATS-strict portals.' },
  { id: 'executive', name: 'Executive', desc: 'Centered header with refined single-column body. For senior & leadership roles.' },
  { id: 'technical', name: 'Technical', desc: 'Skills-forward sidebar layout for developers, engineers & data roles.' },
  { id: 'compact', name: 'Compact', desc: 'Dense, space-efficient layout. Great when you have a lot to say on one page.' },
  { id: 'minimal', name: 'Minimal', desc: 'Ultra-clean, lots of whitespace. Premium feel for design & creative roles.' },
  { id: 'sidebar', name: 'Sidebar', desc: 'Light sidebar with timeline-style experience. Modern alternative to two-column.' },
  { id: 'professional', name: 'Professional', desc: 'Corporate single-column with accent header band. Used by consulting & finance.' },
  { id: 'creative', name: 'Creative', desc: 'Bold accent header with personality. For marketing, design & creative tech.' },
];

const FONT_STACK = "'Inter', 'Calibri', 'Helvetica Neue', 'Arial', system-ui, -apple-system, sans-serif";
const UI_DISPLAY = "'Playfair Display', 'Times New Roman', Georgia, serif";
const UI_BODY = "'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif";
const UI_MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', monospace";

// =====================================================================
// API SETTINGS — Grok-default OpenAI-compatible
// =====================================================================

interface ApiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const ENV = (import.meta.env || {}) as Record<string, string | undefined>;
const DEFAULT_API: ApiSettings = {
  baseUrl: ENV.VITE_API_BASE_URL || 'https://api.groq.com/openai/v1',
  apiKey: ENV.VITE_API_KEY || '',
  model: ENV.VITE_API_MODEL || 'llama-3.3-70b-versatile',
};

const API_KEY = 'resume-api-settings-v1';

function loadApiSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(API_KEY);
    if (!raw) return DEFAULT_API;
    const stored = JSON.parse(raw) as Partial<ApiSettings>;
    return {
      baseUrl: stored.baseUrl || DEFAULT_API.baseUrl,
      apiKey: stored.apiKey || DEFAULT_API.apiKey,
      model: stored.model || DEFAULT_API.model,
    };
  } catch {
    return DEFAULT_API;
  }
}

function saveApiSettings(s: ApiSettings) {
  try { localStorage.setItem(API_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

async function callChat(api: ApiSettings, messages: ChatMessage[], opts?: { responseJson?: boolean }): Promise<string> {
  // In production the request goes through /api/chat (serverless proxy) so the key
  // stays server-side and never appears in the client bundle.
  const isProd = import.meta.env.PROD;
  let url: string;
  const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

  if (isProd) {
    url = '/api/chat';
  } else {
    if (!api.apiKey) throw new Error('No API key set. Open Settings to add one.');
    url = `${api.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    fetchHeaders.Authorization = `Bearer ${api.apiKey}`;
  }

  const body: Record<string, unknown> = {
    model: api.model,
    messages,
    temperature: 0.4,
  };
  if (opts?.responseJson) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: fetchHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${txt ? ' — ' + txt.slice(0, 200) : ''}`);
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Empty response from API');
  return content;
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
}

// =====================================================================
// FILE PARSING
// =====================================================================

type ParsedFile =
  | { kind: 'json'; data: ResumeData }
  | { kind: 'text'; text: string; sourceName: string };

async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() || '';

  if (ext === 'json' || file.type === 'application/json') {
    const text = await file.text();
    const data = JSON.parse(text) as ResumeData;
    return { kind: 'json', data };
  }

  if (ext === 'txt' || ext === 'md' || file.type.startsWith('text/')) {
    const text = await file.text();
    return { kind: 'text', text, sourceName: file.name };
  }

  if (ext === 'pdf' || file.type === 'application/pdf') {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const chunks: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it) => ('str' in it ? (it as { str: string }).str : ''))
        .join(' ');
      chunks.push(pageText);
    }
    return { kind: 'text', text: chunks.join('\n\n'), sourceName: file.name };
  }

  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return { kind: 'text', text: result.value, sourceName: file.name };
  }

  if (ext === 'doc') {
    throw new Error('Legacy .doc not supported — please save as .docx or PDF.');
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

const EXTRACTION_SYSTEM = `You convert raw resume text into a strict JSON object matching this exact TypeScript shape:

{
  "personal": {
    "name": string, "title": string, "email": string, "phone": string, "location": string, "photo": "",
    "links": [{ "label": string, "url": string }]
  },
  "profile": string,
  "experience": [{ "role": string, "company": string, "dates": string, "bullets": string[] }],
  "education": [{ "degree": string, "school": string, "dates": string }],
  "skills": [{ "category": string, "items": string }],
  "certifications": [{ "name": string, "issuer": string }],
  "strengths": string[],
  "projects": [{ "name": string, "tech": string, "description": string, "link": string }]
}

Rules:
- Preserve facts faithfully. Do not invent achievements, dates, or skills.
- If a field is missing, use empty string "" or [] — never null.
- "skills" should group items by category (e.g. Frontend, Backend, Tools). If the source lists flat skills, group sensibly.
- Each experience bullet must be a complete, action-led sentence.
- "links" should include URLs found in the source (LinkedIn, GitHub, portfolio).
- "photo" must always be the empty string.
- Output ONLY the JSON object. No markdown, no preamble, no commentary.`;

async function extractResumeFromText(text: string, api: ApiSettings): Promise<Partial<ResumeData>> {
  const raw = await callChat(api, [
    { role: 'system', content: EXTRACTION_SYSTEM },
    { role: 'user', content: `Convert this resume text:\n\n${text.slice(0, 14000)}` },
  ], { responseJson: true });
  const cleaned = stripFences(raw);
  return JSON.parse(cleaned) as Partial<ResumeData>;
}

function mergeResumeData(starter: ResumeData, incoming: Partial<ResumeData>): ResumeData {
  return {
    ...starter,
    ...incoming,
    personal: { ...starter.personal, ...(incoming.personal || {}) },
    template: incoming.template || starter.template,
    accent: incoming.accent || starter.accent,
  };
}

// =====================================================================
// MAIN COMPONENT
// =====================================================================

export default function ResumeBuilder() {
  const [data, setData] = useState<ResumeData>(() => {
    try {
      const stored = localStorage.getItem('resume-data-v2');
      if (stored) {
        const loaded = JSON.parse(stored) as Partial<ResumeData>;
        return { ...STARTER_DATA, ...loaded };
      }
    } catch { /* ignore */ }
    return STARTER_DATA;
  });
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiTarget, setAiTarget] = useState<AiTarget>('profile');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiSettings, setApiSettings] = useState<ApiSettings>(() => loadApiSettings());
  const [importStatus, setImportStatus] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem('resume-data-v2', JSON.stringify(data));
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 1200);
      } catch (e) {
        setSaveStatus('Save failed');
      }
    }, 700);
    return () => clearTimeout(t);
  }, [data]);

  const update = (path: string, value: unknown) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ResumeData;
      const keys = path.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const updateArrayItem = <K extends keyof ResumeData>(
    section: K,
    index: number,
    field: string,
    value: unknown
  ) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ResumeData;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next[section] as any)[index][field] = value;
      return next;
    });
  };

  const addArrayItem = <K extends keyof ResumeData>(section: K, item: unknown) => {
    setData(p => ({ ...p, [section]: [...(p[section] as unknown[]), item] } as ResumeData));
  };

  const removeArrayItem = <K extends keyof ResumeData>(section: K, index: number) => {
    setData(p => ({
      ...p,
      [section]: (p[section] as unknown[]).filter((_, i) => i !== index),
    } as ResumeData));
  };

  const moveArrayItem = <K extends keyof ResumeData>(section: K, index: number, dir: number) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as ResumeData;
      const arr = next[section] as unknown[];
      const newIdx = index + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return next;
    });
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update('personal.photo', ev.target?.result);
    reader.readAsDataURL(file);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${data.personal.name.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setImportStatus(`Reading ${file.name}…`);
    try {
      const parsed = await parseFile(file);
      if (parsed.kind === 'json') {
        setData(mergeResumeData(STARTER_DATA, parsed.data));
        setImportStatus('');
        setToast({ msg: `Imported JSON resume from ${file.name}`, kind: 'ok' });
        return;
      }

      if (!parsed.text.trim()) {
        throw new Error('Could not extract any text from the file.');
      }
      if (!apiSettings.apiKey) {
        setImportStatus('');
        setToast({ msg: 'Add an API key in Settings first to parse non-JSON files.', kind: 'err' });
        setShowSettings(true);
        return;
      }

      setImportStatus(`Parsing ${file.name} with AI…`);
      const extracted = await extractResumeFromText(parsed.text, apiSettings);
      setData(prev => mergeResumeData(prev, extracted));
      setImportStatus('');
      setToast({ msg: `Imported ${file.name} — review fields and edit as needed.`, kind: 'ok' });
    } catch (err) {
      setImportStatus('');
      const msg = err instanceof Error ? err.message : 'Import failed.';
      setToast({ msg: `Import failed: ${msg}`, kind: 'err' });
    }
  };

  const exportPDF = () => {
    const node = document.getElementById('resume-print');
    if (!node) return;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    };

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) { cleanup(); return; }

    const safeName = data.personal.name || 'Resume';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: ${FONT_STACK};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: geometricPrecision;
  }
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  a { color: inherit; }
  @page { margin: 0.4in; size: letter; }
  @media print {
    html, body { background: #fff !important; }
  }
</style>
</head><body>${node.outerHTML}</body></html>`;

    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
      } catch { /* noop */ }
      setTimeout(cleanup, 1500);
    };

    const onReady = () => {
      const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
      if (fonts && fonts.ready) {
        fonts.ready.then(() => setTimeout(triggerPrint, 80));
      } else {
        setTimeout(triggerPrint, 600);
      }
    };

    if (doc.readyState === 'complete') onReady();
    else iframe.addEventListener('load', onReady, { once: true });
  };

  const exportText = () => {
    let text = `${data.personal.name}\n`;
    if (data.personal.title) text += `${data.personal.title}\n`;
    text += `${[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' | ')}\n`;
    data.personal.links.filter(l => l.url).forEach(l => text += `${l.label}: ${l.url}\n`);
    text += `\nPROFILE\n${data.profile}\n`;
    if (data.experience.length) {
      text += `\nEXPERIENCE\n`;
      data.experience.forEach(e => {
        text += `\n${e.role} | ${e.company} | ${e.dates}\n`;
        e.bullets.forEach(b => text += `  - ${b}\n`);
      });
    }
    if (data.education.length) {
      text += `\nEDUCATION\n`;
      data.education.forEach(e => text += `${e.degree} | ${e.school} | ${e.dates}\n`);
    }
    if (data.skills.length) {
      text += `\nSKILLS\n`;
      data.skills.forEach(s => text += `${s.category}: ${s.items}\n`);
    }
    if (data.certifications.length) {
      text += `\nCERTIFICATIONS\n`;
      data.certifications.forEach(c => text += `${c.name} - ${c.issuer}\n`);
    }
    if (data.projects.length) {
      text += `\nPROJECTS\n`;
      data.projects.forEach(p => {
        text += `\n${p.name} (${p.tech})\n${p.description}\n`;
        if (p.link) text += `Link: ${p.link}\n`;
      });
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${data.personal.name.replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocx = () => {
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Resume</title></head><body style="font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a;">`;
    html += `<h1 style="margin:0;font-size:22pt;font-weight:600;letter-spacing:0.5pt;">${data.personal.name}</h1>`;
    if (data.personal.title) html += `<p style="margin:2pt 0;font-size:12pt;color:#555;">${data.personal.title}</p>`;
    html += `<p style="margin:4pt 0;font-size:10pt;">${[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' &nbsp;|&nbsp; ')}</p>`;
    const links = data.personal.links.filter(l => l.url);
    if (links.length) html += `<p style="margin:2pt 0;font-size:10pt;">${links.map(l => `<a href="${l.url}">${l.label}</a>`).join(' &nbsp;|&nbsp; ')}</p>`;
    const sec = (title: string) => `<h2 style="font-size:12pt;border-bottom:1pt solid #888;margin:14pt 0 6pt 0;text-transform:uppercase;letter-spacing:1pt;font-weight:600;">${title}</h2>`;
    html += sec('Profile') + `<p style="margin:0;">${data.profile}</p>`;
    if (data.experience.length) {
      html += sec('Experience');
      data.experience.forEach(e => {
        html += `<p style="margin:8pt 0 2pt 0;"><b>${e.role}</b> &mdash; ${e.company} <span style="color:#666;font-style:italic;">(${e.dates})</span></p>`;
        html += `<ul style="margin:2pt 0;padding-left:20pt;">${e.bullets.map(b => `<li style="margin-bottom:2pt;">${b}</li>`).join('')}</ul>`;
      });
    }
    if (data.education.length) {
      html += sec('Education');
      data.education.forEach(e => html += `<p style="margin:6pt 0;"><b>${e.degree}</b> &mdash; ${e.school} <span style="color:#666;font-style:italic;">(${e.dates})</span></p>`);
    }
    if (data.skills.length) {
      html += sec('Skills');
      data.skills.forEach(s => html += `<p style="margin:3pt 0;"><b>${s.category}:</b> ${s.items}</p>`);
    }
    if (data.certifications.length) {
      html += sec('Certifications') + `<ul style="margin:2pt 0;padding-left:20pt;">`;
      data.certifications.forEach(c => html += `<li><b>${c.name}</b> &mdash; ${c.issuer}</li>`);
      html += `</ul>`;
    }
    if (data.projects.length) {
      html += sec('Projects');
      data.projects.forEach(p => {
        html += `<p style="margin:6pt 0 2pt 0;"><b>${p.name}</b> <span style="color:#666;font-style:italic;">(${p.tech})</span></p><p style="margin:0 0 4pt 0;">${p.description}${p.link ? ` &mdash; <a href="${p.link}">${p.link}</a>` : ''}</p>`;
      });
    }
    html += `</body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${data.personal.name.replace(/\s+/g, '-')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAI = async () => {
    if (!aiPrompt.trim()) return;
    if (!apiSettings.apiKey) {
      setAiError('No API key set. Open Settings to add one.');
      setShowSettings(true);
      return;
    }
    setAiLoading(true);
    setAiError('');

    let userPrompt = '';
    let wantJson = true;
    if (aiTarget === 'profile') {
      wantJson = false;
      userPrompt = `Rewrite this professional resume profile based on my request. Keep it 2-4 sentences, professional, ATS-friendly, grounded (no exaggeration). Return ONLY the new profile text — no quotes, no preamble.\n\nMy request: "${aiPrompt}"\n\nCurrent profile: ${data.profile}`;
    } else if (aiTarget.startsWith('exp-')) {
      const idx = parseInt(aiTarget.split('-')[1]);
      userPrompt = `Modify this resume experience entry per my request. Keep bullets concise, action-verb led, ATS-friendly, quantified where realistic, grounded. Return ONLY a JSON object with this exact shape: {"role":"...","company":"...","dates":"...","bullets":["...","..."]}.\n\nMy request: "${aiPrompt}"\n\nCurrent: ${JSON.stringify(data.experience[idx])}`;
    } else if (aiTarget === 'all-experience') {
      userPrompt = `Modify this resume experience list per my request. Keep bullets concise, action-verb led, ATS-friendly, grounded. Return ONLY a JSON object with shape: {"experience":[{"role":"...","company":"...","dates":"...","bullets":["..."]}]}.\n\nMy request: "${aiPrompt}"\n\nCurrent: ${JSON.stringify(data.experience)}`;
    } else if (aiTarget === 'skills') {
      userPrompt = `Modify this resume skills list per my request. ATS-friendly. Return ONLY a JSON object with shape: {"skills":[{"category":"...","items":"comma separated"}]}.\n\nMy request: "${aiPrompt}"\n\nCurrent: ${JSON.stringify(data.skills)}`;
    } else if (aiTarget === 'projects') {
      userPrompt = `Modify this resume projects list per my request. Keep descriptions concise. Return ONLY a JSON object with shape: {"projects":[{"name":"...","tech":"...","description":"...","link":"..."}]}.\n\nMy request: "${aiPrompt}"\n\nCurrent: ${JSON.stringify(data.projects)}`;
    }

    try {
      const raw = await callChat(apiSettings, [
        { role: 'system', content: 'You are a precise resume editor. Follow the requested JSON shape exactly when asked. Never add commentary.' },
        { role: 'user', content: userPrompt },
      ], { responseJson: wantJson });
      const text = stripFences(raw);

      if (aiTarget === 'profile') {
        update('profile', text);
      } else if (aiTarget.startsWith('exp-')) {
        const idx = parseInt(aiTarget.split('-')[1]);
        const parsed = JSON.parse(text) as Experience;
        setData(prev => {
          const next = JSON.parse(JSON.stringify(prev)) as ResumeData;
          next.experience[idx] = parsed;
          return next;
        });
      } else if (aiTarget === 'all-experience') {
        const parsed = JSON.parse(text) as { experience: Experience[] };
        update('experience', parsed.experience);
      } else if (aiTarget === 'skills') {
        const parsed = JSON.parse(text) as { skills: Skill[] };
        update('skills', parsed.skills);
      } else if (aiTarget === 'projects') {
        const parsed = JSON.parse(text) as { projects: Project[] };
        update('projects', parsed.projects);
      }
      setAiPrompt('');
      setToast({ msg: 'Applied AI changes.', kind: 'ok' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request failed.';
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const resetToStarter = () => { setData(STARTER_DATA); setShowResetConfirm(false); };
  const startBlank = () => { setData(BLANK_DATA); setShowResetConfirm(false); };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const issueNum = String(data.experience.length + data.projects.length).padStart(3, '0');

  return (
    <div className="bld-canvas">
      <header className="bld-masthead no-print bld-print-in">
        <div className="bld-masthead__meta">
          <span>Vol. I<span className="bld-masthead__meta-dot" />No. {issueNum}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {saveStatus && <span className="bld-pill">{saveStatus}</span>}
            {importStatus && <span className="bld-progress" style={{ padding: '2px 10px', border: 'none', boxShadow: 'none', background: 'transparent', color: 'var(--accent)' }}><span className="bld-progress__spin" style={{ width: 10, height: 10, borderWidth: 1.2 }} /> {importStatus}</span>}
          </span>
          <span>{today}</span>
        </div>
        <h1 className="bld-masthead__title">
          The Resume Studio<sup>™</sup>
        </h1>
        <div className="bld-masthead__strap">
          &mdash; "All the templates fit to print." &mdash;
        </div>
        <div className="bld-masthead__bar">
          <div className="flex items-center gap-2 flex-wrap">
            <ViewToggle value={view} onChange={setView} />
            <button onClick={() => setShowTemplates(true)} className="bld-btn">
              <LayoutTemplate className="w-3.5 h-3.5" /> Templates
            </button>
            <button onClick={() => setShowSettings(true)} className="bld-btn">
              <SettingsIcon className="w-3.5 h-3.5" /> Settings
            </button>
            <button onClick={() => setShowResetConfirm(true)} className="bld-btn bld-btn-ghost">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button onClick={() => importInputRef.current?.click()} className="bld-btn">
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <input ref={importInputRef} type="file" accept=".json,.pdf,.docx,.txt,.md" onChange={importFile} className="hidden" />
          </div>
          <div className="bld-exports">
            <button onClick={exportPDF} className="bld-export-primary">
              <Download className="w-3.5 h-3.5" /> Print PDF
            </button>
            <button onClick={exportDocx}>Word</button>
            <button onClick={exportText}>Plain</button>
            <button onClick={exportJSON}>JSON</button>
          </div>
        </div>
      </header>

      {showTemplates && (
        <div className="bld-modal-backdrop no-print bld-scroll" onClick={() => setShowTemplates(false)}>
          <div className="bld-modal max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <div className="bld-modal__header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div className="bld-modal__eyebrow">§ I &nbsp;·&nbsp; Layout</div>
                <h3 className="bld-modal__title">Choose your <em>template</em></h3>
                <p className="bld-modal__lede">Every layout is ATS-friendly and shares the same parseable structure. Switch any time — your content stays put.</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="bld-btn bld-btn-ghost bld-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="bld-modal__body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => { update('template', t.id); setShowTemplates(false); }} className="bld-tile" data-active={data.template === t.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="bld-tile__name">{t.name}</span>
                      {data.template === t.id && <span className="bld-tile__badge">In use</span>}
                    </div>
                    <p className="bld-tile__desc">{t.desc}</p>
                    <TemplateThumbnail id={t.id} accent={data.accent} />
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
                <div className="bld-modal__eyebrow" style={{ marginBottom: 10 }}>§ II &nbsp;·&nbsp; Accent ink</div>
                <div className="flex gap-2 flex-wrap items-center">
                  {['#1e40af', '#0f172a', '#0e7490', '#7c2d12', '#581c87', '#166534', '#9f1239', '#8b1a1a'].map(c => (
                    <button key={c} onClick={() => update('accent', c)} className="bld-swatch" data-active={data.accent === c} style={{ background: c }} aria-label={`Accent ${c}`} />
                  ))}
                  <input type="color" value={data.accent} onChange={e => update('accent', e.target.value)} className="bld-swatch" style={{ padding: 0 }} aria-label="Custom accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={apiSettings}
          onSave={(s) => { setApiSettings(s); saveApiSettings(s); setShowSettings(false); setToast({ msg: 'Settings saved.', kind: 'ok' }); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showResetConfirm && (
        <div className="bld-modal-backdrop no-print" onClick={() => setShowResetConfirm(false)}>
          <div className="bld-modal max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="bld-modal__header">
              <div className="bld-modal__eyebrow">Confirm action</div>
              <h3 className="bld-modal__title">Reset <em>resume</em>?</h3>
              <p className="bld-modal__lede">This replaces your current data. Local edits cannot be recovered.</p>
            </div>
            <div className="bld-modal__body">
              <div className="flex flex-col gap-2">
                <button onClick={resetToStarter} className="bld-btn bld-btn-primary" style={{ justifyContent: 'center' }}>Use sample resume</button>
                <button onClick={startBlank} className="bld-btn" style={{ justifyContent: 'center' }}>Start blank</button>
                <button onClick={() => setShowResetConfirm(false)} className="bld-btn bld-btn-ghost" style={{ justifyContent: 'center' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`bld-toast no-print ${toast.kind === 'err' ? 'bld-toast--err' : ''}`} role="status">
          {toast.kind === 'err' ? <AlertCircle className="w-4 h-4 inline mr-1.5" /> : <Check className="w-4 h-4 inline mr-1.5" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 relative" style={{ zIndex: 1 }}>
        {view === 'edit' && (
          <div className="space-y-4 bld-stagger">
            <div className="bld-card bld-card-ai">
              <div className="bld-card__header">
                <h3 className="bld-card__title">
                  <span className="bld-card__title-num">Op-Ed</span>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Editor's Desk
                </h3>
                {!apiSettings.apiKey && (
                  <button onClick={() => setShowSettings(true)} className="bld-btn bld-btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
                    <Key className="w-3 h-3" /> add key
                  </button>
                )}
              </div>
              <div className="bld-card__body">
                <p style={{ fontFamily: UI_BODY, fontStyle: 'italic', fontSize: 13.5, color: 'var(--ink-2)', margin: '0 0 12px', lineHeight: 1.55 }}>
                  Hand the manuscript to the editor. Describe what you want changed in plain language —
                  &ldquo;tighten the profile&rdquo;, &ldquo;add a bullet about React performance&rdquo;, &ldquo;make experience more impact-oriented&rdquo;.
                </p>
                <div className="bld-field">
                  <label className="bld-label">Target section</label>
                  <select value={aiTarget} onChange={e => setAiTarget(e.target.value as AiTarget)} className="bld-select">
                    <option value="profile">Profile / Summary</option>
                    <option value="all-experience">All Experience</option>
                    {data.experience.map((e, i) => (
                      <option key={i} value={`exp-${i}`}>Experience — {e.role} @ {e.company}</option>
                    ))}
                    <option value="skills">Skills</option>
                    <option value="projects">Projects</option>
                  </select>
                </div>
                <div className="bld-field">
                  <label className="bld-label">Instruction</label>
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Cut filler words and emphasize React + Node achievements." rows={3} className="bld-textarea" />
                </div>
                {aiError && (
                  <div style={{
                    padding: '8px 10px',
                    margin: '0 0 10px',
                    fontFamily: UI_MONO,
                    fontSize: 11,
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    background: 'rgba(139,26,26,0.05)',
                    borderRadius: 2,
                  }}>
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" />{aiError}
                  </div>
                )}
                <button onClick={runAI} disabled={aiLoading || !aiPrompt.trim()} className="bld-btn bld-btn-warm" style={{ width: '100%', justifyContent: 'center', opacity: aiLoading || !aiPrompt.trim() ? 0.5 : 1 }}>
                  {aiLoading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting type…</> : <>Send to press &nbsp;⟶</>}
                </button>
              </div>
            </div>

            <Section title="Personal Info" num="01">
              <div className="flex gap-3 mb-4">
                <div style={{ width: 76, height: 76, background: 'var(--paper)', border: '1px solid var(--ink)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '3px 3px 0 0 var(--ink)' }}>
                  {data.personal.photo
                    ? <img src={data.personal.photo} alt="" className="w-full h-full object-cover" />
                    : <span style={{ fontFamily: UI_MONO, fontSize: 9.5, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ photo ]</span>}
                </div>
                <div className="flex flex-col gap-2 justify-center">
                  <button onClick={() => fileInputRef.current?.click()} className="bld-btn" style={{ fontSize: 12 }}>Upload</button>
                  {data.personal.photo && <button onClick={() => update('personal.photo', '')} className="bld-btn bld-btn-ghost bld-btn-danger" style={{ fontSize: 12 }}>Remove</button>}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </div>
              </div>
              <Input label="Name" value={data.personal.name} onChange={v => update('personal.name', v)} />
              <Input label="Title" value={data.personal.title} onChange={v => update('personal.title', v)} />
              <Input label="Email" value={data.personal.email} onChange={v => update('personal.email', v)} />
              <Input label="Phone" value={data.personal.phone} onChange={v => update('personal.phone', v)} />
              <Input label="Location" value={data.personal.location} onChange={v => update('personal.location', v)} />
              <div className="mt-3">
                <label className="bld-label">Links</label>
                {data.personal.links.map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={link.label} onChange={e => { const next = [...data.personal.links]; next[i].label = e.target.value; update('personal.links', next); }} placeholder="Label" className="bld-input" style={{ width: '34%' }} />
                    <input value={link.url} onChange={e => { const next = [...data.personal.links]; next[i].url = e.target.value; update('personal.links', next); }} placeholder="https://…" className="bld-input" style={{ flex: 1 }} />
                    <button onClick={() => update('personal.links', data.personal.links.filter((_, idx) => idx !== i))} className="bld-btn bld-btn-ghost bld-btn-icon bld-btn-danger"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => update('personal.links', [...data.personal.links, { label: '', url: '' }])} className="bld-btn bld-btn-ghost" style={{ fontSize: 12 }}>
                  <Plus className="w-3 h-3" /> Add link
                </button>
              </div>
            </Section>

            <Section title="Profile / Summary" num="02">
              <textarea value={data.profile} onChange={e => update('profile', e.target.value)} rows={5} className="bld-textarea" />
            </Section>

            <Section title="Experience" num="03" onAdd={() => addArrayItem('experience', { role: 'New Role', company: '', dates: '', bullets: [''] })}>
              {data.experience.map((exp, i) => (
                <ItemCard key={i} onRemove={() => removeArrayItem('experience', i)} onUp={() => moveArrayItem('experience', i, -1)} onDown={() => moveArrayItem('experience', i, 1)}>
                  <Input label="Role" value={exp.role} onChange={v => updateArrayItem('experience', i, 'role', v)} />
                  <Input label="Company" value={exp.company} onChange={v => updateArrayItem('experience', i, 'company', v)} />
                  <Input label="Dates" value={exp.dates} onChange={v => updateArrayItem('experience', i, 'dates', v)} />
                  <div className="mt-2">
                    <label className="bld-label">Bullets</label>
                    {exp.bullets.map((b, bi) => (
                      <div key={bi} className="flex gap-2 mb-2">
                        <textarea value={b} onChange={e => { const next = [...exp.bullets]; next[bi] = e.target.value; updateArrayItem('experience', i, 'bullets', next); }} rows={2} className="bld-textarea" style={{ flex: 1 }} />
                        <button onClick={() => updateArrayItem('experience', i, 'bullets', exp.bullets.filter((_, idx) => idx !== bi))} className="bld-btn bld-btn-ghost bld-btn-icon bld-btn-danger"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => updateArrayItem('experience', i, 'bullets', [...exp.bullets, ''])} className="bld-btn bld-btn-ghost" style={{ fontSize: 12 }}>
                      <Plus className="w-3 h-3" /> Add bullet
                    </button>
                  </div>
                </ItemCard>
              ))}
            </Section>

            <Section title="Education" num="04" onAdd={() => addArrayItem('education', { degree: '', school: '', dates: '' })}>
              {data.education.map((ed, i) => (
                <ItemCard key={i} onRemove={() => removeArrayItem('education', i)} onUp={() => moveArrayItem('education', i, -1)} onDown={() => moveArrayItem('education', i, 1)}>
                  <Input label="Degree" value={ed.degree} onChange={v => updateArrayItem('education', i, 'degree', v)} />
                  <Input label="School" value={ed.school} onChange={v => updateArrayItem('education', i, 'school', v)} />
                  <Input label="Dates" value={ed.dates} onChange={v => updateArrayItem('education', i, 'dates', v)} />
                </ItemCard>
              ))}
            </Section>

            <Section title="Skills" num="05" onAdd={() => addArrayItem('skills', { category: '', items: '' })}>
              {data.skills.map((s, i) => (
                <ItemCard key={i} onRemove={() => removeArrayItem('skills', i)} onUp={() => moveArrayItem('skills', i, -1)} onDown={() => moveArrayItem('skills', i, 1)}>
                  <Input label="Category" value={s.category} onChange={v => updateArrayItem('skills', i, 'category', v)} />
                  <Input label="Items (comma-separated)" value={s.items} onChange={v => updateArrayItem('skills', i, 'items', v)} />
                </ItemCard>
              ))}
            </Section>

            <Section title="Certifications" num="06" onAdd={() => addArrayItem('certifications', { name: '', issuer: '' })}>
              {data.certifications.map((c, i) => (
                <ItemCard key={i} onRemove={() => removeArrayItem('certifications', i)} onUp={() => moveArrayItem('certifications', i, -1)} onDown={() => moveArrayItem('certifications', i, 1)}>
                  <Input label="Name" value={c.name} onChange={v => updateArrayItem('certifications', i, 'name', v)} />
                  <Input label="Issuer" value={c.issuer} onChange={v => updateArrayItem('certifications', i, 'issuer', v)} />
                </ItemCard>
              ))}
            </Section>

            <Section title="Key Strengths" num="07" onAdd={() => update('strengths', [...data.strengths, ''])}>
              {data.strengths.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={s} onChange={e => { const next = [...data.strengths]; next[i] = e.target.value; update('strengths', next); }} className="bld-input" style={{ flex: 1 }} />
                  <button onClick={() => update('strengths', data.strengths.filter((_, idx) => idx !== i))} className="bld-btn bld-btn-ghost bld-btn-icon bld-btn-danger"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </Section>

            <Section title="Projects" num="08" onAdd={() => addArrayItem('projects', { name: '', tech: '', description: '', link: '' })}>
              {data.projects.map((p, i) => (
                <ItemCard key={i} onRemove={() => removeArrayItem('projects', i)} onUp={() => moveArrayItem('projects', i, -1)} onDown={() => moveArrayItem('projects', i, 1)}>
                  <Input label="Name" value={p.name} onChange={v => updateArrayItem('projects', i, 'name', v)} />
                  <Input label="Tech" value={p.tech} onChange={v => updateArrayItem('projects', i, 'tech', v)} />
                  <Input label="Description" value={p.description} onChange={v => updateArrayItem('projects', i, 'description', v)} />
                  <Input label="Link" value={p.link} onChange={v => updateArrayItem('projects', i, 'link', v)} />
                </ItemCard>
              ))}
            </Section>
          </div>
        )}

        <div className={`bld-print-host ${view === 'preview' ? 'lg:col-span-2' : ''} bld-rise`} style={{ animationDelay: '160ms' }}>
          <div id="resume-print" className="bld-page-frame" style={{ maxWidth: '8.5in', minHeight: '11in' }}>
            <ResumeRenderer data={data} />
          </div>
          <p className="bld-page-meta no-print">
            <span style={{ fontFamily: UI_MONO }}>{String(TEMPLATES.findIndex(t => t.id === data.template) + 1).padStart(2, '0')}</span>
            {' · '}<strong>{TEMPLATES.find(t => t.id === data.template)?.name}</strong>
            {' · '}click <span style={{ color: 'var(--ink-2)' }}>Template</span> above to switch
          </p>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// SUB-COMPONENTS
// =====================================================================

function SettingsModal({ settings, onSave, onClose }: { settings: ApiSettings; onSave: (s: ApiSettings) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ApiSettings>(settings);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const out = await callChat(draft, [{ role: 'user', content: 'Say only the word: ok' }]);
      setTestResult({ ok: true, msg: `Connected — model replied: "${out.trim().slice(0, 60)}"` });
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bld-modal-backdrop no-print bld-scroll" onClick={onClose}>
      <div className="bld-modal max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="bld-modal__header">
          <div className="bld-modal__eyebrow">§ Provider config</div>
          <h3 className="bld-modal__title">AI <em>settings</em></h3>
          <p className="bld-modal__lede">
            Any OpenAI-compatible endpoint works. Defaults come from <span style={{ fontFamily: UI_MONO, fontStyle: 'normal', fontSize: 12, color: 'var(--ink)' }}>.env</span> — overrides save to localStorage. Either way the key is sent from the browser, so this is fine for local use, <strong style={{ color: 'var(--accent)' }}>not</strong> for public deployment.
          </p>
        </div>
        <div className="bld-modal__body">
          <div className="bld-field">
            <label className="bld-label">Base URL</label>
            <input
              className="bld-input"
              value={draft.baseUrl}
              onChange={e => setDraft({ ...draft, baseUrl: e.target.value })}
              placeholder="https://api.x.ai/v1"
            />
            <div style={{ fontFamily: UI_MONO, fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.04em', lineHeight: 1.6 }}>
              <div>Groq: <span style={{ color: 'var(--ink)' }}>https://api.groq.com/openai/v1</span></div>
              <div>Grok (xAI): <span style={{ color: 'var(--ink)' }}>https://api.x.ai/v1</span></div>
              <div>OpenAI: <span style={{ color: 'var(--ink)' }}>https://api.openai.com/v1</span> &middot; OpenRouter: <span style={{ color: 'var(--ink)' }}>https://openrouter.ai/api/v1</span></div>
            </div>
          </div>
          <div className="bld-field">
            <label className="bld-label">API Key</label>
            <input
              className="bld-input"
              type="password"
              autoComplete="off"
              value={draft.apiKey}
              onChange={e => setDraft({ ...draft, apiKey: e.target.value })}
              placeholder="xai-… / sk-… / sk-or-v1-…"
            />
          </div>
          <div className="bld-field">
            <label className="bld-label">Model</label>
            <input
              className="bld-input"
              value={draft.model}
              onChange={e => setDraft({ ...draft, model: e.target.value })}
              placeholder="grok-4-fast-non-reasoning"
            />
            <div style={{ fontFamily: UI_MONO, fontSize: 10, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.04em', lineHeight: 1.6 }}>
              <div>Groq: <span style={{ color: 'var(--ink)' }}>llama-3.3-70b-versatile</span>, <span style={{ color: 'var(--ink)' }}>llama-3.1-8b-instant</span></div>
              <div>Grok (xAI): <span style={{ color: 'var(--ink)' }}>grok-4-fast-non-reasoning</span></div>
            </div>
          </div>

          {testResult && (
            <div style={{
              padding: '10px 12px',
              marginTop: 6,
              border: `1px solid ${testResult.ok ? 'var(--ink)' : 'var(--accent)'}`,
              background: testResult.ok ? 'var(--paper)' : 'rgba(139,26,26,0.06)',
              fontFamily: UI_MONO,
              fontSize: 11.5,
              color: testResult.ok ? 'var(--ink)' : 'var(--accent)',
              borderRadius: 2,
              boxShadow: `2px 2px 0 0 ${testResult.ok ? 'var(--ink)' : 'var(--accent)'}`,
            }}>
              {testResult.ok ? <Check className="w-3.5 h-3.5 inline mr-1.5" /> : <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />}
              {testResult.msg}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={test} disabled={testing || !draft.apiKey} className="bld-btn" style={{ flex: 1, justifyContent: 'center', opacity: testing || !draft.apiKey ? 0.6 : 1 }}>
              {testing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Key className="w-3.5 h-3.5" /> Test connection</>}
            </button>
            <button onClick={() => onSave(draft)} className="bld-btn bld-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
          <button
            onClick={() => { try { localStorage.removeItem(API_KEY); } catch { /* noop */ } setDraft(DEFAULT_API); setTestResult(null); }}
            className="bld-btn bld-btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12 }}
            title="Clear localStorage overrides and restore .env defaults"
          >
            Reset to .env defaults
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: 'edit' | 'preview'; onChange: (v: 'edit' | 'preview') => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number }>({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const target = value === 'edit' ? editRef.current : previewRef.current;
    const host = containerRef.current;
    if (!target || !host) return;
    const hostRect = host.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    setIndicator({ x: tRect.left - hostRect.left - 3, w: tRect.width });
  }, [value]);

  return (
    <div ref={containerRef} className="bld-toggle">
      <span
        className="bld-toggle__indicator"
        style={{ transform: `translateX(${indicator.x}px)`, width: indicator.w }}
      />
      <button
        ref={editRef}
        type="button"
        onClick={() => onChange('edit')}
        className="bld-toggle__btn"
        data-active={value === 'edit'}
      >
        <Edit3 className="w-3.5 h-3.5" /> Edit
      </button>
      <button
        ref={previewRef}
        type="button"
        onClick={() => onChange('preview')}
        className="bld-toggle__btn"
        data-active={value === 'preview'}
      >
        <Eye className="w-3.5 h-3.5" /> Preview
      </button>
    </div>
  );
}

function Section({ title, children, onAdd, num }: { title: string; children: ReactNode; onAdd?: () => void; num?: string }) {
  return (
    <div className="bld-card">
      <div className="bld-card__header">
        <h3 className="bld-card__title">
          {num && <span className="bld-card__title-num">{num}</span>}
          {title}
        </h3>
        {onAdd && (
          <button onClick={onAdd} className="bld-btn bld-btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      <div className="bld-card__body">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="bld-field">
      <label className="bld-label">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="bld-input" />
    </div>
  );
}

function ItemCard({ children, onRemove, onUp, onDown }: { children: ReactNode; onRemove: () => void; onUp: () => void; onDown: () => void }) {
  return (
    <div className="bld-item">
      <div className="bld-item__actions">
        <button onClick={onUp} className="bld-item__action" title="Move up"><ChevronUp className="w-3.5 h-3.5" /></button>
        <button onClick={onDown} className="bld-item__action" title="Move down"><ChevronDown className="w-3.5 h-3.5" /></button>
        <button onClick={onRemove} className="bld-item__action bld-item__action--danger" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {children}
    </div>
  );
}

function TemplateThumbnail({ id, accent }: { id: TemplateId; accent: string }) {
  const base: React.CSSProperties = { width: '100%', height: '60px', marginTop: '10px', borderRadius: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', overflow: 'hidden' };
  if (id === 'modern') {
    return (
      <div style={base}>
        <div style={{ width: '35%', background: accent, padding: '6px' }}>
          <div style={{ width: '60%', height: '4px', background: 'rgba(255,255,255,0.7)', marginBottom: '3px' }} />
          <div style={{ width: '80%', height: '3px', background: 'rgba(255,255,255,0.5)', marginBottom: '6px' }} />
          <div style={{ width: '70%', height: '2px', background: 'rgba(255,255,255,0.4)', marginBottom: '2px' }} />
          <div style={{ width: '85%', height: '2px', background: 'rgba(255,255,255,0.4)' }} />
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ width: '70%', height: '4px', background: '#1e293b', marginBottom: '3px' }} />
          <div style={{ width: '90%', height: '2px', background: '#94a3b8', marginBottom: '2px' }} />
          <div style={{ width: '85%', height: '2px', background: '#94a3b8', marginBottom: '4px' }} />
          <div style={{ width: '50%', height: '3px', background: accent, marginBottom: '2px' }} />
          <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
          <div style={{ width: '85%', height: '2px', background: '#cbd5e1' }} />
        </div>
      </div>
    );
  }
  if (id === 'classic') {
    return (
      <div style={{ ...base, padding: '6px', flexDirection: 'column' }}>
        <div style={{ width: '50%', height: '5px', background: '#1e293b', margin: '0 auto 3px' }} />
        <div style={{ width: '70%', height: '2px', background: '#94a3b8', margin: '0 auto 6px' }} />
        <div style={{ width: '100%', height: '1px', background: '#1e293b', marginBottom: '3px' }} />
        <div style={{ width: '40%', height: '3px', background: '#1e293b', marginBottom: '2px' }} />
        <div style={{ width: '95%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
        <div style={{ width: '90%', height: '2px', background: '#cbd5e1' }} />
      </div>
    );
  }
  if (id === 'executive') {
    return (
      <div style={{ ...base, padding: '6px', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '60%', height: '5px', background: accent, marginBottom: '3px' }} />
        <div style={{ width: '40%', height: '2px', background: '#94a3b8', marginBottom: '2px' }} />
        <div style={{ width: '70%', height: '1px', background: '#94a3b8', marginBottom: '6px' }} />
        <div style={{ width: '100%' }}>
          <div style={{ width: '30%', height: '3px', background: accent, marginBottom: '2px' }} />
          <div style={{ width: '95%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
          <div style={{ width: '88%', height: '2px', background: '#cbd5e1' }} />
        </div>
      </div>
    );
  }
  if (id === 'technical') {
    return (
      <div style={base}>
        <div style={{ width: '40%', background: '#f1f5f9', padding: '6px' }}>
          <div style={{ width: '50%', height: '3px', background: accent, marginBottom: '3px' }} />
          <div style={{ width: '90%', height: '2px', background: '#94a3b8', marginBottom: '1px' }} />
          <div style={{ width: '80%', height: '2px', background: '#94a3b8', marginBottom: '4px' }} />
          <div style={{ width: '50%', height: '3px', background: accent, marginBottom: '3px' }} />
          <div style={{ width: '85%', height: '2px', background: '#94a3b8' }} />
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ width: '70%', height: '4px', background: '#1e293b', marginBottom: '3px' }} />
          <div style={{ width: '95%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
          <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '4px' }} />
          <div style={{ width: '50%', height: '3px', background: accent, marginBottom: '2px' }} />
          <div style={{ width: '90%', height: '2px', background: '#cbd5e1' }} />
        </div>
      </div>
    );
  }
  if (id === 'compact') {
    return (
      <div style={{ ...base, padding: '5px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <div style={{ width: '40%', height: '4px', background: '#1e293b' }} />
          <div style={{ width: '30%', height: '2px', background: '#94a3b8' }} />
        </div>
        <div style={{ width: '100%', height: '1px', background: accent, marginBottom: '3px' }} />
        <div style={{ width: '95%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
        <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
        <div style={{ width: '92%', height: '2px', background: '#cbd5e1', marginBottom: '3px' }} />
        <div style={{ width: '95%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
        <div style={{ width: '90%', height: '2px', background: '#cbd5e1' }} />
      </div>
    );
  }
  if (id === 'minimal') {
    return (
      <div style={{ ...base, padding: '8px', flexDirection: 'column' }}>
        <div style={{ width: '40%', height: '5px', background: '#1e293b', marginBottom: '3px' }} />
        <div style={{ width: '25%', height: '2px', background: '#94a3b8', marginBottom: '8px' }} />
        <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '2px' }} />
        <div style={{ width: '85%', height: '2px', background: '#cbd5e1', marginBottom: '6px' }} />
        <div style={{ width: '20%', height: '2px', background: '#94a3b8' }} />
      </div>
    );
  }
  if (id === 'sidebar') {
    return (
      <div style={base}>
        <div style={{ width: '32%', background: '#f8fafc', padding: '6px', borderRight: `2px solid ${accent}` }}>
          <div style={{ width: '70%', height: '5px', background: '#1e293b', marginBottom: '3px' }} />
          <div style={{ width: '50%', height: '2px', background: accent, marginBottom: '4px' }} />
          <div style={{ width: '85%', height: '2px', background: '#94a3b8', marginBottom: '1px' }} />
          <div style={{ width: '80%', height: '2px', background: '#94a3b8' }} />
        </div>
        <div style={{ flex: 1, padding: '6px' }}>
          <div style={{ width: '40%', height: '3px', background: accent, marginBottom: '4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: accent }} />
            <div style={{ flex: 1, height: '2px', background: '#cbd5e1' }} />
          </div>
          <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginLeft: '8px', marginBottom: '4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: accent }} />
            <div style={{ flex: 1, height: '2px', background: '#cbd5e1' }} />
          </div>
        </div>
      </div>
    );
  }
  if (id === 'professional') {
    return (
      <div style={{ ...base, flexDirection: 'column', padding: 0 }}>
        <div style={{ background: accent, padding: '5px', height: '20px' }}>
          <div style={{ width: '50%', height: '4px', background: 'rgba(255,255,255,0.9)', marginBottom: '2px' }} />
          <div style={{ width: '30%', height: '2px', background: 'rgba(255,255,255,0.6)' }} />
        </div>
        <div style={{ padding: '5px', flex: 1 }}>
          <div style={{ width: '40%', height: '3px', background: accent, marginBottom: '3px' }} />
          <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: '4px' }}>
            <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
            <div style={{ width: '85%', height: '2px', background: '#cbd5e1' }} />
          </div>
        </div>
      </div>
    );
  }
  if (id === 'creative') {
    return (
      <div style={{ ...base, flexDirection: 'column' }}>
        <div style={{ padding: '5px', borderBottom: `3px solid ${accent}` }}>
          <div style={{ width: '20%', height: '2px', background: accent, marginBottom: '2px' }} />
          <div style={{ width: '70%', height: '6px', background: '#0f172a' }} />
        </div>
        <div style={{ display: 'flex', flex: 1, padding: '5px' }}>
          <div style={{ width: '60%', paddingRight: '4px' }}>
            <div style={{ width: '40%', height: '3px', background: '#0f172a', marginBottom: '2px' }} />
            <div style={{ width: '90%', height: '2px', background: '#cbd5e1', marginBottom: '1px' }} />
            <div style={{ width: '85%', height: '2px', background: '#cbd5e1' }} />
          </div>
          <div style={{ width: '40%', paddingLeft: '4px', borderLeft: `1px solid ${accent}40` }}>
            <div style={{ width: '60%', height: '2px', background: accent, marginBottom: '1px' }} />
            <div style={{ width: '85%', height: '2px', background: '#cbd5e1' }} />
          </div>
        </div>
      </div>
    );
  }
  return null;
}

// =====================================================================
// TEMPLATE RENDERERS
// =====================================================================

function ResumeRenderer({ data }: { data: ResumeData }) {
  switch (data.template) {
    case 'classic': return <TemplateClassic data={data} />;
    case 'executive': return <TemplateExecutive data={data} />;
    case 'technical': return <TemplateTechnical data={data} />;
    case 'compact': return <TemplateCompact data={data} />;
    case 'minimal': return <TemplateMinimal data={data} />;
    case 'sidebar': return <TemplateSidebar data={data} />;
    case 'professional': return <TemplateProfessional data={data} />;
    case 'creative': return <TemplateCreative data={data} />;
    case 'modern':
    default: return <TemplateModern data={data} />;
  }
}

const baseTextStyle: React.CSSProperties = {
  fontFamily: FONT_STACK,
  color: '#0f172a',
  lineHeight: 1.5,
  fontSize: '10pt',
};

type TemplateProps = { data: ResumeData };

function TemplateModern({ data }: TemplateProps) {
  const accent = data.accent || '#1e40af';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, display: 'flex', minHeight: '11in' }}>
      <div style={{ width: '34%', background: accent, color: '#fff', padding: '28pt 18pt' }}>
        {data.personal.photo && (
          <div style={{ textAlign: 'center', marginBottom: '16pt' }}>
            <img src={data.personal.photo} alt="" style={{ width: '90pt', height: '90pt', borderRadius: '50%', objectFit: 'cover', border: '2pt solid rgba(255,255,255,0.4)' }} />
          </div>
        )}
        <SidebarHeading>Contact</SidebarHeading>
        <div style={{ fontSize: '9pt', lineHeight: 1.7 }}>
          {data.personal.email && <div style={{ wordBreak: 'break-word', marginBottom: '3pt' }}>{data.personal.email}</div>}
          {data.personal.phone && <div style={{ marginBottom: '3pt' }}>{data.personal.phone}</div>}
          {data.personal.location && <div style={{ marginBottom: '3pt' }}>{data.personal.location}</div>}
          {links.map((l, i) => (
            <div key={i} style={{ marginTop: '4pt', wordBreak: 'break-word' }}>
              <span style={{ opacity: 0.75, fontSize: '8pt' }}>{l.label}:</span><br/>
              {l.url || ''}
            </div>
          ))}
        </div>

        {data.skills.length > 0 && (
          <>
            <SidebarHeading>Skills</SidebarHeading>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: '8pt' }}>
                <div style={{ fontWeight: 600, fontSize: '9.5pt', marginBottom: '2pt' }}>{s.category}</div>
                <div style={{ fontSize: '8.5pt', lineHeight: 1.5, opacity: 0.92 }}>{s.items}</div>
              </div>
            ))}
          </>
        )}

        {data.education.length > 0 && (
          <>
            <SidebarHeading>Education</SidebarHeading>
            {data.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: '8pt' }}>
                <div style={{ fontWeight: 600, fontSize: '9.5pt', lineHeight: 1.35 }}>{ed.degree}</div>
                <div style={{ fontSize: '8.5pt', opacity: 0.92 }}>{ed.school}</div>
                <div style={{ fontSize: '8pt', opacity: 0.75, marginTop: '1pt' }}>{ed.dates}</div>
              </div>
            ))}
          </>
        )}

        {data.certifications.length > 0 && (
          <>
            <SidebarHeading>Certifications</SidebarHeading>
            {data.certifications.map((c, i) => (
              <div key={i} style={{ marginBottom: '6pt' }}>
                <div style={{ fontWeight: 600, fontSize: '9pt' }}>{c.name}</div>
                <div style={{ fontSize: '8.5pt', opacity: 0.85 }}>{c.issuer}</div>
              </div>
            ))}
          </>
        )}

        {data.strengths.length > 0 && (
          <>
            <SidebarHeading>Strengths</SidebarHeading>
            <ul style={{ margin: 0, padding: '0 0 0 14pt', fontSize: '8.5pt', lineHeight: 1.6 }}>
              {data.strengths.map((s, i) => <li key={i} style={{ marginBottom: '2pt' }}>{s}</li>)}
            </ul>
          </>
        )}
      </div>

      <div style={{ width: '66%', padding: '28pt 26pt' }}>
        <div style={{ marginBottom: '18pt' }}>
          <h1 style={{ margin: 0, fontSize: '26pt', fontWeight: 700, letterSpacing: '-0.5pt', color: '#0f172a', lineHeight: 1.1 }}>{data.personal.name}</h1>
          {data.personal.title && <div style={{ fontSize: '12pt', color: accent, marginTop: '4pt', fontWeight: 500 }}>{data.personal.title}</div>}
        </div>

        {data.profile && <Block accent={accent} title="Profile"><p style={{ margin: 0, fontSize: '10pt', lineHeight: 1.55 }}>{data.profile}</p></Block>}

        {data.experience.length > 0 && (
          <Block accent={accent} title="Experience">
            {data.experience.map((e, i) => <ExperienceItem key={i} e={e} accent={accent} />)}
          </Block>
        )}

        {data.projects.length > 0 && (
          <Block accent={accent} title="Projects">
            {data.projects.map((p, i) => <ProjectItem key={i} p={p} accent={accent} />)}
          </Block>
        )}
      </div>
    </div>
  );
}

function SidebarHeading({ children }: { children: ReactNode }) {
  return <h3 style={{ fontSize: '10pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', margin: '16pt 0 8pt 0', paddingBottom: '4pt', borderBottom: '1pt solid rgba(255,255,255,0.3)' }}>{children}</h3>;
}

function Block({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14pt' }}>
      <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2pt', color: accent, margin: '0 0 8pt 0', paddingBottom: '3pt', borderBottom: `1.5pt solid ${accent}` }}>{title}</h2>
      {children}
    </div>
  );
}

function ExperienceItem({ e, accent }: { e: Experience; accent: string }) {
  return (
    <div style={{ marginBottom: '11pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6pt' }}>
        <div style={{ fontWeight: 600, fontSize: '10.5pt', color: '#0f172a' }}>{e.role}</div>
        <div style={{ fontSize: '9pt', color: '#64748b', fontWeight: 500 }}>{e.dates}</div>
      </div>
      <div style={{ fontSize: '9.5pt', color: accent, fontWeight: 500, marginBottom: '4pt' }}>{e.company}</div>
      <ul style={{ margin: '2pt 0 0 0', paddingLeft: '14pt' }}>
        {e.bullets.filter(b => b.trim()).map((b, bi) => (
          <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.5 }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function ProjectItem({ p, accent }: { p: Project; accent: string }) {
  return (
    <div style={{ marginBottom: '8pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8pt', flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 600, fontSize: '10pt' }}>
          <ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} />
        </div>
        <div style={{ fontSize: '8.5pt', color: '#64748b', fontStyle: 'italic' }}>{p.tech}</div>
      </div>
      <div style={{ fontSize: '9.5pt', color: '#334155', marginTop: '1pt', lineHeight: 1.5 }}>{p.description}</div>
    </div>
  );
}

function ProjectName({ name, link, color, hoverColor }: { name: string; link?: string; color: string; hoverColor?: string }) {
  if (!link) return <span style={{ color }}>{name}</span>;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color, textDecoration: 'none', borderBottom: `1px dotted ${hoverColor || color}80`, paddingBottom: '0.5pt' }}
    >
      {name}
    </a>
  );
}

function TemplateClassic({ data }: TemplateProps) {
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, padding: '32pt 40pt' }}>
      <div style={{ textAlign: 'center', marginBottom: '14pt', paddingBottom: '10pt', borderBottom: '1.5pt solid #0f172a' }}>
        <h1 style={{ margin: 0, fontSize: '22pt', fontWeight: 700, letterSpacing: '0.5pt' }}>{data.personal.name}</h1>
        {data.personal.title && <div style={{ fontSize: '11pt', color: '#475569', marginTop: '3pt', fontWeight: 500 }}>{data.personal.title}</div>}
        <div style={{ fontSize: '9.5pt', color: '#475569', marginTop: '6pt' }}>
          {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join('  •  ')}
        </div>
        {links.length > 0 && (
          <div style={{ fontSize: '9.5pt', color: '#475569', marginTop: '2pt' }}>
            {links.map((l, i) => <span key={i}>{i > 0 && '  •  '}{l.url ? <a href={l.url} style={{ color: '#475569' }}>{l.label}</a> : l.label}</span>)}
          </div>
        )}
      </div>

      {data.profile && <ClassicSection title="Professional Summary"><p style={{ margin: 0, lineHeight: 1.55 }}>{data.profile}</p></ClassicSection>}

      {data.experience.length > 0 && (
        <ClassicSection title="Professional Experience">
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: '11pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div><span style={{ fontWeight: 700, fontSize: '10.5pt' }}>{e.role}</span><span style={{ fontWeight: 400, color: '#475569' }}> — {e.company}</span></div>
                <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>{e.dates}</div>
              </div>
              <ul style={{ margin: '3pt 0 0 0', paddingLeft: '16pt' }}>
                {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.5 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </ClassicSection>
      )}

      {data.education.length > 0 && (
        <ClassicSection title="Education">
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: '5pt', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div><span style={{ fontWeight: 700 }}>{ed.degree}</span><span style={{ color: '#475569' }}> — {ed.school}</span></div>
              <div style={{ fontSize: '9pt', color: '#64748b', fontStyle: 'italic' }}>{ed.dates}</div>
            </div>
          ))}
        </ClassicSection>
      )}

      {data.skills.length > 0 && (
        <ClassicSection title="Technical Skills">
          {data.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: '3pt', fontSize: '9.5pt' }}>
              <span style={{ fontWeight: 700 }}>{s.category}:</span> {s.items}
            </div>
          ))}
        </ClassicSection>
      )}

      {data.certifications.length > 0 && (
        <ClassicSection title="Certifications">
          {data.certifications.map((c, i) => (
            <div key={i} style={{ marginBottom: '2pt', fontSize: '9.5pt' }}>
              <span style={{ fontWeight: 700 }}>{c.name}</span><span style={{ color: '#475569' }}> — {c.issuer}</span>
            </div>
          ))}
        </ClassicSection>
      )}

      {data.projects.length > 0 && (
        <ClassicSection title="Projects">
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: '6pt' }}>
              <div><span style={{ fontWeight: 700 }}><ProjectName name={p.name} link={p.link} color="#0f172a" /></span><span style={{ color: '#475569', fontStyle: 'italic' }}> — {p.tech}</span></div>
              <div style={{ fontSize: '9.5pt', lineHeight: 1.5 }}>{p.description}</div>
            </div>
          ))}
        </ClassicSection>
      )}
    </div>
  );
}

function ClassicSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '12pt' }}>
      <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', margin: '0 0 6pt 0', borderBottom: '0.75pt solid #cbd5e1', paddingBottom: '2pt' }}>{title}</h2>
      {children}
    </div>
  );
}

function TemplateExecutive({ data }: TemplateProps) {
  const accent = data.accent || '#0f172a';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, padding: '36pt 44pt' }}>
      <div style={{ textAlign: 'center', marginBottom: '18pt' }}>
        {data.personal.photo && <img src={data.personal.photo} alt="" style={{ width: '72pt', height: '72pt', borderRadius: '50%', objectFit: 'cover', marginBottom: '8pt' }} />}
        <h1 style={{ margin: 0, fontSize: '24pt', fontWeight: 700, letterSpacing: '2pt', textTransform: 'uppercase' }}>{data.personal.name}</h1>
        {data.personal.title && <div style={{ fontSize: '11pt', color: accent, marginTop: '4pt', fontWeight: 500, letterSpacing: '0.5pt' }}>{data.personal.title}</div>}
        <div style={{ width: '60pt', height: '2pt', background: accent, margin: '10pt auto' }} />
        <div style={{ fontSize: '9.5pt', color: '#475569' }}>
          {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join('   |   ')}
        </div>
        {links.length > 0 && (
          <div style={{ fontSize: '9.5pt', color: '#475569', marginTop: '2pt' }}>
            {links.map((l, i) => <span key={i}>{i > 0 && '   |   '}{l.url ? <a href={l.url} style={{ color: '#475569' }}>{l.label}</a> : l.label}</span>)}
          </div>
        )}
      </div>

      {data.profile && (
        <div style={{ marginBottom: '14pt', textAlign: 'center', fontSize: '10pt', lineHeight: 1.6, fontStyle: 'italic', color: '#334155', padding: '0 20pt' }}>
          "{data.profile}"
        </div>
      )}

      {data.experience.length > 0 && (
        <ExecSection accent={accent} title="Experience">
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: '12pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700, fontSize: '11pt' }}>{e.role}</div>
                <div style={{ fontSize: '9pt', color: '#64748b' }}>{e.dates}</div>
              </div>
              <div style={{ fontSize: '10pt', color: accent, marginBottom: '3pt', fontWeight: 500 }}>{e.company}</div>
              <ul style={{ margin: 0, paddingLeft: '14pt' }}>
                {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.55 }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </ExecSection>
      )}

      {data.skills.length > 0 && (
        <ExecSection accent={accent} title="Core Competencies">
          {data.skills.map((s, i) => (
            <div key={i} style={{ marginBottom: '3pt', fontSize: '9.5pt' }}>
              <span style={{ fontWeight: 700 }}>{s.category}:</span> {s.items}
            </div>
          ))}
        </ExecSection>
      )}

      {data.education.length > 0 && (
        <ExecSection accent={accent} title="Education">
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: '5pt', display: 'flex', justifyContent: 'space-between' }}>
              <div><span style={{ fontWeight: 700 }}>{ed.degree}</span> — {ed.school}</div>
              <div style={{ fontSize: '9pt', color: '#64748b' }}>{ed.dates}</div>
            </div>
          ))}
        </ExecSection>
      )}

      {data.certifications.length > 0 && (
        <ExecSection accent={accent} title="Certifications">
          {data.certifications.map((c, i) => (
            <div key={i} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}><span style={{ fontWeight: 700 }}>{c.name}</span> — {c.issuer}</div>
          ))}
        </ExecSection>
      )}

      {data.projects.length > 0 && (
        <ExecSection accent={accent} title="Selected Projects">
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: '6pt', fontSize: '9.5pt' }}>
              <span style={{ fontWeight: 700 }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></span> <span style={{ color: '#64748b', fontStyle: 'italic' }}>({p.tech})</span> — {p.description}
            </div>
          ))}
        </ExecSection>
      )}
    </div>
  );
}

function ExecSection({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14pt' }}>
      <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2pt', textAlign: 'center', margin: '0 0 8pt 0', color: accent }}>{title}</h2>
      <div style={{ width: '40pt', height: '1pt', background: accent, margin: '0 auto 10pt' }} />
      {children}
    </div>
  );
}

function TemplateTechnical({ data }: TemplateProps) {
  const accent = data.accent || '#0e7490';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle }}>
      <div style={{ padding: '22pt 30pt 14pt', borderBottom: `2pt solid ${accent}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14pt' }}>
          {data.personal.photo && <img src={data.personal.photo} alt="" style={{ width: '60pt', height: '60pt', borderRadius: '6pt', objectFit: 'cover' }} />}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '22pt', fontWeight: 700, color: '#0f172a' }}>{data.personal.name}</h1>
            {data.personal.title && <div style={{ fontSize: '11pt', color: accent, fontWeight: 600, marginTop: '2pt' }}>{data.personal.title}</div>}
            <div style={{ fontSize: '9.5pt', color: '#475569', marginTop: '4pt' }}>
              {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join('  •  ')}
            </div>
            {links.length > 0 && (
              <div style={{ fontSize: '9.5pt', color: accent, marginTop: '2pt' }}>
                {links.map((l, i) => <span key={i}>{i > 0 && '  •  '}{l.url ? <a href={l.url} style={{ color: accent }}>{l.label}</a> : l.label}</span>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', padding: '18pt 30pt' }}>
        <div style={{ width: '32%', paddingRight: '16pt', borderRight: '1pt solid #e2e8f0' }}>
          {data.skills.length > 0 && (
            <TechBlock accent={accent} title="Technical Stack">
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: '8pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a', marginBottom: '2pt' }}>{s.category}</div>
                  <div style={{ fontSize: '9pt', color: '#334155', lineHeight: 1.5 }}>{s.items}</div>
                </div>
              ))}
            </TechBlock>
          )}
          {data.education.length > 0 && (
            <TechBlock accent={accent} title="Education">
              {data.education.map((ed, i) => (
                <div key={i} style={{ marginBottom: '7pt', fontSize: '9pt' }}>
                  <div style={{ fontWeight: 700 }}>{ed.degree}</div>
                  <div style={{ color: '#334155' }}>{ed.school}</div>
                  <div style={{ color: '#64748b', fontSize: '8.5pt', marginTop: '1pt' }}>{ed.dates}</div>
                </div>
              ))}
            </TechBlock>
          )}
          {data.certifications.length > 0 && (
            <TechBlock accent={accent} title="Certifications">
              {data.certifications.map((c, i) => (
                <div key={i} style={{ marginBottom: '5pt', fontSize: '9pt' }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ color: '#475569', fontSize: '8.5pt' }}>{c.issuer}</div>
                </div>
              ))}
            </TechBlock>
          )}
        </div>

        <div style={{ width: '68%', paddingLeft: '20pt' }}>
          {data.profile && (
            <TechBlock accent={accent} title="Summary">
              <p style={{ margin: 0, lineHeight: 1.55 }}>{data.profile}</p>
            </TechBlock>
          )}
          {data.experience.length > 0 && (
            <TechBlock accent={accent} title="Experience">
              {data.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: '10pt' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700, fontSize: '10.5pt' }}>{e.role}</div>
                    <div style={{ fontSize: '9pt', color: '#64748b', fontFamily: 'monospace' }}>{e.dates}</div>
                  </div>
                  <div style={{ fontSize: '9.5pt', color: accent, fontWeight: 600, marginBottom: '3pt' }}>{e.company}</div>
                  <ul style={{ margin: 0, paddingLeft: '14pt' }}>
                    {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.5 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </TechBlock>
          )}
          {data.projects.length > 0 && (
            <TechBlock accent={accent} title="Projects">
              {data.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: '7pt' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6pt', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '10pt' }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></div>
                    <div style={{ fontSize: '8.5pt', color: accent, fontFamily: 'monospace' }}>{p.tech}</div>
                  </div>
                  <div style={{ fontSize: '9.5pt', lineHeight: 1.5, color: '#334155' }}>{p.description}</div>
                </div>
              ))}
            </TechBlock>
          )}
        </div>
      </div>
    </div>
  );
}

function TechBlock({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14pt' }}>
      <h2 style={{ fontSize: '10pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', color: accent, margin: '0 0 7pt 0' }}>{title}</h2>
      {children}
    </div>
  );
}

function TemplateCompact({ data }: TemplateProps) {
  const accent = data.accent || '#0f172a';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, padding: '22pt 28pt', fontSize: '9.5pt' }}>
      <div style={{ marginBottom: '8pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '8pt' }}>
          <h1 style={{ margin: 0, fontSize: '20pt', fontWeight: 700, letterSpacing: '-0.3pt' }}>{data.personal.name}</h1>
          <div style={{ fontSize: '9pt', color: '#475569', textAlign: 'right' }}>
            <div>{[data.personal.email, data.personal.phone].filter(Boolean).join('  •  ')}</div>
            <div>{[data.personal.location, ...links.map(l => l.label)].filter(Boolean).join('  •  ')}</div>
          </div>
        </div>
        {data.personal.title && <div style={{ fontSize: '10.5pt', color: accent, fontWeight: 500, marginTop: '2pt' }}>{data.personal.title}</div>}
        <div style={{ height: '1.5pt', background: accent, marginTop: '6pt' }} />
      </div>

      {data.profile && <div style={{ marginBottom: '8pt', fontSize: '9.5pt', lineHeight: 1.5 }}>{data.profile}</div>}

      {data.experience.length > 0 && (
        <CompactSection accent={accent} title="Experience">
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: '7pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div><span style={{ fontWeight: 700 }}>{e.role}</span><span style={{ color: '#475569' }}>, {e.company}</span></div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{e.dates}</div>
              </div>
              <ul style={{ margin: '1pt 0 0 0', paddingLeft: '13pt' }}>
                {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9pt', lineHeight: 1.45, marginBottom: '1pt' }}>{b}</li>)}
              </ul>
            </div>
          ))}
        </CompactSection>
      )}

      {data.projects.length > 0 && (
        <CompactSection accent={accent} title="Projects">
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: '3pt', fontSize: '9pt' }}>
              <span style={{ fontWeight: 700 }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></span> <span style={{ color: '#64748b', fontStyle: 'italic' }}>({p.tech})</span> — {p.description}
            </div>
          ))}
        </CompactSection>
      )}

      <div style={{ display: 'flex', gap: '20pt' }}>
        {data.skills.length > 0 && (
          <div style={{ flex: 1 }}>
            <CompactSection accent={accent} title="Skills">
              {data.skills.map((s, i) => (
                <div key={i} style={{ fontSize: '9pt', marginBottom: '2pt' }}><span style={{ fontWeight: 700 }}>{s.category}:</span> {s.items}</div>
              ))}
            </CompactSection>
          </div>
        )}
        <div style={{ flex: 1 }}>
          {data.education.length > 0 && (
            <CompactSection accent={accent} title="Education">
              {data.education.map((ed, i) => (
                <div key={i} style={{ fontSize: '9pt', marginBottom: '3pt' }}>
                  <div><span style={{ fontWeight: 700 }}>{ed.degree}</span></div>
                  <div style={{ color: '#475569' }}>{ed.school} <span style={{ color: '#64748b' }}>({ed.dates})</span></div>
                </div>
              ))}
            </CompactSection>
          )}
          {data.certifications.length > 0 && (
            <CompactSection accent={accent} title="Certifications">
              {data.certifications.map((c, i) => (
                <div key={i} style={{ fontSize: '9pt', marginBottom: '1pt' }}><span style={{ fontWeight: 700 }}>{c.name}</span> — {c.issuer}</div>
              ))}
            </CompactSection>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactSection({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '8pt' }}>
      <h2 style={{ fontSize: '9.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2pt', color: accent, margin: '0 0 4pt 0', borderBottom: `0.75pt solid ${accent}40`, paddingBottom: '1pt' }}>{title}</h2>
      {children}
    </div>
  );
}

function TemplateMinimal({ data }: TemplateProps) {
  const accent = data.accent || '#0f172a';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, padding: '50pt 56pt', fontSize: '10pt' }}>
      <div style={{ marginBottom: '28pt' }}>
        <h1 style={{ margin: 0, fontSize: '28pt', fontWeight: 300, letterSpacing: '-0.5pt', lineHeight: 1.1 }}>{data.personal.name}</h1>
        {data.personal.title && <div style={{ fontSize: '11pt', color: '#64748b', marginTop: '6pt', fontWeight: 400 }}>{data.personal.title}</div>}
        <div style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '12pt', letterSpacing: '0.3pt' }}>
          {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join('   ·   ')}
        </div>
        {links.length > 0 && (
          <div style={{ fontSize: '9pt', color: '#94a3b8', marginTop: '2pt', letterSpacing: '0.3pt' }}>
            {links.map((l, i) => <span key={i}>{i > 0 && '   ·   '}{l.url ? <a href={l.url} style={{ color: accent }}>{l.label}</a> : l.label}</span>)}
          </div>
        )}
      </div>

      {data.profile && <div style={{ marginBottom: '24pt', fontSize: '10.5pt', lineHeight: 1.7, color: '#334155', maxWidth: '90%' }}>{data.profile}</div>}

      {data.experience.length > 0 && (
        <MinSection title="Experience">
          {data.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: '16pt', display: 'flex', gap: '20pt' }}>
              <div style={{ width: '90pt', fontSize: '9pt', color: '#94a3b8', paddingTop: '2pt', flexShrink: 0 }}>{e.dates}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '11pt', color: '#0f172a' }}>{e.role}</div>
                <div style={{ fontSize: '10pt', color: '#64748b', marginBottom: '5pt' }}>{e.company}</div>
                <ul style={{ margin: 0, paddingLeft: '14pt' }}>
                  {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '3pt', lineHeight: 1.55, color: '#334155' }}>{b}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </MinSection>
      )}

      {data.skills.length > 0 && (
        <MinSection title="Skills">
          <div style={{ paddingLeft: '110pt' }}>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: '4pt', fontSize: '9.5pt' }}>
                <span style={{ color: '#94a3b8', display: 'inline-block', width: '90pt' }}>{s.category}</span>
                <span style={{ color: '#334155' }}>{s.items}</span>
              </div>
            ))}
          </div>
        </MinSection>
      )}

      {data.education.length > 0 && (
        <MinSection title="Education">
          {data.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: '8pt', display: 'flex', gap: '20pt' }}>
              <div style={{ width: '90pt', fontSize: '9pt', color: '#94a3b8', flexShrink: 0 }}>{ed.dates}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '10pt' }}>{ed.degree}</div>
                <div style={{ fontSize: '9.5pt', color: '#64748b' }}>{ed.school}</div>
              </div>
            </div>
          ))}
        </MinSection>
      )}

      {data.certifications.length > 0 && (
        <MinSection title="Certifications">
          {data.certifications.map((c, i) => (
            <div key={i} style={{ marginBottom: '4pt', display: 'flex', gap: '20pt' }}>
              <div style={{ width: '90pt' }} />
              <div style={{ flex: 1, fontSize: '9.5pt' }}><span style={{ fontWeight: 600 }}>{c.name}</span><span style={{ color: '#94a3b8' }}> · {c.issuer}</span></div>
            </div>
          ))}
        </MinSection>
      )}

      {data.projects.length > 0 && (
        <MinSection title="Projects">
          {data.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: '8pt', display: 'flex', gap: '20pt' }}>
              <div style={{ width: '90pt', fontSize: '9pt', color: '#94a3b8', paddingTop: '1pt', flexShrink: 0 }}>{p.tech}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '10pt' }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></div>
                <div style={{ fontSize: '9.5pt', color: '#334155', lineHeight: 1.5 }}>{p.description}</div>
              </div>
            </div>
          ))}
        </MinSection>
      )}
    </div>
  );
}

function MinSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '20pt' }}>
      <h2 style={{ fontSize: '9pt', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2pt', color: '#94a3b8', margin: '0 0 12pt 0' }}>{title}</h2>
      {children}
    </div>
  );
}

function TemplateSidebar({ data }: TemplateProps) {
  const accent = data.accent || '#1e40af';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle, display: 'flex', minHeight: '11in' }}>
      <div style={{ width: '32%', background: '#f8fafc', padding: '30pt 22pt', borderRight: `3pt solid ${accent}` }}>
        {data.personal.photo && (
          <div style={{ marginBottom: '16pt' }}>
            <img src={data.personal.photo} alt="" style={{ width: '100%', maxWidth: '100pt', aspectRatio: '1', borderRadius: '6pt', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: '18pt', fontWeight: 700, lineHeight: 1.15, color: '#0f172a' }}>{data.personal.name}</h1>
        {data.personal.title && <div style={{ fontSize: '10pt', color: accent, fontWeight: 500, marginTop: '3pt', marginBottom: '14pt' }}>{data.personal.title}</div>}

        <SbHeading accent={accent}>Contact</SbHeading>
        <div style={{ fontSize: '9pt', lineHeight: 1.7, color: '#334155' }}>
          {data.personal.email && <div style={{ wordBreak: 'break-word' }}>{data.personal.email}</div>}
          {data.personal.phone && <div>{data.personal.phone}</div>}
          {data.personal.location && <div>{data.personal.location}</div>}
          {links.map((l, i) => <div key={i} style={{ wordBreak: 'break-word', marginTop: '2pt' }}>{l.url ? <a href={l.url} style={{ color: accent }}>{l.label}</a> : l.label}</div>)}
        </div>

        {data.skills.length > 0 && (
          <>
            <SbHeading accent={accent}>Skills</SbHeading>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: '7pt' }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0f172a', marginBottom: '1pt' }}>{s.category}</div>
                <div style={{ fontSize: '8.5pt', lineHeight: 1.5, color: '#475569' }}>{s.items}</div>
              </div>
            ))}
          </>
        )}

        {data.education.length > 0 && (
          <>
            <SbHeading accent={accent}>Education</SbHeading>
            {data.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: '7pt' }}>
                <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0f172a' }}>{ed.degree}</div>
                <div style={{ fontSize: '8.5pt', color: '#475569' }}>{ed.school}</div>
                <div style={{ fontSize: '8pt', color: '#94a3b8', marginTop: '1pt' }}>{ed.dates}</div>
              </div>
            ))}
          </>
        )}

        {data.certifications.length > 0 && (
          <>
            <SbHeading accent={accent}>Certifications</SbHeading>
            {data.certifications.map((c, i) => (
              <div key={i} style={{ marginBottom: '5pt' }}>
                <div style={{ fontWeight: 700, fontSize: '8.5pt' }}>{c.name}</div>
                <div style={{ fontSize: '8pt', color: '#64748b' }}>{c.issuer}</div>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ width: '68%', padding: '30pt 28pt' }}>
        {data.profile && (
          <div style={{ marginBottom: '18pt' }}>
            <SbMainHeading accent={accent}>Profile</SbMainHeading>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{data.profile}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div style={{ marginBottom: '14pt' }}>
            <SbMainHeading accent={accent}>Experience</SbMainHeading>
            <div style={{ position: 'relative', paddingLeft: '14pt' }}>
              {data.experience.map((e, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: '14pt' }}>
                  <div style={{ position: 'absolute', left: '-14pt', top: '4pt', width: '8pt', height: '8pt', borderRadius: '50%', background: accent, border: '2pt solid #fff', boxShadow: `0 0 0 1.5pt ${accent}` }} />
                  {i < data.experience.length - 1 && <div style={{ position: 'absolute', left: '-10.5pt', top: '14pt', bottom: '-12pt', width: '1pt', background: '#cbd5e1' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6pt' }}>
                    <div style={{ fontWeight: 700, fontSize: '10.5pt' }}>{e.role}</div>
                    <div style={{ fontSize: '9pt', color: '#94a3b8' }}>{e.dates}</div>
                  </div>
                  <div style={{ fontSize: '9.5pt', color: accent, fontWeight: 500, marginBottom: '3pt' }}>{e.company}</div>
                  <ul style={{ margin: 0, paddingLeft: '14pt' }}>
                    {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.5 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.projects.length > 0 && (
          <div>
            <SbMainHeading accent={accent}>Projects</SbMainHeading>
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: '7pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '10pt' }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></div>
                  <div style={{ fontSize: '8.5pt', color: '#94a3b8', fontStyle: 'italic' }}>{p.tech}</div>
                </div>
                <div style={{ fontSize: '9.5pt', color: '#334155', lineHeight: 1.5 }}>{p.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SbHeading({ accent, children }: { accent: string; children: ReactNode }) {
  return <h3 style={{ fontSize: '9.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', margin: '14pt 0 6pt 0', color: accent }}>{children}</h3>;
}

function SbMainHeading({ accent, children }: { accent: string; children: ReactNode }) {
  return <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', margin: '0 0 8pt 0', color: '#0f172a', borderBottom: `2pt solid ${accent}`, paddingBottom: '3pt', display: 'inline-block', minWidth: '60pt' }}>{children}</h2>;
}

function TemplateProfessional({ data }: TemplateProps) {
  const accent = data.accent || '#0f172a';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle }}>
      <div style={{ background: accent, color: '#fff', padding: '24pt 36pt' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16pt' }}>
          {data.personal.photo && <img src={data.personal.photo} alt="" style={{ width: '70pt', height: '70pt', borderRadius: '50%', objectFit: 'cover', border: '2pt solid rgba(255,255,255,0.3)' }} />}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '24pt', fontWeight: 700, letterSpacing: '0.3pt' }}>{data.personal.name}</h1>
            {data.personal.title && <div style={{ fontSize: '11pt', opacity: 0.9, marginTop: '3pt' }}>{data.personal.title}</div>}
          </div>
        </div>
        <div style={{ fontSize: '9pt', opacity: 0.85, marginTop: '12pt', display: 'flex', flexWrap: 'wrap', gap: '14pt' }}>
          {data.personal.email && <span>✉  {data.personal.email}</span>}
          {data.personal.phone && <span>☎  {data.personal.phone}</span>}
          {data.personal.location && <span>⌂  {data.personal.location}</span>}
          {links.map((l, i) => <span key={i}>{l.url ? <a href={l.url} style={{ color: '#fff', opacity: 0.95 }}>{l.label}</a> : l.label}</span>)}
        </div>
      </div>

      <div style={{ padding: '22pt 36pt' }}>
        {data.profile && <ProfSection accent={accent} title="Professional Summary"><p style={{ margin: 0, lineHeight: 1.6 }}>{data.profile}</p></ProfSection>}

        {data.experience.length > 0 && (
          <ProfSection accent={accent} title="Professional Experience">
            {data.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: '12pt' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderLeft: `3pt solid ${accent}`, paddingLeft: '10pt', marginBottom: '4pt' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '11pt' }}>{e.role}</div>
                    <div style={{ fontSize: '9.5pt', color: '#475569', fontStyle: 'italic' }}>{e.company}</div>
                  </div>
                  <div style={{ fontSize: '9pt', color: accent, fontWeight: 600 }}>{e.dates}</div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '24pt' }}>
                  {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.55 }}>{b}</li>)}
                </ul>
              </div>
            ))}
          </ProfSection>
        )}

        <div style={{ display: 'flex', gap: '24pt' }}>
          <div style={{ flex: 1 }}>
            {data.skills.length > 0 && (
              <ProfSection accent={accent} title="Skills">
                {data.skills.map((s, i) => (
                  <div key={i} style={{ marginBottom: '4pt', fontSize: '9.5pt' }}>
                    <span style={{ fontWeight: 700, color: accent }}>{s.category}:</span> {s.items}
                  </div>
                ))}
              </ProfSection>
            )}
          </div>
          <div style={{ flex: 1 }}>
            {data.education.length > 0 && (
              <ProfSection accent={accent} title="Education">
                {data.education.map((ed, i) => (
                  <div key={i} style={{ marginBottom: '5pt', fontSize: '9.5pt' }}>
                    <div style={{ fontWeight: 700 }}>{ed.degree}</div>
                    <div style={{ color: '#475569' }}>{ed.school}</div>
                    <div style={{ color: '#94a3b8', fontSize: '8.5pt' }}>{ed.dates}</div>
                  </div>
                ))}
              </ProfSection>
            )}
          </div>
        </div>

        {data.certifications.length > 0 && (
          <ProfSection accent={accent} title="Certifications">
            {data.certifications.map((c, i) => (
              <div key={i} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
                <span style={{ fontWeight: 700 }}>{c.name}</span> <span style={{ color: '#64748b' }}>— {c.issuer}</span>
              </div>
            ))}
          </ProfSection>
        )}

        {data.projects.length > 0 && (
          <ProfSection accent={accent} title="Notable Projects">
            {data.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: '6pt' }}>
                <div style={{ fontSize: '10pt' }}><span style={{ fontWeight: 700 }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></span> <span style={{ color: '#64748b', fontStyle: 'italic' }}>· {p.tech}</span></div>
                <div style={{ fontSize: '9.5pt', color: '#334155', lineHeight: 1.5 }}>{p.description}</div>
              </div>
            ))}
          </ProfSection>
        )}
      </div>
    </div>
  );
}

function ProfSection({ accent, title, children }: { accent: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14pt' }}>
      <h2 style={{ fontSize: '10.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5pt', color: accent, margin: '0 0 8pt 0' }}>{title}</h2>
      {children}
    </div>
  );
}

function TemplateCreative({ data }: TemplateProps) {
  const accent = data.accent || '#7c2d12';
  const links = data.personal.links.filter(l => l.url || l.label);
  return (
    <div style={{ ...baseTextStyle }}>
      <div style={{ padding: '32pt 36pt 22pt', position: 'relative', borderBottom: `4pt solid ${accent}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16pt' }}>
          {data.personal.photo && (
            <img src={data.personal.photo} alt="" style={{ width: '80pt', height: '80pt', borderRadius: '4pt', objectFit: 'cover', border: `3pt solid ${accent}` }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10pt', color: accent, fontWeight: 700, letterSpacing: '3pt', textTransform: 'uppercase', marginBottom: '4pt' }}>{data.personal.title || 'Curriculum Vitae'}</div>
            <h1 style={{ margin: 0, fontSize: '32pt', fontWeight: 800, lineHeight: 1, color: '#0f172a', letterSpacing: '-1pt' }}>{data.personal.name}</h1>
          </div>
        </div>
        <div style={{ fontSize: '9pt', color: '#475569', marginTop: '12pt', display: 'flex', flexWrap: 'wrap', gap: '14pt' }}>
          {data.personal.email && <span>{data.personal.email}</span>}
          {data.personal.phone && <span>{data.personal.phone}</span>}
          {data.personal.location && <span>{data.personal.location}</span>}
          {links.map((l, i) => <span key={i}>{l.url ? <a href={l.url} style={{ color: accent, fontWeight: 600 }}>{l.label}</a> : l.label}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', padding: '20pt 36pt' }}>
        <div style={{ width: '62%', paddingRight: '24pt' }}>
          {data.profile && (
            <CrSection accent={accent} title="About" num="01">
              <p style={{ margin: 0, lineHeight: 1.6, fontSize: '10pt' }}>{data.profile}</p>
            </CrSection>
          )}

          {data.experience.length > 0 && (
            <CrSection accent={accent} title="Experience" num="02">
              {data.experience.map((e, i) => (
                <div key={i} style={{ marginBottom: '12pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '11pt', color: '#0f172a' }}>{e.role}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5pt', marginBottom: '4pt' }}>
                    <span style={{ color: accent, fontWeight: 600 }}>{e.company}</span>
                    <span style={{ color: '#94a3b8' }}>{e.dates}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '14pt' }}>
                    {e.bullets.filter(b => b.trim()).map((b, bi) => <li key={bi} style={{ fontSize: '9.5pt', marginBottom: '2pt', lineHeight: 1.5 }}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </CrSection>
          )}

          {data.projects.length > 0 && (
            <CrSection accent={accent} title="Projects" num="03">
              {data.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: '7pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '10pt' }}><ProjectName name={p.name} link={p.link} color="#0f172a" hoverColor={accent} /></div>
                  <div style={{ fontSize: '8.5pt', color: accent, fontStyle: 'italic', marginBottom: '1pt' }}>{p.tech}</div>
                  <div style={{ fontSize: '9.5pt', lineHeight: 1.5, color: '#334155' }}>{p.description}</div>
                </div>
              ))}
            </CrSection>
          )}
        </div>

        <div style={{ width: '38%', paddingLeft: '20pt', borderLeft: `1pt solid ${accent}40` }}>
          {data.skills.length > 0 && (
            <CrSection accent={accent} title="Skills">
              {data.skills.map((s, i) => (
                <div key={i} style={{ marginBottom: '7pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '9.5pt', color: accent }}>{s.category}</div>
                  <div style={{ fontSize: '9pt', lineHeight: 1.5 }}>{s.items}</div>
                </div>
              ))}
            </CrSection>
          )}

          {data.education.length > 0 && (
            <CrSection accent={accent} title="Education">
              {data.education.map((ed, i) => (
                <div key={i} style={{ marginBottom: '7pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '9.5pt' }}>{ed.degree}</div>
                  <div style={{ fontSize: '9pt', color: '#475569' }}>{ed.school}</div>
                  <div style={{ fontSize: '8.5pt', color: '#94a3b8' }}>{ed.dates}</div>
                </div>
              ))}
            </CrSection>
          )}

          {data.certifications.length > 0 && (
            <CrSection accent={accent} title="Certifications">
              {data.certifications.map((c, i) => (
                <div key={i} style={{ marginBottom: '5pt' }}>
                  <div style={{ fontWeight: 700, fontSize: '9pt' }}>{c.name}</div>
                  <div style={{ fontSize: '8.5pt', color: '#64748b' }}>{c.issuer}</div>
                </div>
              ))}
            </CrSection>
          )}
        </div>
      </div>
    </div>
  );
}

function CrSection({ accent, title, num, children }: { accent: string; title: string; num?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14pt' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8pt', marginBottom: '8pt' }}>
        {num && <span style={{ fontSize: '14pt', fontWeight: 800, color: accent, opacity: 0.4 }}>{num}</span>}
        <h2 style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2pt', color: '#0f172a', margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, height: '1pt', background: accent, opacity: 0.3 }} />
      </div>
      {children}
    </div>
  );
}