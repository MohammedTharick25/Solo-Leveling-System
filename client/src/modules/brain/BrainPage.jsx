import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain,
  Plus,
  Search,
  Tag,
  Star,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useForm } from "react-hook-form";
import api from "../../lib/api.js";
import {
  pageVariants,
  staggerContainer,
  staggerItem,
} from "../../lib/animations.js";
import {
  SectionHeader,
  EmptyState,
  Button,
  Modal,
  Input,
} from "../../components/ui/PageLoader.jsx";
import KnowledgeGraph from "./KnowledgeGraph.jsx";

const NOTE_TYPES = [
  "note",
  "idea",
  "research",
  "article",
  "book",
  "quote",
  "page",
  "resource",
];
const TYPE_EMOJI = {
  note: "📝",
  idea: "💡",
  research: "🔬",
  article: "📰",
  book: "📚",
  quote: "💬",
  page: "📄",
  resource: "🔗",
};
const TYPE_COLORS = {
  note: "border-slate-700/60",
  idea: "border-yellow-500/30",
  research: "border-blue-500/30",
  article: "border-purple-500/30",
  book: "border-indigo-500/30",
  quote: "border-cyan-500/30",
  page: "border-emerald-500/30",
  resource: "border-orange-500/30",
};

export default function BrainPage() {
  const [mainTab, setMainTab] = useState("notes");
  const [createModal, setCreateModal] = useState(false);
  const [viewNote, setViewNote] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["brain-notes", typeFilter || "all"], // Use "all" as key if empty
    queryFn: async () => {
      // If typeFilter is empty, don't send the param at all
      const params = typeFilter ? `?type=${typeFilter}` : "";
      const response = await api.get(`/brain${params}`);
      return response.data.data;
    },
    // Add this to prevent UI flicker
    keepPreviousData: true,
  });

  const { data: searchData } = useQuery({
    queryKey: ["brain-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return null;
      const { data } = await api.get(
        `/brain/search?q=${encodeURIComponent(search)}`,
      );
      return data.data;
    },
    enabled: search.length >= 2,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["brain-tags"],
    queryFn: async () => {
      const { data } = await api.get("/brain/tags");
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post("/brain", body),
    onSuccess: () => {
      setCreateModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["brain-notes"] });
      queryClient.invalidateQueries({ queryKey: ["brain-tags"] });
      queryClient.invalidateQueries({ queryKey: ["brain-graph"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/brain/${id}`),
    onSuccess: () => {
      setViewNote(null);
      queryClient.invalidateQueries({ queryKey: ["brain-notes"] });
      queryClient.invalidateQueries({ queryKey: ["brain-graph"] });
    },
  });

  const favMutation = useMutation({
    mutationFn: ({ id, val }) => api.patch(`/brain/${id}`, { isFavorite: val }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brain-notes"] }),
  });

  const notes = search.length >= 2 ? searchData?.notes || [] : data?.data || [];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-system mb-1">Knowledge Vault</p>
          <h1 className="font-heading font-bold text-2xl text-slate-100">
            Second Brain
          </h1>
        </div>
        <Button variant="primary" onClick={() => setCreateModal(true)}>
          <Plus size={14} /> New Note
        </Button>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "notes", label: "📝 Notes" },
          { id: "graph", label: "🕸️ Knowledge Graph" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={`px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                        ${mainTab === t.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Knowledge Graph tab */}
      {mainTab === "graph" && (
        <div
          className="glass rounded-2xl overflow-hidden border border-slate-700/50"
          style={{ height: "520px" }}
        >
          <KnowledgeGraph
            onNodeClick={(node) => {
              const found = (data?.data || []).find(
                (n) =>
                  n._id === node.id ||
                  n._id?.toString() === node.id?.toString(),
              );
              if (found) setViewNote(found);
            }}
          />
        </div>
      )}

      {/* Notes tab */}
      {mainTab === "notes" && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Search + filter */}
          <motion.div variants={staggerItem} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="input pl-9 py-2.5"
                placeholder="Search notes, ideas, quotes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input py-2.5 w-36"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_EMOJI[t]} {t}
                </option>
              ))}
            </select>
          </motion.div>

          {/* Tag cloud */}
          {tagsData?.tags?.length > 0 && (
            <motion.div variants={staggerItem} className="flex flex-wrap gap-2">
              {tagsData.tags.slice(0, 15).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50
                             font-heading text-xs text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                >
                  <Tag size={10} /> {tag}{" "}
                  <span className="text-slate-600">·{count}</span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Notes grid */}
          <motion.div variants={staggerItem}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton h-40 rounded-xl" />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="Your Second Brain is empty"
                description="Start capturing notes, ideas, and insights."
                action={
                  <Button
                    variant="primary"
                    onClick={() => setCreateModal(true)}
                  >
                    <Plus size={14} /> New Note
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map((note) => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    onClick={() => setViewNote(note)}
                    onFav={() =>
                      favMutation.mutate({
                        id: note._id,
                        val: !note.isFavorite,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Create modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          reset();
        }}
        title="New Note"
        maxWidth="max-w-xl"
      >
        <form
          onSubmit={handleSubmit((d) => {
            const tags = d.tags
              ? d.tags
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean)
              : [];
            createMutation.mutate({ ...d, tags });
          })}
          className="space-y-4"
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Title"
                placeholder="Note title…"
                {...register("title", { required: true })}
              />
            </div>
            <div>
              <label className="input-label">Type</label>
              <select className="input" {...register("type")}>
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_EMOJI[t]} {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Content</label>
            <textarea
              rows={6}
              className="input resize-none font-mono text-xs"
              placeholder="Write your note here…"
              {...register("content")}
            />
          </div>
          <Input
            label="Tags (comma separated)"
            placeholder="productivity, notes, ideas"
            {...register("tags")}
          />
          <Input
            label="Source / URL (optional)"
            placeholder="https://…"
            {...register("sourceUrl")}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending}
            >
              Save Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* View note modal */}
      <Modal
        open={!!viewNote}
        onClose={() => setViewNote(null)}
        title={viewNote?.title}
        maxWidth="max-w-2xl"
      >
        {viewNote && (
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="px-2 py-0.5 rounded bg-slate-800 font-heading text-xs text-slate-400">
                {TYPE_EMOJI[viewNote.type]} {viewNote.type}
              </span>
              {viewNote.tags?.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-slate-800 font-heading text-[10px] text-slate-500"
                >
                  #{t}
                </span>
              ))}
            </div>
            <p className="font-body text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mb-5">
              {viewNote.content || "No content."}
            </p>
            {viewNote.sourceUrl && (
              <a
                href={viewNote.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-heading text-xs text-cyan-400 hover:text-cyan-300 transition-colors mb-5"
              >
                <ExternalLink size={12} /> View Source
              </a>
            )}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <p className="font-body text-xs text-slate-600">
                {viewNote.wordCount} words ·{" "}
                {new Date(viewNote.updatedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    favMutation.mutate({
                      id: viewNote._id,
                      val: !viewNote.isFavorite,
                    })
                  }
                  className={`p-2 rounded-lg transition-colors ${viewNote.isFavorite ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400"}`}
                >
                  <Star
                    size={15}
                    fill={viewNote.isFavorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(viewNote._id)}
                  className="p-2 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

function NoteCard({ note, onClick, onFav }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`glass rounded-xl p-5 cursor-pointer border ${TYPE_COLORS[note.type] || "border-slate-700/50"} hover:border-opacity-60 transition-all duration-200`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_EMOJI[note.type]}</span>
          <span className="font-heading text-[10px] text-slate-500 uppercase tracking-wider">
            {note.type}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFav();
          }}
          className={`transition-colors ${note.isFavorite ? "text-yellow-400" : "text-slate-700 hover:text-yellow-400"}`}
        >
          <Star size={13} fill={note.isFavorite ? "currentColor" : "none"} />
        </button>
      </div>
      <h4 className="font-heading font-semibold text-sm text-slate-200 mb-2 leading-snug line-clamp-2">
        {note.title}
      </h4>
      {note.content && (
        <p className="font-body text-xs text-slate-500 line-clamp-3 leading-relaxed mb-3">
          {note.content}
        </p>
      )}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded bg-slate-800 font-heading text-[9px] text-slate-500"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
