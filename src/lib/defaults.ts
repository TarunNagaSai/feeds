import type { CategoryColor, SourceType } from "@/types";

/**
 * Starter content, tuned to the owner's growth trajectory: moving from senior
 * Flutter into AI/LLM systems engineering. Categories are ordered by how central
 * they are to that path and carry a `priority` (3 = core growth) that biases the
 * "Top Picks" ranking toward what matters most.
 *
 * Every source here is editable/removable in the UI — this is only the seed.
 * Bump SEED_VERSION when you change this list (the client reseeds on next visit
 * only when forced; a one-time seed happens automatically for a fresh account).
 */
export const SEED_VERSION = 2;

export interface DefaultSource {
  type: SourceType;
  name: string;
  url?: string;
  channelId?: string;
  query?: string;
}

export interface DefaultCategory {
  name: string;
  slug: string;
  description: string;
  keywords: string[];
  color: CategoryColor;
  icon: string;
  priority: number;
  sources: DefaultSource[];
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "AI & LLM Engineering",
    slug: "ai-llm",
    description:
      "Building with LLMs — RAG, fine-tuning, agents, prompting, model internals.",
    color: "violet",
    icon: "BrainCircuit",
    priority: 3,
    keywords: [
      "llm", "large language model", "transformer", "attention", "rag",
      "retrieval augmented", "fine-tuning", "fine-tune", "lora", "qlora", "peft",
      "quantization", "embedding", "vector", "agent", "agentic", "prompt",
      "gpt", "gemma", "llama", "mistral", "diffusion", "kv cache",
      "pagedattention", "tokenizer", "context window", "vllm", "inference",
    ],
    sources: [
      { type: "rss", name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
      // Anthropic ships no official RSS — these route through an RSSHub mirror
      // (direct anthropic.com article links). Swap the host in Sources if it ever
      // rate-limits.
      { type: "rss", name: "Anthropic News", url: "https://rsshub.rssforever.com/anthropic/news" },
      { type: "rss", name: "Anthropic Engineering", url: "https://rsshub.rssforever.com/anthropic/engineering" },
      { type: "rss", name: "Ahead of AI (Sebastian Raschka)", url: "https://magazine.sebastianraschka.com/feed" },
      { type: "rss", name: "Lil'Log (Lilian Weng)", url: "https://lilianweng.github.io/index.xml" },
      { type: "rss", name: "Chip Huyen", url: "https://huyenchip.com/feed.xml" },
      { type: "rss", name: "Jay Alammar", url: "https://jalammar.github.io/feed.xml" },
      { type: "youtube_channel", name: "Two Minute Papers", channelId: "UCbfYPyITQ-7l4upoX8nvctg" },
      { type: "hn_search", name: "Hacker News · LLM", query: "LLM" },
      { type: "youtube_search", name: "YouTube · LLM engineering", query: "LLM engineering" },
      { type: "github_trending", name: "GitHub Trending · LLM", query: "topic:llm" },
    ],
  },
  {
    name: "Inference & GPU Infra",
    slug: "inference-infra",
    description:
      "Serving models fast — vLLM, CUDA, GPUs, batching, distributed training, MLOps.",
    color: "cyan",
    icon: "Cpu",
    priority: 3,
    keywords: [
      "gpu", "cuda", "triton", "tensorrt", "inference server", "model serving",
      "vllm", "latency", "throughput", "batching", "kubernetes", "ray",
      "scaling", "onnx", "runpod", "quantization", "kernel", "deployment",
      "serverless gpu", "distributed training", "fsdp", "deepspeed", "h100",
    ],
    sources: [
      { type: "rss", name: "NVIDIA Developer Blog", url: "https://developer.nvidia.com/blog/feed" },
      { type: "hn_search", name: "Hacker News · GPU inference", query: "GPU inference" },
      { type: "hn_search", name: "Hacker News · CUDA", query: "CUDA" },
      { type: "youtube_search", name: "YouTube · LLM inference", query: "LLM inference optimization vLLM" },
    ],
  },
  {
    name: "ML Foundations & Math",
    slug: "ml-foundations",
    description:
      "The math under the models — linear algebra, probability, optimization, backprop.",
    color: "blue",
    icon: "Sigma",
    priority: 2,
    keywords: [
      "linear algebra", "probability", "statistics", "optimization", "gradient",
      "backpropagation", "calculus", "neural network", "deep learning",
      "loss function", "matrix", "eigen", "derivative", "distribution",
      "convex", "regularization", "bayesian", "entropy",
    ],
    sources: [
      { type: "youtube_channel", name: "3Blue1Brown", channelId: "UCYO_jab_esuFRV4b17AJtAw" },
      { type: "youtube_search", name: "YouTube · Math for ML", query: "math for machine learning linear algebra" },
      { type: "hn_search", name: "Hacker News · Machine Learning", query: "machine learning" },
    ],
  },
  {
    name: "Rust & Systems",
    slug: "rust-systems",
    description:
      "Low-level craft — Rust, runtimes, GC, compilers, WASM, performance.",
    color: "orange",
    icon: "Cog",
    priority: 2,
    keywords: [
      "rust", "systems programming", "memory", "garbage collection", "compiler",
      "wasm", "webassembly", "concurrency", "ownership", "borrow", "ffi", "vm",
      "runtime", "allocator", "performance", "async", "tokio", "unsafe",
      "kernel", "zig",
    ],
    sources: [
      { type: "rss", name: "This Week in Rust", url: "https://this-week-in-rust.org/rss.xml" },
      { type: "rss", name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml" },
      { type: "youtube_channel", name: "ThePrimeagen", channelId: "UC8ENHE5xdFSwx71u3fDH5Xw" },
      { type: "hn_search", name: "Hacker News · Rust", query: "Rust" },
      { type: "github_trending", name: "GitHub Trending · Rust", query: "language:rust" },
    ],
  },
  {
    name: "Architecture & Backend",
    slug: "architecture",
    description:
      "System design at scale — distributed systems, APIs, databases, patterns.",
    color: "emerald",
    icon: "Network",
    priority: 2,
    keywords: [
      "architecture", "system design", "scalability", "distributed systems",
      "microservices", "api", "database", "backend", "event-driven", "kafka",
      "message queue", "caching", "consistency", "postgres", "design patterns",
      "nestjs", "observability", "load balancing",
    ],
    sources: [
      { type: "rss", name: "Martin Fowler", url: "https://martinfowler.com/feed.atom" },
      { type: "rss", name: "ByteByteGo Newsletter", url: "https://blog.bytebytego.com/feed" },
      { type: "youtube_channel", name: "Fireship", channelId: "UCsBjURrPoezykLs9EqgamOA" },
      { type: "hn_search", name: "Hacker News · System design", query: "system design" },
    ],
  },
  {
    name: "Career & Eng Growth",
    slug: "career",
    description:
      "Leveling up as an engineer — staff path, freelancing, writing, productivity.",
    color: "amber",
    icon: "TrendingUp",
    priority: 2,
    keywords: [
      "career", "staff engineer", "senior engineer", "tech lead", "leadership",
      "freelance", "consulting", "productivity", "learning", "writing",
      "communication", "interview", "promotion", "growth", "habits",
      "mentorship", "side project",
    ],
    sources: [
      { type: "rss", name: "The Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed" },
      { type: "rss", name: "Refactoring", url: "https://refactoring.fm/feed" },
      { type: "hn_search", name: "Hacker News · Staff engineer", query: "staff engineer career" },
    ],
  },
  {
    name: "Flutter & Mobile",
    slug: "flutter-mobile",
    description:
      "Staying sharp on Flutter/Dart, mobile architecture, and shipping apps.",
    color: "rose",
    icon: "Smartphone",
    priority: 1,
    keywords: [
      "flutter", "dart", "mobile", "ios", "android", "widget", "bloc",
      "riverpod", "state management", "objectbox", "animation", "app store",
      "native", "kotlin", "swift",
    ],
    sources: [
      { type: "rss", name: "Flutter (Medium)", url: "https://medium.com/feed/flutter" },
      { type: "youtube_search", name: "YouTube · Flutter advanced", query: "Flutter advanced architecture" },
      { type: "hn_search", name: "Hacker News · Flutter", query: "Flutter" },
    ],
  },
];
