import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Trophy, Plus, LogOut, Crown } from "lucide-react";
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
  Badge,
  Modal,
  Input,
  RankBadge,
} from "../../components/ui/PageLoader.jsx";
import { useHunterStore } from "../../stores/hunterStore.js";

export default function SocialPage() {
  const [tab, setTab] = useState("guild");
  const [createModal, setCreateModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useHunterStore();
  const { register, handleSubmit, reset } = useForm();

  const { data: myGuildData } = useQuery({
    queryKey: ["my-guild"],
    queryFn: async () => {
      const { data } = await api.get("/guilds/mine");
      return data.data;
    },
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await api.get("/leaderboard/global?period=weekly");
      return data.data;
    },
    enabled: tab === "leaderboard",
  });

  const { data: searchData, refetch: searchGuilds } = useQuery({
    queryKey: ["guild-search"],
    queryFn: async () => {
      const { data } = await api.get("/guilds/search");
      return data.data;
    },
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post("/guilds", body),
    onSuccess: () => {
      setCreateModal(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["my-guild"] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id) => api.post(`/guilds/${id}/join`),
    onSuccess: () => {
      setSearchModal(false);
      queryClient.invalidateQueries({ queryKey: ["my-guild"] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (id) => api.delete(`/guilds/${id}/leave`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-guild"] }),
  });

  const myGuild = myGuildData?.guild;
  const leaderboard = leaderboardData;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="mb-8">
        <p className="text-system mb-1">Hunter Network</p>
        <h1 className="font-heading font-bold text-2xl text-slate-100">
          Guild & Social
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "guild", label: "Guild", icon: Users },
          { id: "leaderboard", label: "Leaderboard", icon: Trophy },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                          ${tab === id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {tab === "guild" ? (
          <motion.div variants={staggerItem}>
            {!myGuild ? (
              <EmptyState
                icon={Users}
                title="You're not in a guild"
                description="Join an existing guild or create your own to unlock guild challenges and leaderboards."
                action={
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => setCreateModal(true)}
                    >
                      <Plus size={14} /> Create Guild
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        searchGuilds();
                        setSearchModal(true);
                      }}
                    >
                      Find Guild
                    </Button>
                  </div>
                }
              />
            ) : (
              <div className="space-y-6">
                {/* Guild card */}
                <div className="glass-cyan rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {myGuild.tag && (
                          <span className="font-display text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                            [{myGuild.tag}]
                          </span>
                        )}
                        <h2 className="font-heading font-bold text-xl text-slate-100">
                          {myGuild.name}
                        </h2>
                      </div>
                      <p className="font-body text-sm text-slate-400 mb-4">
                        {myGuild.description}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <p className="text-hud">Members</p>
                          <p className="font-display text-lg text-slate-200">
                            {myGuild.members?.length}/{myGuild.maxMembers}
                          </p>
                        </div>
                        <div>
                          <p className="text-hud">Total XP</p>
                          <p className="font-display text-lg text-cyan-400">
                            {(myGuild.totalXP || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-hud">Weekly XP</p>
                          <p className="font-display text-lg text-purple-400">
                            {(myGuild.weeklyXP || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => leaveMutation.mutate(myGuild._id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-2"
                      title="Leave guild"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>

                {/* Members list */}
                <GuildMembersList
                  guildId={myGuild._id}
                  leaderId={myGuild.leaderId}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Global Rankings" title="Weekly Leaderboard" />
            {!leaderboard?.entries?.length ? (
              <EmptyState icon={Trophy} title="Leaderboard loading…" />
            ) : (
              <div className="space-y-2">
                {leaderboard.entries.map((entry) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    currentUserId={user?._id}
                  />
                ))}
                {leaderboard.myPosition && (
                  <div className="mt-4 p-4 rounded-xl glass border border-cyan-500/20">
                    <p className="text-hud mb-1">Your Position</p>
                    <LeaderboardRow
                      entry={leaderboard.myPosition}
                      currentUserId={user?._id}
                      highlight
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Create guild modal */}
      <Modal
        open={createModal}
        onClose={() => {
          setCreateModal(false);
          reset();
        }}
        title="Create Guild"
      >
        <form
          onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          className="space-y-4"
        >
          <Input
            label="Guild Name"
            placeholder="The Shadow Monarchs"
            {...register("name", { required: true })}
          />
          <Input
            label="Tag (max 5 chars)"
            placeholder="SHDW"
            {...register("tag")}
          />
          <div>
            <label className="input-label">Description</label>
            <textarea
              rows={3}
              className="input resize-none"
              placeholder="Guild purpose and mission…"
              {...register("description")}
            />
          </div>
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
              Create Guild
            </Button>
          </div>
        </form>
      </Modal>

      {/* Search guild modal */}
      <Modal
        open={searchModal}
        onClose={() => setSearchModal(false)}
        title="Find a Guild"
        maxWidth="max-w-xl"
      >
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {(searchData?.data || []).map((g) => (
            <div
              key={g._id}
              className="glass rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-heading font-semibold text-sm text-slate-200">
                  {g.name}
                </p>
                <p className="font-body text-xs text-slate-500">
                  {g.members?.length}/{g.maxMembers} members ·{" "}
                  {(g.totalXP || 0).toLocaleString()} XP
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                loading={joinMutation.isPending}
                onClick={() => joinMutation.mutate(g._id)}
              >
                Join
              </Button>
            </div>
          ))}
          {!searchData?.data?.length && (
            <p className="font-body text-sm text-slate-500 text-center py-8">
              No public guilds found.
            </p>
          )}
        </div>
      </Modal>
    </motion.div>
  );
}

function GuildMembersList({ guildId }) {
  const { data } = useQuery({
    queryKey: ["guild-members", guildId],
    queryFn: async () => {
      const { data } = await api.get(`/guilds/${guildId}/members`);
      return data.data;
    },
  });

  const members = data?.members || [];

  return (
    <div className="glass rounded-2xl p-6">
      <SectionHeader label="Roster" title="Members" />
      <div className="space-y-3">
        {members.map((m) => (
          <div
            key={m.userId?._id || m._id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700
                              flex items-center justify-center font-display text-xs text-slate-400"
              >
                {m.userId?.hunterName?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm text-slate-200">
                    {m.userId?.hunterName}
                  </p>
                  {m.role === "leader" && (
                    <Crown size={11} className="text-yellow-400" />
                  )}
                  {m.role === "officer" && (
                    <Crown size={11} className="text-slate-400" />
                  )}
                </div>
                <p className="font-body text-xs text-slate-500">
                  Lv.{m.userId?.level}
                </p>
              </div>
            </div>
            <RankBadge
              rank={m.userId?.rank}
              className="text-[9px] px-1.5 py-0.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, currentUserId, highlight }) {
  const isMe = entry.userId?.toString() === currentUserId?.toString();
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all
                      ${isMe || highlight ? "bg-cyan-500/10 border border-cyan-500/20" : "glass"}`}
    >
      <span
        className={`font-display text-sm w-6 text-center
                        ${entry.position <= 3 ? "text-yellow-400" : "text-slate-500"}`}
      >
        {entry.position <= 3
          ? ["🥇", "🥈", "🥉"][entry.position - 1]
          : `#${entry.position}`}
      </span>
      <div
        className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700
                      flex items-center justify-center font-display text-xs text-slate-400 shrink-0"
      >
        {entry.hunterName?.[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-heading text-sm font-semibold ${isMe ? "text-cyan-400" : "text-slate-200"}`}
        >
          {entry.hunterName} {isMe && "(You)"}
        </p>
        <p className="font-body text-xs text-slate-500">Lv.{entry.level}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-xs text-yellow-400">
          {(entry.totalXP || 0).toLocaleString()} XP
        </p>
        <RankBadge
          rank={entry.rank}
          className="text-[9px] px-1.5 py-0.5 mt-0.5"
        />
      </div>
    </div>
  );
}
