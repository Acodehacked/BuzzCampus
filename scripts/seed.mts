// Seed script — docs/BUILD_PLAN.md Phase 6.
//
// This lives at the workspace root rather than inside packages/db on
// purpose: it needs both @buzz/db and @buzz/core, and packages/db is the
// lowest layer with no internal dependencies (docs/ARCHITECTURE.md,
// package boundary rules). A dev script that composes two packages belongs
// above both of them, not inside one.
//
// Builds a campus that looks lived-in: reports at every stage of the SLA
// clock, a skills economy with real supply/demand imbalance so the Scarcity
// Index has something to say, projects spread across the pipeline, and —
// most importantly — people whose activity spans more than one category,
// because the platform's headline metric is exactly that.
//
//   npm run db:seed
//
// Idempotent-ish: it wipes the tables it owns first, so re-running gives a
// clean campus rather than duplicates.

import { config } from "dotenv";
import { resolve } from "node:path";
// Drizzle's SQL template tag, for building expressions. Distinct from the
// postgres-js `sql` below, which is the connection itself — mixing them up
// silently fires queries instead of composing them.
import { eq, gt, sql as raw } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env") });

// Static imports are safe here: packages/db's client connects lazily, so
// nothing touches DATABASE_URL until the first query runs — well after
// dotenv has populated it.
const { db, sql } = await import("../packages/db/src/client.js");
const schema = await import("../packages/db/src/schema.js");
const bcrypt = (await import("bcryptjs")).default;

const {
  buildComments,
  buildMilestones,
  buildTeamMembers,
  builds,
  contributionEvents,
  ledgerEntries,
  postEvents,
  postUpvotes,
  posts,
  responses,
  reviews,
  scarcitySnapshots,
  users,
  wallets,
} = schema;

const PASSWORD = "buzz1234";
const DOMAIN = process.env.SEED_EMAIL_DOMAIN ?? "buzzcampus.edu";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const pick = <T,>(items: T[], i: number) => items[i % items.length]!;

async function main() {
  console.log("→ clearing existing data");
  // Order matters: children before parents.
  await db.delete(postUpvotes);
  await db.delete(buildComments);
  await db.delete(buildMilestones);
  await db.delete(buildTeamMembers);
  await db.delete(reviews);
  await db.delete(ledgerEntries);
  await db.delete(contributionEvents);
  await db.delete(responses);
  await db.delete(postEvents);
  await db.delete(posts);
  await db.delete(builds);
  await db.delete(scarcitySnapshots);
  await db.delete(wallets);
  await db.delete(users);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // ── people ────────────────────────────────────────────────────────
  console.log("→ people");
  const people = await db
    .insert(users)
    .values([
      { name: "Aisha Rahman", email: `aisha@${DOMAIN}`, department: "Computer Science", role: "student", passwordHash },
      { name: "Vikram Nair", email: `vikram@${DOMAIN}`, department: "Mechanical", role: "student", passwordHash },
      { name: "Priya Menon", email: `priya@${DOMAIN}`, department: "Electronics", role: "student", passwordHash },
      { name: "Daniel Osei", email: `daniel@${DOMAIN}`, department: "Computer Science", role: "student", passwordHash },
      { name: "Sara Iqbal", email: `sara@${DOMAIN}`, department: "Design", role: "student", passwordHash },
      { name: "Rohit Verma", email: `rohit@${DOMAIN}`, department: "Civil", role: "student", passwordHash },
      { name: "Lena Fischer", email: `lena@${DOMAIN}`, department: "Physics", role: "student", passwordHash },
      { name: "Tom Whitfield", email: `tom@${DOMAIN}`, department: "Chemistry", role: "student", passwordHash },
      { name: "Meera Krishnan", email: `meera@${DOMAIN}`, department: "Computer Science", role: "student", passwordHash },
      { name: "Joseph Barnes", email: `joseph@${DOMAIN}`, department: "Facilities", role: "staff", passwordHash },
      { name: "Anita Desai", email: `anita@${DOMAIN}`, department: "Facilities", role: "staff", passwordHash },
      { name: "Dr. Rebecca Hall", email: `rebecca@${DOMAIN}`, department: "Incubation Cell", role: "mentor", passwordHash },
      { name: "Kavitha Rao", email: `kavitha@${DOMAIN}`, department: "Student Welfare", role: "safety", passwordHash },
      { name: "Admin", email: `admin@${DOMAIN}`, department: "Administration", role: "admin", passwordHash },
    ])
    .returning();

  const by = (name: string) => people.find((p) => p.name.includes(name))!;

  const aisha = by("Aisha");
  const vikram = by("Vikram");
  const priya = by("Priya");
  const daniel = by("Daniel");
  const sara = by("Sara");
  const rohit = by("Rohit");
  const lena = by("Lena");
  const tom = by("Tom");
  const meera = by("Meera");
  const joseph = by("Joseph");
  const anita = by("Anita");
  const rebecca = by("Rebecca");

  // Wallets: everyone gets the starter grant as a real ledger entry, so
  // every balance on the platform reconciles against its own ledger.
  console.log("→ wallets and starter grants");
  await db.insert(wallets).values(
    people.map((person) => ({ userId: person.id, balance: "2.00" })),
  );
  await db.insert(ledgerEntries).values(
    people.map((person) => ({
      userId: person.id,
      direction: "credit" as const,
      amount: "2.00",
      reason: "starter_grant",
      createdAt: daysAgo(40),
    })),
  );

  // ── builds ────────────────────────────────────────────────────────
  console.log("→ projects");
  const projects = await db
    .insert(builds)
    .values([
      {
        title: "EcoTrack",
        description:
          "Per-block electricity monitoring for the hostels, with a dashboard the warden actually checks. Currently reading four blocks on ESP32 nodes; the backend needs someone who can make the ingest pipeline not fall over at 500 readings a minute.",
        type: "startup",
        department: "Electronics",
        year: 2026,
        pipelineStage: "prototype",
        tags: ["iot", "esp32", "sustainability", "postgres"],
        repoUrl: "https://github.com/example/ecotrack",
        demoUrl: "https://ecotrack.example.edu",
        createdById: priya.id,
        createdAt: daysAgo(120),
      },
      {
        title: "Attendance without the roll call",
        description:
          "BLE beacon attendance that doesn't need the lecturer to stop and read out forty names. Validated with two departments over a semester — false-positive rate is down to 1.8%.",
        type: "fyp",
        department: "Computer Science",
        year: 2026,
        pipelineStage: "validated",
        tags: ["ble", "react-native", "postgres"],
        repoUrl: "https://github.com/example/attendance",
        reportUrl: "https://example.edu/reports/attendance.pdf",
        createdById: daniel.id,
        createdAt: daysAgo(200),
      },
      {
        title: "Hostel Mess Forecasting",
        description:
          "Predicting mess footfall from timetable data and weather to cut food waste. Ran for one term in Block A — waste down 22%. The incubation cell has picked it up.",
        type: "research",
        department: "Computer Science",
        year: 2025,
        pipelineStage: "incubated",
        tags: ["ml", "python", "sustainability"],
        reportUrl: "https://example.edu/reports/mess.pdf",
        createdById: meera.id,
        createdAt: daysAgo(320),
      },
      {
        title: "CampusMap AR",
        description:
          "AR wayfinding for first-years, built at the 36-hour hackathon and never quite abandoned. Still just a demo on one floor of the library.",
        type: "hackathon",
        department: "Design",
        year: 2026,
        pipelineStage: "idea",
        tags: ["ar", "unity", "figma"],
        createdById: sara.id,
        createdAt: daysAgo(75),
      },
      {
        title: "SolarSail",
        description:
          "Retrofitting the mechanical workshop roof with a tracking solar array. Launched last year, now supplying 14% of the workshop's daytime load.",
        type: "fyp",
        department: "Mechanical",
        year: 2025,
        pipelineStage: "launched",
        tags: ["solar", "embedded-systems", "arduino"],
        repoUrl: "https://github.com/example/solarsail",
        reportUrl: "https://example.edu/reports/solarsail.pdf",
        createdById: vikram.id,
        createdAt: daysAgo(400),
      },
      {
        title: "Lab Slot Booking",
        description:
          "A booking layer for the shared chemistry labs so nobody turns up to a full bench. Working, but nobody outside our year uses it yet.",
        type: "fyp",
        department: "Chemistry",
        year: 2026,
        pipelineStage: "prototype",
        tags: ["nextjs", "postgres"],
        createdById: tom.id,
        createdAt: daysAgo(90),
      },
    ])
    .returning();

  const ecoTrack = projects[0]!;
  const attendance = projects[1]!;
  const mess = projects[2]!;
  const campusMap = projects[3]!;
  const solarSail = projects[4]!;
  const labSlots = projects[5]!;

  await db.insert(buildTeamMembers).values([
    { buildId: ecoTrack.id, userId: priya.id, role: "Lead" },
    { buildId: ecoTrack.id, userId: rohit.id, role: "Hardware" },
    { buildId: attendance.id, userId: daniel.id, role: "Lead" },
    { buildId: attendance.id, userId: aisha.id, role: "Frontend" },
    { buildId: mess.id, userId: meera.id, role: "Lead" },
    { buildId: campusMap.id, userId: sara.id, role: "Lead" },
    { buildId: solarSail.id, userId: vikram.id, role: "Lead" },
    { buildId: solarSail.id, userId: lena.id, role: "Analysis" },
    { buildId: labSlots.id, userId: tom.id, role: "Lead" },
  ]);

  // Stage-marker posts: pipeline changes land in the same postEvents audit
  // trail as every other lifecycle change on the platform.
  console.log("→ pipeline history");
  const stageMarkers = await db
    .insert(posts)
    .values(
      projects.map((project) => ({
        authorId: project.createdById,
        type: "give" as const,
        category: "builds" as const,
        title: `${project.title} — pipeline`,
        status: "in_progress" as const,
        buildId: project.id,
        metadata: { kind: "stage_marker", stage: project.pipelineStage },
        createdAt: project.createdAt,
      })),
    )
    .returning();

  const STAGES = ["idea", "prototype", "validated", "incubated", "launched"];
  const stageEvents: (typeof postEvents.$inferInsert)[] = [];

  projects.forEach((project, index) => {
    const marker = stageMarkers[index]!;
    const reached = STAGES.indexOf(project.pipelineStage);
    for (let step = 0; step <= reached; step++) {
      stageEvents.push({
        postId: marker.id,
        actorId: project.createdById,
        fromStatus: step === 0 ? null : STAGES[step - 1],
        toStatus: STAGES[step],
        note: step === 0 ? "Project created" : null,
        createdAt: daysAgo(120 - step * 18 + index * 4),
      });
    }
  });
  await db.insert(postEvents).values(stageEvents);

  await db.insert(buildMilestones).values([
    { buildId: ecoTrack.id, title: "Four blocks reading live", note: "ESP32 nodes deployed in A through D. Readings landing every 30s.", createdAt: daysAgo(30) },
    { buildId: ecoTrack.id, title: "Warden dashboard shipped", note: "Weekly consumption by block, with a threshold alert.", createdAt: daysAgo(12) },
    { buildId: attendance.id, title: "Semester-long validation done", note: "Two departments, 340 students, 1.8% false positives.", createdAt: daysAgo(45) },
    { buildId: mess.id, title: "Picked up by the incubation cell", note: "Six months of runway and a mentor.", createdAt: daysAgo(60) },
    { buildId: solarSail.id, title: "Array live on the workshop roof", note: "14% of daytime load, measured over a month.", createdAt: daysAgo(150) },
  ]);

  await db.insert(buildComments).values([
    { buildId: ecoTrack.id, authorId: lena.id, body: "Are you logging raw readings or aggregates? Happy to help with the time-series side if it's raw.", createdAt: daysAgo(8) },
    { buildId: ecoTrack.id, authorId: priya.id, body: "Raw, at 30s intervals. That's exactly the problem — the ingest starts choking above about 500/min.", createdAt: daysAgo(8) },
    { buildId: mess.id, authorId: rebecca.id, body: "The waste numbers here are the strongest result I've seen from a student project this year. Come and talk to the cell about scaling it.", createdAt: daysAgo(58) },
  ]);

  // ── posts ─────────────────────────────────────────────────────────
  console.log("→ posts across all three categories");

  type SeedPost = {
    post: typeof posts.$inferInsert;
    /** statuses to walk through, in order */
    path?: { to: string; actor: string; note?: string; hoursAfter: number }[];
    responders?: { userId: string; message: string; status?: "proposed" | "accepted" | "declined" | "completed" }[];
    upvoters?: string[];
  };

  const CAMPUS_LOCATIONS = [
    "Block C, second floor",
    "Library reading room",
    "Hostel B washroom",
    "Mechanical workshop",
    "Block C, second floor",
    "Cafeteria",
    "Block C, second floor",
    "Lecture hall 4",
  ];

  const seeds: SeedPost[] = [
    // ── Campus ──
    {
      post: {
        authorId: rohit.id, type: "ask", category: "campus",
        title: "AC in Block C lecture hall has been dead for three days",
        description: "Two hundred people in a room with no airflow. It was reported verbally on Monday and nothing happened.",
        locationName: "Block C, second floor", lat: 12.9721, lng: 77.5933,
        metadata: { urgency: "high", slaHours: 12, issueType: "electrical", department: "Facilities" },
        createdAt: hoursAgo(30),
      },
      path: [
        { to: "accepted", actor: joseph.id, note: "Picked up — sending a technician", hoursAfter: 6 },
        { to: "in_progress", actor: joseph.id, hoursAfter: 8 },
      ],
      upvoters: [aisha.id, daniel.id, sara.id, lena.id, meera.id],
    },
    {
      post: {
        authorId: aisha.id, type: "ask", category: "campus",
        title: "Library printer jams on every double-sided job",
        description: "Third time this week. It eats the page and you lose your print credit.",
        locationName: "Library reading room", lat: 12.9734, lng: 77.5941,
        metadata: { urgency: "medium", slaHours: 48, issueType: "equipment", department: "Facilities" },
        createdAt: hoursAgo(20),
      },
      responders: [{ userId: vikram.id, message: "I've fixed this exact model before — it's the rear feed roller. I can look at it tomorrow morning." }],
      upvoters: [daniel.id, meera.id],
    },
    {
      post: {
        authorId: lena.id, type: "ask", category: "campus",
        title: "Hostel B washroom tap running continuously",
        description: "Been running since Sunday. That's a lot of water.",
        locationName: "Hostel B washroom",
        metadata: { urgency: "medium", slaHours: 48, issueType: "plumbing", department: "Facilities" },
        createdAt: daysAgo(6),
      },
      path: [
        { to: "accepted", actor: anita.id, hoursAfter: 4 },
        { to: "in_progress", actor: anita.id, hoursAfter: 6 },
        { to: "fulfilled", actor: anita.id, note: "Washer replaced", hoursAfter: 9 },
        { to: "verified", actor: lena.id, note: "Confirmed, no more running water", hoursAfter: 20 },
      ],
      upvoters: [rohit.id, tom.id],
    },
    {
      post: {
        authorId: daniel.id, type: "ask", category: "campus",
        title: "Block C second floor sockets dead again",
        description: "Same bank of sockets as last month. Nothing charges.",
        locationName: "Block C, second floor",
        metadata: { urgency: "high", slaHours: 12, issueType: "electrical", department: "Facilities" },
        createdAt: daysAgo(14),
      },
      path: [
        { to: "accepted", actor: joseph.id, hoursAfter: 3 },
        { to: "in_progress", actor: joseph.id, hoursAfter: 5 },
        { to: "fulfilled", actor: joseph.id, note: "Breaker reset, socket bank retested", hoursAfter: 7 },
        { to: "verified", actor: daniel.id, hoursAfter: 12 },
      ],
    },
    {
      post: {
        authorId: meera.id, type: "ask", category: "campus",
        title: "Block C second floor sockets dead — third time this month",
        description: "This keeps coming back. Something upstream is wrong, not the sockets.",
        locationName: "Block C, second floor",
        metadata: { urgency: "high", slaHours: 12, issueType: "electrical", department: "Facilities" },
        createdAt: daysAgo(3),
      },
      path: [{ to: "accepted", actor: joseph.id, note: "Escalating — this is the third report at this location", hoursAfter: 2 }],
      upvoters: [daniel.id, aisha.id, rohit.id],
    },
    {
      post: {
        authorId: tom.id, type: "ask", category: "campus",
        title: "Fume hood in the teaching lab is barely pulling",
        description: "Airflow indicator is sitting well below the safe line.",
        locationName: "Mechanical workshop",
        metadata: { urgency: "high", slaHours: 12, issueType: "safety", department: "Facilities" },
        createdAt: daysAgo(9),
      },
      path: [
        { to: "accepted", actor: anita.id, hoursAfter: 2 },
        { to: "in_progress", actor: anita.id, hoursAfter: 3 },
        { to: "fulfilled", actor: anita.id, note: "Duct cleared and airflow retested", hoursAfter: 10 },
        { to: "verified", actor: tom.id, note: "Reading is back in range", hoursAfter: 26 },
      ],
    },
    {
      post: {
        authorId: sara.id, type: "give", category: "campus",
        title: "I have a working projector adapter set — borrow it any time",
        description: "USB-C, HDMI, VGA, the lot. I'm in the design studio most afternoons.",
        locationName: "Cafeteria",
        metadata: { urgency: "low", slaHours: 120, issueType: "equipment" },
        createdAt: daysAgo(11),
      },
    },
    {
      post: {
        authorId: priya.id, type: "ask", category: "campus", isAnonymous: true,
        title: "Lighting on the path behind the labs has been out for weeks",
        description: "It's genuinely unsafe walking back from evening lab sessions.",
        locationName: "Lecture hall 4",
        metadata: { urgency: "high", slaHours: 12, issueType: "safety" },
        createdAt: daysAgo(4),
      },
    },

    // ── Skills ── deliberately imbalanced so the index has something to say
    {
      post: {
        authorId: aisha.id, type: "give", category: "skills",
        title: "I can teach React — hooks, state, why your effect runs twice",
        description: "Been building with it for two years. An hour gets you unstuck on most things.",
        creditAmount: "1.50",
        metadata: { skillTag: "react", durationMinutes: 60, scarcityMultiplier: 1.22 },
        createdAt: daysAgo(18),
      },
      responders: [{ userId: sara.id, message: "I'd love this — my portfolio site is fighting me.", status: "completed" }],
      path: [
        { to: "accepted", actor: aisha.id, hoursAfter: 6 },
        { to: "in_progress", actor: sara.id, hoursAfter: 30 },
        { to: "fulfilled", actor: aisha.id, hoursAfter: 32 },
        { to: "verified", actor: sara.id, note: "Genuinely useful, thank you", hoursAfter: 34 },
      ],
      upvoters: [daniel.id, meera.id, tom.id],
    },
    {
      post: {
        authorId: lena.id, type: "ask", category: "skills",
        title: "Need help with thermodynamics before Friday",
        description: "Entropy and the second law. I can follow the maths but I can't see what it means.",
        creditAmount: "2.00",
        metadata: { skillTag: "thermodynamics", durationMinutes: 90, scarcityMultiplier: 1.73 },
        createdAt: hoursAgo(16),
      },
      responders: [{ userId: vikram.id, message: "Mechanical here — thermo is the one thing I'm actually good at. Free tomorrow evening?" }],
      upvoters: [tom.id],
    },
    {
      post: {
        authorId: rohit.id, type: "ask", category: "skills",
        title: "Anyone who can explain thermodynamics properly?",
        description: "Same boat as half my year. Resit in two weeks.",
        creditAmount: "2.00",
        metadata: { skillTag: "thermodynamics", durationMinutes: 60, scarcityMultiplier: 1.73 },
        createdAt: daysAgo(2),
      },
    },
    {
      post: {
        authorId: tom.id, type: "ask", category: "skills",
        title: "Thermodynamics tutor wanted, will trade chemistry help",
        creditAmount: "1.50",
        metadata: { skillTag: "thermodynamics", durationMinutes: 60, scarcityMultiplier: 1.73 },
        createdAt: daysAgo(5),
      },
    },
    {
      post: {
        authorId: sara.id, type: "give", category: "skills",
        title: "Figma, properly — components, variants, auto layout",
        description: "I'll fix your file's structure, not just make it look nicer.",
        creditAmount: "1.00",
        metadata: { skillTag: "figma", durationMinutes: 45, scarcityMultiplier: 0.87 },
        createdAt: daysAgo(22),
      },
      responders: [{ userId: meera.id, message: "My component library is a disaster. Please.", status: "completed" }],
      path: [
        { to: "accepted", actor: sara.id, hoursAfter: 12 },
        { to: "in_progress", actor: meera.id, hoursAfter: 40 },
        { to: "fulfilled", actor: sara.id, hoursAfter: 42 },
        { to: "verified", actor: meera.id, hoursAfter: 44 },
      ],
    },
    {
      post: {
        authorId: daniel.id, type: "give", category: "skills",
        title: "Postgres query tuning — bring me your slow query",
        description: "Indexes, EXPLAIN ANALYZE, why your JOIN is doing a sequential scan.",
        creditAmount: "1.50",
        metadata: { skillTag: "postgres", durationMinutes: 60, scarcityMultiplier: 1.0 },
        createdAt: daysAgo(9),
      },
      responders: [{ userId: priya.id, message: "EcoTrack's ingest is falling over. This is exactly what I need." }],
      upvoters: [priya.id, meera.id],
    },
    {
      post: {
        authorId: vikram.id, type: "give", category: "skills",
        title: "Arduino and embedded — wiring, interrupts, why it resets randomly",
        creditAmount: "1.50",
        metadata: { skillTag: "arduino", durationMinutes: 60, scarcityMultiplier: 1.41 },
        createdAt: daysAgo(7),
      },
      upvoters: [priya.id],
    },
    {
      post: {
        authorId: meera.id, type: "ask", category: "skills",
        title: "Need someone who knows embedded-systems for a sensor rig",
        creditAmount: "2.50",
        metadata: { skillTag: "embedded-systems", durationMinutes: 120, scarcityMultiplier: 2.0 },
        createdAt: daysAgo(3),
      },
    },
    {
      post: {
        authorId: priya.id, type: "ask", category: "skills",
        title: "Anyone good with embedded-systems power management?",
        description: "Our nodes are drawing far more than they should on idle.",
        creditAmount: "2.00",
        metadata: { skillTag: "embedded-systems", durationMinutes: 90, scarcityMultiplier: 2.0 },
        createdAt: hoursAgo(9),
      },
    },
    {
      post: {
        authorId: meera.id, type: "give", category: "skills",
        title: "Python and pandas — data cleaning that doesn't take all night",
        creditAmount: "1.00",
        metadata: { skillTag: "python", durationMinutes: 60, scarcityMultiplier: 0.75 },
        createdAt: daysAgo(15),
      },
    },
    {
      post: {
        authorId: lena.id, type: "give", category: "skills",
        title: "I can teach python for people who've never programmed",
        creditAmount: "1.00",
        metadata: { skillTag: "python", durationMinutes: 90, scarcityMultiplier: 0.75 },
        createdAt: daysAgo(13),
      },
    },
    {
      post: {
        authorId: tom.id, type: "give", category: "skills",
        title: "Python for lab data — plotting and error bars that don't lie",
        creditAmount: "1.00",
        metadata: { skillTag: "python", durationMinutes: 45, scarcityMultiplier: 0.75 },
        createdAt: daysAgo(10),
      },
    },

    // ── Builds ── open roles, in the same feed as everything above
    {
      post: {
        authorId: priya.id, type: "ask", category: "builds", buildId: ecoTrack.id,
        title: "EcoTrack needs a backend developer",
        description: "The ingest pipeline falls over above ~500 readings a minute. Needs someone who's comfortable in Postgres and isn't scared of a queue.",
        creditAmount: "3.00",
        metadata: { roleNeeded: "Backend developer", requiredTags: ["postgres", "python"], isMentorship: false },
        createdAt: daysAgo(5),
      },
      responders: [{ userId: daniel.id, message: "I do Postgres tuning — happy to look at the ingest path." }],
      upvoters: [daniel.id, meera.id, aisha.id],
    },
    {
      post: {
        authorId: priya.id, type: "ask", category: "builds", buildId: ecoTrack.id,
        title: "EcoTrack needs an embedded-systems person",
        description: "Power management on the ESP32 nodes. They're drawing far too much on idle and the battery blocks won't last a term.",
        creditAmount: "2.50",
        metadata: { roleNeeded: "Embedded engineer", requiredTags: ["embedded-systems", "arduino"], isMentorship: false },
        createdAt: hoursAgo(11),
      },
      upvoters: [vikram.id],
    },
    {
      post: {
        authorId: sara.id, type: "ask", category: "builds", buildId: campusMap.id,
        title: "CampusMap AR is looking for a Unity developer",
        description: "It's a hackathon demo that deserves better. One floor of the library works; the rest is a design file.",
        metadata: { roleNeeded: "Unity developer", requiredTags: ["ar", "unity"], isMentorship: false },
        createdAt: daysAgo(12),
      },
    },
    {
      post: {
        authorId: tom.id, type: "ask", category: "builds", buildId: labSlots.id,
        title: "Looking for a mentor on getting Lab Slot Booking adopted",
        description: "The software works. Getting three departments to actually use it is the part I have no idea how to do.",
        metadata: { roleNeeded: "Mentor", requiredTags: ["nextjs"], isMentorship: true },
        createdAt: daysAgo(6),
      },
      responders: [{ userId: rebecca.id, message: "This is the usual wall. Come and see me — adoption is a people problem, not a product one.", status: "accepted" }],
      path: [{ to: "accepted", actor: tom.id, hoursAfter: 20 }],
    },
    {
      post: {
        authorId: daniel.id, type: "ask", category: "builds", buildId: attendance.id,
        title: "Attendance project needs someone for the React Native app",
        description: "Backend and BLE work is done. The app is functional and ugly.",
        creditAmount: "2.00",
        metadata: { roleNeeded: "Mobile developer", requiredTags: ["react", "figma"], isMentorship: false },
        createdAt: daysAgo(16),
      },
      responders: [{ userId: aisha.id, message: "React is my thing. I'll take it.", status: "completed" }],
      path: [
        { to: "accepted", actor: daniel.id, hoursAfter: 10 },
        { to: "in_progress", actor: aisha.id, hoursAfter: 40 },
        { to: "fulfilled", actor: aisha.id, note: "App rebuilt on the new design system", hoursAfter: 200 },
        { to: "verified", actor: daniel.id, note: "Shipped and working", hoursAfter: 210 },
      ],
      upvoters: [sara.id, meera.id],
    },
    {
      post: {
        authorId: vikram.id, type: "give", category: "builds", buildId: solarSail.id,
        title: "SolarSail: happy to walk anyone through the tracking array design",
        description: "If you're doing anything with actuators and sun position, come and take the design — we solved most of the annoying parts.",
        metadata: { roleNeeded: "", requiredTags: ["solar", "embedded-systems"], isMentorship: true },
        createdAt: daysAgo(25),
      },
      upvoters: [priya.id, lena.id],
    },
  ];

  // Insert posts, then walk each one's lifecycle so postEvents is a real
  // history rather than a single row invented at the end.
  for (const seed of seeds) {
    const [created] = await db.insert(posts).values(seed.post).returning();
    if (!created) continue;

    const createdAt = seed.post.createdAt as Date;

    await db.insert(postEvents).values({
      postId: created.id,
      actorId: created.authorId,
      fromStatus: null,
      toStatus: "open",
      createdAt,
    });

    if (seed.responders?.length) {
      await db.insert(responses).values(
        seed.responders.map((responder) => ({
          postId: created.id,
          responderId: responder.userId,
          message: responder.message,
          status: responder.status ?? ("proposed" as const),
          createdAt: new Date(createdAt.getTime() + 2 * 3_600_000),
        })),
      );
    }

    let status = "open";
    const counterparty = seed.responders?.[0]?.userId ?? null;
    const amount = seed.post.creditAmount as string | undefined;

    for (const step of seed.path ?? []) {
      const at = new Date(createdAt.getTime() + step.hoursAfter * 3_600_000);
      await db.insert(postEvents).values({
        postId: created.id,
        actorId: step.actor,
        fromStatus: status,
        toStatus: step.to,
        note: step.note ?? null,
        createdAt: at,
      });
      status = step.to;

      // Mirror what transitionPost would have done to the money and the
      // score, so the seeded campus is internally consistent.
      if (amount && Number(amount) > 0 && counterparty) {
        const payer = created.type === "ask" ? created.authorId! : counterparty;
        const payee = created.type === "ask" ? counterparty : created.authorId!;

        if (step.to === "accepted") {
          await db.insert(ledgerEntries).values({
            postId: created.id, userId: payer, direction: "debit",
            amount, reason: "escrow_lock", createdAt: at,
          });
          await db.update(wallets)
            .set({ balance: raw`${wallets.balance} - ${amount}::numeric` })
            .where(eq(wallets.userId, payer));
        }

        if (step.to === "verified") {
          await db.insert(ledgerEntries).values({
            postId: created.id, userId: payee, direction: "credit",
            amount, reason: "escrow_release", createdAt: at,
          });
          await db.update(wallets)
            .set({ balance: raw`${wallets.balance} + ${amount}::numeric` })
            .where(eq(wallets.userId, payee));
        }
      }

      if (step.to === "verified") {
        const helper =
          created.type === "ask" ? (counterparty ?? step.actor) : created.authorId!;
        const points =
          created.category === "campus" ? 15 : created.category === "skills" ? 12 : 14;

        await db.insert(contributionEvents).values({
          userId: helper, category: created.category,
          points, postId: created.id, createdAt: at,
        });
        if (created.authorId && created.authorId !== helper) {
          await db.insert(contributionEvents).values({
            userId: created.authorId, category: created.category,
            points: 3, postId: created.id, createdAt: at,
          });
        }
      }
    }

    if (status !== "open") {
      await db.update(posts)
        .set({ status: status as never })
        .where(eq(posts.id, created.id));
    }

    if (seed.upvoters?.length) {
      await db.insert(postUpvotes).values(
        seed.upvoters.map((userId) => ({ postId: created.id, userId })),
      );
      await db.update(posts)
        .set({ upvoteCount: seed.upvoters.length })
        .where(eq(posts.id, created.id));
    }
  }

  // A couple of Campus contributions for the staff, so the leaderboard
  // isn't purely students and the cross-category metric is honest.
  await db.insert(contributionEvents).values([
    { userId: joseph.id, category: "campus", points: 15, createdAt: daysAgo(13) },
    { userId: anita.id, category: "campus", points: 15, createdAt: daysAgo(8) },
    { userId: rebecca.id, category: "builds", points: 14, createdAt: daysAgo(6) },
  ]);

  console.log("→ reviews");
  const verified = await db
    .select({ id: posts.id, authorId: posts.authorId, category: posts.category })
    .from(posts)
    .where(eq(posts.status, "verified"));

  const reviewRows: (typeof reviews.$inferInsert)[] = [];
  verified.forEach((post, index) => {
    const reviewer = pick([sara, meera, daniel, lena, tom], index);
    if (!post.authorId || reviewer.id === post.authorId) return;
    reviewRows.push({
      postId: post.id,
      reviewerId: reviewer.id,
      revieweeId: post.authorId,
      rating: index % 5 === 0 ? 4 : 5,
      comment: pick(
        [
          "Turned up when they said they would.",
          "Explained it better than the lecture did.",
          "Fast, and actually fixed.",
          "Would ask again.",
        ],
        index,
      ),
      createdAt: daysAgo(4 + index),
    });
  });
  if (reviewRows.length) await db.insert(reviews).values(reviewRows);

  // ── scarcity index ────────────────────────────────────────────────
  console.log("→ scarcity index");
  const { recomputeScarcityIndex } = await import(
    "../packages/core/src/scarcity.js"
  );

  // A short history so the index has a trend, not just a single point.
  for (let daysBack = 6; daysBack >= 0; daysBack--) {
    const rows = await recomputeScarcityIndex(db as never);
    if (daysBack > 0 && rows.length) {
      await db
        .update(scarcitySnapshots)
        .set({ computedAt: daysAgo(daysBack) })
        .where(gt(scarcitySnapshots.computedAt, hoursAgo(1)));
    }
  }

  // ── report ────────────────────────────────────────────────────────
  const [counts] = await sql<
    { posts: number; events: number; ledger: number; multi: number }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM posts)          AS posts,
      (SELECT COUNT(*)::int FROM post_events)    AS events,
      (SELECT COUNT(*)::int FROM ledger_entries) AS ledger,
      (SELECT COUNT(*)::int FROM (
        SELECT user_id FROM contribution_events
        GROUP BY user_id HAVING COUNT(DISTINCT category) >= 2
      ) t)                                       AS multi
  `;

  console.log(`
✔ seeded
  ${people.length} people · ${projects.length} projects
  ${counts?.posts} posts · ${counts?.events} audit events · ${counts?.ledger} ledger entries
  ${counts?.multi} people active in 2+ categories

  Sign in with any of:
    aisha@${DOMAIN}    student, teaches React
    priya@${DOMAIN}    student, leads EcoTrack
    joseph@${DOMAIN}   facilities staff — Campus queue
    kavitha@${DOMAIN}  safety officer — sees sensitive reports
    rebecca@${DOMAIN}  mentor — Builds console
    admin@${DOMAIN}    admin — everything
  password: ${PASSWORD}
`);

  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error(error);
  await sql.end({ timeout: 5 }).catch(() => undefined);
  process.exit(1);
});
