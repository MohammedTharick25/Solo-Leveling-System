import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import api from "../../lib/api.js";

const NODE_COLORS = {
  note: "#22d3ee",
  idea: "#facc15",
  research: "#60a5fa",
  article: "#a78bfa",
  book: "#818cf8",
  quote: "#34d399",
  page: "#94a3b8",
  resource: "#fb923c",
};

export default function KnowledgeGraph({ onNodeClick }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["brain-graph"],
    queryFn: async () => {
      const { data } = await api.get("/brain/graph");
      return data.data.graph;
    },
  });

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    const { nodes, edges } = data;
    if (!nodes.length) return;

    d3.select(svgRef.current).selectAll("*").remove();
    const w = containerRef.current.clientWidth || 600;
    const h = containerRef.current.clientHeight || 400;
    const svg = d3.select(svgRef.current).attr("width", w).attr("height", h);
    const g = svg.append("g");

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.3, 3])
        .on("zoom", (e) => g.attr("transform", e.transform)),
    );

    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "rgba(51,65,85,0.6)")
      .attr("stroke-width", 1.5);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        onNodeClick?.(d);
      });

    node
      .append("circle")
      .attr("r", 14)
      .attr("fill", (d) => `${NODE_COLORS[d.type] || "#94a3b8"}18`)
      .attr("stroke", (d) => NODE_COLORS[d.type] || "#94a3b8")
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "14px")
      .text((d) => d.emoji || "📝");

    node
      .append("text")
      .attr("x", 0)
      .attr("y", 22)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "Rajdhani,sans-serif")
      .text(
        (d) =>
          (d.label || "").slice(0, 16) +
          ((d.label || "").length > 16 ? "…" : ""),
      );

    node
      .on("mouseover", function (e, d) {
        d3.select(this)
          .select("circle")
          .attr("fill", `${NODE_COLORS[d.type] || "#94a3b8"}35`)
          .attr("stroke-width", 2.5);
      })
      .on("mouseout", function (e, d) {
        d3.select(this)
          .select("circle")
          .attr("fill", `${NODE_COLORS[d.type] || "#94a3b8"}18`)
          .attr("stroke-width", 1.5);
      });

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d) => d.id)
          .distance(90)
          .strength(0.5),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(32));

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => sim.stop();
  }, [data]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="font-display text-xs text-slate-500 tracking-widest animate-pulse">
            Mapping knowledge…
          </p>
        </div>
      </div>
    );

  if (!data?.nodes?.length)
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div>
          <p className="text-4xl mb-3">🧠</p>
          <p className="font-heading text-sm text-slate-500">
            Create notes and link them to see your knowledge graph.
          </p>
        </div>
      </div>
    );

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
        {Object.entries(NODE_COLORS)
          .slice(0, 4)
          .map(([type, color]) => (
            <div
              key={type}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-heading text-[10px] text-slate-400">
                {type}
              </span>
            </div>
          ))}
      </div>
      <p className="absolute bottom-3 right-3 font-body text-[10px] text-slate-700">
        Scroll to zoom · Drag · Click to open
      </p>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
