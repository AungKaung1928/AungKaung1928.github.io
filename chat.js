/* ── AI chat widget ────────────────────────────────────────────────
 * Two modes:
 *   CHAT_ENDPOINT === ''  → offline mode, answers from TOPICS below.
 *   CHAT_ENDPOINT set     → posts to a Cloudflare Worker that holds the
 *                           Gemini API key. See worker/README.md.
 * No API key ever lives in this file. It is served publicly.
 * ----------------------------------------------------------------- */

const CHAT_ENDPOINT = '';   // e.g. 'https://portfolio-chat.<you>.workers.dev'

const SUGGESTIONS = [
    'What does he work on?',
    'Explain each project',
    'What is his experience?',
    'How do I contact him?',
];

/* Words that mean "give me the long version". */
const DEPTH_RE = /\b(detail|details|detailed|explain|elaborate|each|all|every|more|deep|deeper|fully|in depth|breakdown|walk me)\b/;

/* Offline knowledge base. Every entry is public information already on this
 * page. Keywords are matched on WORD BOUNDARIES — never as substrings, or
 * "his" would match "hi". Weight biases which topic wins a tie. */
const TOPICS = [
    {
        id: 'greeting',
        k: ['hi', 'hello', 'hey', 'yo', 'good morning', 'good evening'],
        weight: 0.5,
        a: "Hi. I answer questions about Aung Kaung Myat — a robotics software engineer working on ROS2 autonomy and moving toward physical AI.\n\nAsk about his experience, his stack, any of the four projects, or how to reach him.",
    },
    {
        id: 'who',
        k: ['who', 'about him', 'about aung', 'background', 'yourself', 'introduce', 'bio', 'summary', 'profile'],
        a: "Aung Kaung Myat is a robotics software engineer with a mechanical engineering background — he came to software from the hardware side, which shows in how he works: kinematics, sensors and real robot behaviour first, code second.\n\nHe builds autonomous mobile robots and manipulation systems on ROS2 Humble, covering navigation, localization, sensor integration and deployment on physical hardware rather than simulation alone.\n\nHis direction is physical AI: sim-to-real transfer, legged robotics, and perception for robots operating in unstructured environments.",
    },
    {
        id: 'experience',
        k: ['experience', 'exp', 'years', 'career', 'worked', 'job', 'role', 'seniority', 'employment', 'history'],
        a: "Early-career robotics software engineer, currently working professionally on ROS2 systems — autonomous mobile robots, perception and deployment on real hardware.\n\nHis mechanical engineering degree is the foundation; the software came afterwards and was built around real robots rather than coursework. Day-to-day that means ROS2 Humble in C++ and Python on Linux, with Nav2, SLAM, PCL and MoveIt2.\n\nThe four projects on this page are self-directed engineering work, not tutorials — each one exists to prove out a specific competency end to end. For dates, employers and specifics, email him at aungkaungmyattt1928@gmail.com.",
    },
    {
        id: 'goal',
        k: ['goal', 'focus', 'future', 'direction', 'physical ai', 'sim-to-real', 'sim to real', 'aiming', 'next', 'looking for', 'interested'],
        a: "Current focus is the ROS2 autonomy stack: Nav2 and localization, LiDAR perception with PCL, manipulation with MoveIt2, and simulation.\n\nThe target is physical AI — shipping learned behaviour onto real machines. Concretely: sim-to-real transfer, domain randomization, legged robotics, and perception that holds up in unstructured environments rather than clean test setups.\n\nThat is the reason the projects lean toward full pipelines on real or simulated hardware instead of isolated algorithms.",
    },
    {
        id: 'languages',
        k: ['language', 'languages', 'c++', 'cpp', 'python', 'coding', 'programming', 'write code'],
        a: "C++ and Python, both on ROS2 Humble under Linux.\n\nC++ is the default for production nodes and anything performance-critical — the LiDAR perception pipeline and the TF/Nav2 plugin work are both C++. Python is for perception, ML and prototyping, which is where the MoveIt2 demo and the fleet telemetry pipeline sit.\n\nThat split is deliberate: real-time and edge code in C++, research and glue in Python.",
    },
    {
        id: 'stack',
        k: ['stack', 'skill', 'skills', 'tech', 'technology', 'tools', 'know', 'good at', 'expertise', 'technologies'],
        a: "Core — ROS2 Humble, C++, Python, Linux.\nNavigation — Nav2, SLAM, AMCL, GMapping, Cartographer.\nPerception — LiDAR, IMU, camera, OpenCV, PCL, sensor fusion.\nManipulation — MoveIt, trajectory planning, motion control.\nML / DL — PyTorch, TensorFlow, CNNs, YOLO, object detection.\nControl — PID, path planning, state machines.\n\nThe through-line is the full ROS2 autonomy stack: sensor in, perception, planning, control, motion out — plus the infrastructure to run it (Docker, Kafka, time-series storage).",
    },
    {
        id: 'perception',
        k: ['perception', 'lidar', 'pcl', 'point cloud', 'pointcloud', 'obstacle', 'quadruped', 'sensing'],
        a: "LiDAR Perception Pipeline — C++, ROS2, PCL.\n\nA custom perception pipeline for a quadruped robot in simulation. Raw LiDAR scans are ground-plane filtered with a PCL PassThrough filter so that only genuine obstacle returns survive, and the cleaned cloud is republished for downstream planning.\n\nRViz shows raw and filtered clouds side by side, which makes the filter's effect measurable rather than assumed. The setup is teleop-ready in a custom world for driving the robot through obstacles and watching the pipeline respond.\n\nWhat it demonstrates: C++ point-cloud processing, PCL filter chains, and ROS2 topic design for perception.",
    },
    {
        id: 'manipulation',
        k: ['moveit', 'moveit2', 'manipulation', 'arm', 'pick', 'place', 'panda', 'franka', 'grasp', 'gripper', 'ompl'],
        a: "MoveIt2 Pick & Place Demo — Python, MoveIt2, ROS2, Franka Panda.\n\nA 7-DOF Franka Panda arm doing full pick-and-place with OMPL motion planning and constraint-based execution. Positioning accuracy is within ±1 cm, with a success rate above 95% achieved through multi-attempt fallback rather than a single optimistic plan.\n\nThe part that matters is the production hardening: action-server verification before execution, velocity and acceleration scaling, and graceful recovery when a plan or execution fails — so a failed grasp resumes instead of ending the run.\n\nWhat it demonstrates: MoveIt2 planning pipelines, robust FSM design, and treating failure paths as first-class.",
    },
    {
        id: 'tf',
        k: ['tf', 'tf2', 'transform', 'transforms', 'nav2', 'costmap', 'plugin', 'pluginlib', 'patrol', 'keepout', 'frame'],
        a: "TF Transform Explorer — C++, TF2, Nav2, pluginlib.\n\nA TF2 frame transformation system using both dynamic and static broadcasters, with a custom TFDiagnostics message type so transform health can be monitored as a topic instead of debugged by eye.\n\nIt also ships a Nav2 costmap plugin loaded through pluginlib, implementing keepout zones the planner must respect, plus an autonomous patrol behaviour that generates random goals and recovers when navigation fails.\n\nWhat it demonstrates: the TF tree in depth, writing custom ROS2 messages, and extending Nav2 through its plugin interfaces rather than around them.",
    },
    {
        id: 'fleet',
        k: ['fleet', 'kafka', 'docker', 'telemetry', 'database', 'questdb', 'infra', 'infrastructure', 'monitoring', 'dashboard', 'multi-robot', 'multi robot'],
        a: "Fleet Monitoring System — Python, ROS2, Kafka, Docker, QuestDB.\n\nA distributed multi-robot telemetry pipeline: ROS2 topics feed Kafka, Kafka feeds QuestDB as a time-series store. It simulates the infrastructure a real fleet needs, with multiple robots running simultaneously in simulation.\n\nThe whole stack is containerised with Docker, and a real-time dashboard reads from QuestDB over the PostgreSQL wire protocol.\n\nWhat it demonstrates: that he can build the layer around the robots — message brokers, time-series storage, containerised deployment — not only the robot software itself.",
    },
    {
        id: 'projects',
        k: ['project', 'projects', 'portfolio', 'built', 'build', 'repo', 'repos', 'repository', 'github', 'work on', 'works on', 'showcase'],
        weight: 0.9,
        a: "Four projects, each targeting a different layer of the robotics stack:\n\n1. LiDAR Perception Pipeline — C++, PCL. Ground-plane removal, clean obstacle clouds for a quadruped.\n2. MoveIt2 Pick & Place — Python, Franka Panda. OMPL planning, ±1 cm, >95% success with fallback.\n3. TF Transform Explorer — C++, TF2, Nav2. Custom diagnostics message and a costmap keepout plugin.\n4. Fleet Monitoring System — ROS2 → Kafka → QuestDB, containerised, live dashboard.\n\nAsk about any one by name for the full breakdown, or say \"explain each project in detail\". Every card above links to its repository.",
        deep: "Four projects, each targeting a different layer of the robotics stack.\n\n── 1. LiDAR Perception Pipeline · C++, ROS2, PCL\nCustom perception pipeline for a quadruped in simulation. LiDAR scans are ground-plane filtered with a PCL PassThrough filter so only real obstacle returns survive, then republished for planning. RViz shows raw vs filtered side by side so the filter's effect is measurable. Teleop-ready in a custom world.\n→ C++ point-cloud processing, PCL filter chains, perception topic design.\n\n── 2. MoveIt2 Pick & Place Demo · Python, MoveIt2, Franka Panda\n7-DOF arm doing full pick-and-place with OMPL planning and constraint-based execution. ±1 cm positioning, >95% success via multi-attempt fallback rather than one optimistic plan. Production hardening throughout: action-server verification, velocity scaling, graceful recovery so a failed grasp resumes instead of ending the run.\n→ MoveIt2 pipelines, robust FSM design, failure paths as first-class.\n\n── 3. TF Transform Explorer · C++, TF2, Nav2, pluginlib\nDynamic and static TF2 broadcasters plus a custom TFDiagnostics message, making transform health a monitorable topic instead of an eyeball problem. Adds a Nav2 costmap plugin via pluginlib implementing keepout zones, and autonomous patrol with random goal generation and recovery behaviour.\n→ TF tree depth, custom ROS2 messages, extending Nav2 through its plugin API.\n\n── 4. Fleet Monitoring System · Python, ROS2, Kafka, Docker, QuestDB\nDistributed multi-robot telemetry: ROS2 → Kafka → QuestDB time-series storage, with several robots running at once in simulation. Fully containerised, with a real-time dashboard over the PostgreSQL wire protocol.\n→ The infrastructure layer around a fleet, not just the robot software.\n\nEvery card above links to its repository.",
    },
    {
        id: 'contact',
        k: ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'linkedin', 'cv', 'resume', 'talk', 'get in touch', 'available'],
        a: "Email: aungkaungmyattt1928@gmail.com — that is the fastest route.\n\nGitHub is github.com/AungKaung1928, and LinkedIn is linked in the Contact section above. For a CV, role details or anything this page does not cover, email is the right channel.",
    },
];

const FALLBACK = "I only cover Aung's robotics work — experience, stack, the four projects, and contact details.\n\nTry: \"what is his experience\", \"explain each project\", \"does he know C++\", or \"how do I contact him\".";

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Word-boundary match. C++ needs special handling since '+' is not a word char. */
function hits(query, keyword) {
    if (keyword === 'c++' || keyword === 'cpp') {
        return query.includes('c++') || /\bcpp\b/i.test(query);
    }
    return new RegExp(`\\b${escapeRe(keyword)}\\b`, 'i').test(query);
}

function localAnswer(text) {
    const q = text.toLowerCase();
    const deep = DEPTH_RE.test(q);

    const scored = [];
    for (const t of TOPICS) {
        let score = 0;
        for (const kw of t.k) if (hits(q, kw)) score += kw.length * (t.weight ?? 1);
        if (score > 0) scored.push({ t, score });
    }
    if (!scored.length) return FALLBACK;

    scored.sort((a, b) => b.score - a.score);

    // Drop the greeting if any real topic also matched.
    const real = scored.filter((s) => s.t.id !== 'greeting');
    const picked = real.length ? real : scored;

    const top = picked[0];
    const parts = [deep && top.t.deep ? top.t.deep : top.t.a];

    // Multi-topic question ("stack and projects") — add the runner-up if it
    // scored comparably and is not already a subset of the first answer.
    const second = picked[1];
    if (second && second.score >= top.score * 0.55 && second.t.id !== 'greeting') {
        parts.push(deep && second.t.deep ? second.t.deep : second.t.a);
    }

    return parts.join('\n\n───\n\n');
}

/* ── UI ──────────────────────────────────────────────────────────── */

const fab = document.createElement('button');
fab.id = 'chat-fab';
fab.setAttribute('aria-label', 'Ask about Aung');
fab.innerHTML = `
    <svg class="open-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
    <svg class="close-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;

const panel = document.createElement('div');
panel.id = 'chat-panel';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Ask about Aung');
panel.innerHTML = `
    <div class="chat-header">
        <div>
            <h4>Ask about Aung</h4>
            <span class="chat-sub">// robotics &middot; physical AI portfolio assistant</span>
        </div>
        <button id="chat-close" aria-label="Close chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>
    <div id="chat-log"></div>
    <div class="chat-suggestions"></div>
    <div class="chat-input-row">
        <textarea id="chat-input" rows="1" maxlength="500" placeholder="Ask a question…"></textarea>
        <button id="chat-send">Send</button>
    </div>`;

document.body.append(fab, panel);

const log = panel.querySelector('#chat-log');
const input = panel.querySelector('#chat-input');
const sendBtn = panel.querySelector('#chat-send');
const suggestionBar = panel.querySelector('.chat-suggestions');

const history = [];   // {role:'user'|'model', text} — sent only in endpoint mode
let busy = false;

function addMsg(text, cls) {
    const el = document.createElement('div');
    el.className = `chat-msg ${cls}`;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
}

function addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-msg bot chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
}

function renderSuggestions() {
    suggestionBar.innerHTML = '';
    for (const s of SUGGESTIONS) {
        const b = document.createElement('button');
        b.textContent = s;
        b.addEventListener('click', () => { input.value = s; send(); });
        suggestionBar.appendChild(b);
    }
}

async function askEndpoint(text) {
    const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-8) }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.reply) throw new Error('empty reply');
    return data.reply;
}

async function send() {
    const text = input.value.trim();
    if (!text || busy) return;

    input.value = '';
    input.style.height = 'auto';
    addMsg(text, 'user');
    suggestionBar.innerHTML = '';

    busy = true;
    sendBtn.disabled = true;

    if (!CHAT_ENDPOINT) {
        const typing = addTyping();
        setTimeout(() => {
            typing.remove();
            addMsg(localAnswer(text), 'bot');
            busy = false;
            sendBtn.disabled = false;
            input.focus();
        }, 320);
        return;
    }

    const typing = addTyping();
    try {
        const reply = await askEndpoint(text);
        typing.remove();
        addMsg(reply, 'bot');
        history.push({ role: 'user', text }, { role: 'model', text: reply });
    } catch (err) {
        typing.remove();
        addMsg(localAnswer(text), 'bot');
        addMsg('Live assistant unreachable — answered from the local profile instead.', 'error');
        console.warn('chat endpoint failed:', err);
    } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

function toggle(open) {
    const willOpen = open ?? !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    fab.classList.toggle('open', willOpen);
    if (willOpen) {
        if (!log.children.length) {
            addMsg("Hi — I'm the assistant for this portfolio. Ask about Aung's robotics work, his stack, any of the four projects, or how to reach him.", 'bot');
            renderSuggestions();
        }
        input.focus();
    }
}

fab.addEventListener('click', () => toggle());
panel.querySelector('#chat-close').addEventListener('click', () => toggle(false));
sendBtn.addEventListener('click', send);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false);
});
