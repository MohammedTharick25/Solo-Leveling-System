import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Trophy,
  Plus,
  LogOut,
  Crown,
  Sword,
  CheckCircle2,
  Clock,
  Star,
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
  Badge,
  Modal,
  Input,
  RankBadge,
  StatBar,
} from "../../components/ui/PageLoader.jsx";
import { useHunterStore } from "../../stores/hunterStore.js";

export default function SocialPage() {
  const [tab, setTab] = useState("guild");
  const [createModal, setCreateModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [challengeModal, setChallengeModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useHunterStore();
  const { register, handleSubmit, reset } = useForm();
  const { register: regC, handleSubmit: hsC, reset: rsC } = useForm();

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

  const { data: membersData } = useQuery({
    queryKey: ["guild-members", myGuildData?.guild?._id],
    queryFn: async () => {
      const { data } = await api.get(
        `/guilds/${myGuildData.guild._id}/members`,
      );
      return data.data;
    },
    enabled:
      !!myGuildData?.guild?._id && (tab === "guild" || tab === "members"),
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

  const addChallengeMutation = useMutation({
    mutationFn: (body) =>
      api.post(`/guilds/${myGuildData?.guild?._id}/challenges`, body),
    onSuccess: () => {
      setChallengeModal(false);
      rsC();
      queryClient.invalidateQueries({ queryKey: ["my-guild"] });
    },
  });

  const myGuild = myGuildData?.guild;
  const isLeader =
    myGuild?.leaderId === user?._id ||
    myGuild?.leaderId?._id === user?._id ||
    myGuild?.leaderId?.toString() === user?._id?.toString();

  // ── Defensive normalization of the leaderboard response ───────────────────
  // Backend shapes can drift (e.g. { entries, myPosition } vs a bare array,
  // or nested under a `leaderboard` key). Normalize here so the render logic
  // below never has to guess.
  const leaderboard = normalizeLeaderboard(leaderboardData);

  const memberCount = myGuild?.members?.length || 0;

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
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "guild", label: "🏰 Guild" },
          { id: "challenges", label: "⚔️ Challenges" },
          { id: "members", label: "📊 Guild Ranks" },
          { id: "leaderboard", label: "🏆 Leaderboard" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-heading text-sm font-semibold border transition-all
                        ${tab === t.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* ── GUILD TAB ─────────────────────────────────────────────── */}
        {tab === "guild" && (
          <motion.div variants={staggerItem}>
            {!myGuild ? (
              <EmptyState
                icon={Users}
                title="You're not in a guild"
                description="Join an existing guild or create your own."
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
                <div className="glass-cyan rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/8 rounded-full blur-3xl" />
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {myGuild.tag && (
                          <span className="font-display text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                            [{myGuild.tag}]
                          </span>
                        )}
                        <h2 className="font-heading font-bold text-xl text-slate-100">
                          {myGuild.name}
                        </h2>
                        {isLeader && <Badge color="yellow">Leader</Badge>}
                      </div>
                      {myGuild.description && (
                        <p className="font-body text-sm text-slate-400 mb-4">
                          {myGuild.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-6">
                        <StatPill
                          label="Members"
                          value={`${myGuild.members?.length}/${myGuild.maxMembers}`}
                        />
                        <StatPill
                          label="Total XP"
                          value={(myGuild.totalXP || 0).toLocaleString()}
                          color="text-cyan-400"
                        />
                        <StatPill
                          label="Weekly XP"
                          value={(myGuild.weeklyXP || 0).toLocaleString()}
                          color="text-purple-400"
                        />
                        <StatPill
                          label="Level"
                          value={myGuild.level || 1}
                          color="text-yellow-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isLeader && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setChallengeModal(true)}
                        >
                          <Plus size={13} /> Challenge
                        </Button>
                      )}
                      <button
                        onClick={() => leaveMutation.mutate(myGuild._id)}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg"
                        title="Leave guild"
                      >
                        <LogOut size={16} />
                      </button>
                    </div>
                  </div>

                  {myGuild.announcement && (
                    <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                      <p className="font-heading text-xs text-cyan-400 mb-0.5">
                        📢 Announcement
                      </p>
                      <p className="font-body text-sm text-slate-300">
                        {myGuild.announcement}
                      </p>
                    </div>
                  )}
                </div>

                {/* Members */}
                <div className="glass rounded-2xl p-6 border border-slate-700/50">
                  <SectionHeader
                    label="Roster"
                    title={`Members (${myGuild.members?.length})`}
                  />
                  <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
                    {(membersData?.members || myGuild.members || []).map(
                      (m, i) => {
                        const u = m.userId;
                        const name = u?.hunterName || `Member ${i + 1}`;
                        const lvl = u?.level ?? "—";
                        const rank = u?.rank ?? "—";
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700
                                            flex items-center justify-center font-display text-xs text-slate-400"
                              >
                                {name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-heading text-sm text-slate-200">
                                    {name}
                                  </p>
                                  {m.role === "leader" && (
                                    <Crown
                                      size={11}
                                      className="text-yellow-400"
                                    />
                                  )}
                                  {m.role === "officer" && (
                                    <Crown
                                      size={11}
                                      className="text-slate-400"
                                    />
                                  )}
                                </div>
                                <p className="font-body text-xs text-slate-500">
                                  Lv.{lvl}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {m.contribution > 0 && (
                                <span className="font-display text-xs text-cyan-400">
                                  {m.contribution.toLocaleString()} XP
                                </span>
                              )}
                              {rank !== "—" && (
                                <RankBadge
                                  rank={rank}
                                  className="text-[9px] px-1.5 py-0.5"
                                />
                              )}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── CHALLENGES TAB ────────────────────────────────────────── */}
        {tab === "challenges" && (
          <motion.div variants={staggerItem}>
            {!myGuild ? (
              <EmptyState
                icon={Sword}
                title="Join a guild first"
                description="Guild challenges are only available to guild members."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionHeader
                      label="Guild War"
                      title="Active Challenges"
                    />
                    <p className="font-body text-sm text-slate-500 -mt-3">
                      Complete challenges to earn XP for your guild.
                    </p>
                  </div>
                  {isLeader && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setChallengeModal(true)}
                    >
                      <Plus size={13} /> Add Challenge
                    </Button>
                  )}
                </div>

                {!myGuild.challenges || myGuild.challenges.length === 0 ? (
                  <div className="glass rounded-2xl p-10 text-center border border-slate-700/50">
                    <p className="text-4xl mb-3">⚔️</p>
                    <p className="font-heading font-semibold text-slate-400 mb-1">
                      No active challenges
                    </p>
                    <p className="font-body text-sm text-slate-600 mb-4">
                      {isLeader
                        ? "Create a challenge for your guild members."
                        : "Ask your guild leader to create challenges."}
                    </p>
                    {isLeader && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setChallengeModal(true)}
                      >
                        <Plus size={13} /> Create First Challenge
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myGuild.challenges.map((ch, i) => (
                      <GuildChallengeCard
                        key={ch._id || i}
                        challenge={ch}
                        guildId={myGuild._id}
                        userId={user?._id}
                        memberCount={memberCount}
                        queryClient={queryClient}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── GUILD RANKS (per-member leaderboard) TAB ─────────────────── */}
        {tab === "members" && (
          <motion.div variants={staggerItem}>
            {!myGuild ? (
              <EmptyState
                icon={Trophy}
                title="Join a guild first"
                description="Member rankings are only available to guild members."
              />
            ) : (
              <GuildMemberLeaderboard
                members={membersData?.members || myGuild.members || []}
                currentUserId={user?._id}
              />
            )}
          </motion.div>
        )}

        {/* ── LEADERBOARD TAB ───────────────────────────────────────── */}
        {tab === "leaderboard" && (
          <motion.div variants={staggerItem}>
            <SectionHeader label="Global Rankings" title="Weekly Leaderboard" />
            {!leaderboard?.entries?.length ? (
              <EmptyState icon={Trophy} title="Leaderboard loading…" />
            ) : (
              <div className="space-y-2">
                {leaderboard.entries.slice(0, 50).map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId || i}
                    entry={entry}
                    currentUserId={user?._id}
                  />
                ))}
                {leaderboard.myPosition && (
                  <div className="mt-4 p-4 rounded-xl glass border border-cyan-500/20">
                    <p className="text-hud mb-2">Your Position</p>
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

      {/* Add challenge modal */}
      <Modal
        open={challengeModal}
        onClose={() => {
          setChallengeModal(false);
          rsC();
        }}
        title="Add Guild Challenge"
      >
        <form
          onSubmit={hsC((d) =>
            addChallengeMutation.mutate({
              ...d,
              xpReward: Number(d.xpReward) || 200,
              firstCompleterBonus: Number(d.firstCompleterBonus) || 50,
              deadline: d.deadline || undefined,
            }),
          )}
          className="space-y-4"
        >
          <Input
            label="Challenge Title"
            placeholder="Complete 50 quests this week"
            {...regC("title", { required: true })}
          />
          <div>
            <label className="input-label">Description</label>
            <textarea
              rows={3}
              className="input resize-none"
              placeholder="What must members do to complete this challenge?"
              {...regC("description")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="XP Reward"
              type="number"
              placeholder="200"
              {...regC("xpReward", { valueAsNumber: true })}
            />
            <Input
              label="First-Completer Bonus"
              type="number"
              placeholder="50"
              {...regC("firstCompleterBonus", { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="input-label">Deadline (optional)</label>
            <input
              type="datetime-local"
              className="input"
              {...regC("deadline")}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setChallengeModal(false);
                rsC();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="submit"
              loading={addChallengeMutation.isPending}
            >
              <Sword size={14} /> Add Challenge
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

function GuildChallengeCard({
  challenge,
  guildId,
  userId,
  memberCount,
  queryClient,
}) {
  const isCompleted = challenge.status === "completed";
  const isExpired = challenge.status === "expired";
  const memberDone = challenge.completedBy?.some(
    (id) => id?.toString() === userId?.toString(),
  );
  const isFirstCompleter =
    challenge.firstCompleterId &&
    challenge.firstCompleterId.toString() === userId?.toString();

  const deadline = challenge.deadline ? new Date(challenge.deadline) : null;
  const now = new Date();
  const daysLeft = deadline ? Math.ceil((deadline - now) / 86400000) : null;
  const overdue = deadline && deadline < now && !isCompleted;

  const completedCount = challenge.completedBy?.length || 0;
  const progressPct =
    memberCount > 0 ? Math.round((completedCount / memberCount) * 100) : 0;

  const markMutation = useMutation({
    mutationFn: () =>
      api.post(`/guilds/${guildId}/challenges/${challenge._id}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-guild"] }),
  });

  return (
    <div
      className={`glass rounded-2xl p-5 border transition-all duration-300
                      ${
                        isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : overdue
                            ? "border-red-500/30"
                            : "border-slate-700/50 hover:border-slate-600/60"
                      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isCompleted && <Badge color="emerald">✅ Completed</Badge>}
            {overdue && <Badge color="red">⚠️ Overdue</Badge>}
            {!isCompleted && !overdue && <Badge color="purple">Active</Badge>}
            {isFirstCompleter && (
              <Badge color="yellow">🏁 You were first!</Badge>
            )}
          </div>
          <h4 className="font-heading font-bold text-sm text-slate-100 leading-snug">
            {challenge.title}
          </h4>
        </div>
        <div className="text-right shrink-0">
          <p className="font-display text-sm text-yellow-400 font-bold">
            +{challenge.xpReward}
          </p>
          <p className="font-body text-[10px] text-slate-600">guild XP</p>
          {challenge.firstCompleterBonus > 0 && (
            <p className="font-body text-[10px] text-yellow-500/70">
              +{challenge.firstCompleterBonus} first
            </p>
          )}
        </div>
      </div>

      {challenge.description && (
        <p className="font-body text-xs text-slate-400 mb-3 leading-relaxed">
          {challenge.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <StatBar
          value={progressPct}
          color={isCompleted ? "#34d399" : "#22d3ee"}
          label={`${completedCount}/${memberCount || "—"} members`}
        />
      </div>

      {/* Completed avatars */}
      {completedCount > 0 && (
        <div className="mb-3">
          <div className="flex gap-1 flex-wrap">
            {challenge.completedBy.slice(0, 8).map((id, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40
                                      flex items-center justify-center"
              >
                <CheckCircle2 size={11} className="text-emerald-400" />
              </div>
            ))}
            {completedCount > 8 && (
              <span className="font-body text-[10px] text-slate-500 self-center">
                +{completedCount - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Deadline */}
      {deadline && (
        <div
          className={`flex items-center gap-1.5 mb-3 font-heading text-xs
                          ${overdue ? "text-red-400" : daysLeft <= 2 ? "text-yellow-400" : "text-slate-500"}`}
        >
          <Clock size={11} />
          {overdue
            ? "Deadline passed"
            : daysLeft === 0
              ? "Due today"
              : daysLeft === 1
                ? "1 day left"
                : `${daysLeft} days left`}
        </div>
      )}

      {/* Action */}
      {!isCompleted &&
        !isExpired &&
        (memberDone ? (
          <div className="flex items-center gap-2 font-heading text-sm text-emerald-400">
            <CheckCircle2 size={15} /> You've completed this
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            loading={markMutation.isPending}
            onClick={() => markMutation.mutate()}
          >
            <CheckCircle2 size={13} /> Mark My Completion
          </Button>
        ))}
    </div>
  );
}

// ── Per-member guild leaderboard, sorted by contribution ────────────────────
function GuildMemberLeaderboard({ members, currentUserId }) {
  const ranked = [...members].sort(
    (a, b) => (b.contribution || 0) - (a.contribution || 0),
  );

  if (!ranked.length) {
    return <EmptyState icon={Trophy} title="No members yet" />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        label="Contribution Rankings"
        title="Guild Member Leaderboard"
      />
      <div className="space-y-2">
        {ranked.map((m, i) => {
          const u = m.userId;
          const isMe = u?._id?.toString() === currentUserId?.toString();
          const position = i + 1;
          return (
            <div
              key={u?._id || i}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all
                          ${isMe ? "bg-cyan-500/10 border border-cyan-500/20" : "glass"}`}
            >
              <span
                className={`font-display text-sm w-7 text-center shrink-0
                                ${position <= 3 ? "text-yellow-400" : "text-slate-500"}`}
              >
                {position <= 3
                  ? ["🥇", "🥈", "🥉"][position - 1]
                  : `#${position}`}
              </span>
              <div
                className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700
                              flex items-center justify-center font-display text-xs text-slate-400 shrink-0"
              >
                {u?.hunterName?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-heading text-sm font-semibold truncate ${isMe ? "text-cyan-400" : "text-slate-200"}`}
                  >
                    {u?.hunterName || "Hunter"} {isMe && "(You)"}
                  </p>
                  {m.role === "leader" && (
                    <Crown size={11} className="text-yellow-400 shrink-0" />
                  )}
                  {m.role === "officer" && (
                    <Crown size={11} className="text-slate-400 shrink-0" />
                  )}
                </div>
                <p className="font-body text-xs text-slate-500">
                  Lv.{u?.level ?? "—"}
                </p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <Star size={12} className="text-cyan-400" />
                <p className="font-display text-xs text-cyan-400">
                  {(m.contribution || 0).toLocaleString()} XP
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ label, value, color = "text-slate-200" }) {
  return (
    <div>
      <p className="text-hud mb-0.5">{label}</p>
      <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
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
        className={`font-display text-sm w-7 text-center shrink-0
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
      <div className="text-right shrink-0">
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

// Normalizes whatever shape the /leaderboard/global endpoint returns into
// { entries: [...], myPosition: {...} | null }. Handles a few common
// backend variants so the UI doesn't silently render nothing.
function normalizeLeaderboard(raw) {
  if (!raw) return { entries: [], myPosition: null };

  // Shape A: { entries: [...], myPosition: {...} }  ← expected shape
  if (Array.isArray(raw.entries)) {
    return { entries: raw.entries, myPosition: raw.myPosition || null };
  }

  // Shape B: nested one level deeper, e.g. { leaderboard: { entries, myPosition } }
  if (raw.leaderboard && Array.isArray(raw.leaderboard.entries)) {
    return {
      entries: raw.leaderboard.entries,
      myPosition: raw.leaderboard.myPosition || null,
    };
  }

  // Shape C: bare array of entries, no myPosition
  if (Array.isArray(raw)) {
    return { entries: raw, myPosition: null };
  }

  // Shape D: { data: [...] } style pagination wrapper
  if (Array.isArray(raw.data)) {
    return { entries: raw.data, myPosition: raw.myPosition || null };
  }

  // Unknown shape — log once so it's easy to spot in devtools, render empty.
  if (typeof window !== "undefined") {
    console.warn("[SocialPage] Unrecognized leaderboard response shape:", raw);
  }
  return { entries: [], myPosition: null };
}
