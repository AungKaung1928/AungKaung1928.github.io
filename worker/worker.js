/* Cloudflare Worker — Gemini proxy for the portfolio chat widget.
 *
 * The API key is a Worker secret (GEMINI_API_KEY). It is never sent to the
 * browser. Deploy:  wrangler secret put GEMINI_API_KEY  &&  wrangler deploy
 */

const MODEL = 'gemini-2.5-flash';

const ALLOWED_ORIGINS = [
    'https://aungkaung1928.github.io',
    'http://localhost:8000',
];

const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_TURNS = 8;

// Edit freely. Everything here is public information from the portfolio page.
const PROFILE = `
Aung Kaung Myat — Robotics Software Engineer, mechanical engineering background.
Builds autonomous mobile robots and manipulation systems with ROS2: navigation,
localization, sensor integration, deployment on real hardware.

Current focus: ROS2 Nav2 and localization; LiDAR perception with PCL;
manipulation with MoveIt2; simulation.
Career direction: physical AI — sim-to-real transfer, legged robotics,
perception in unstructured environments.

Stack
- Core: ROS2 Humble, C++, Python, Linux
- Navigation: Nav2, SLAM, AMCL, GMapping, Cartographer
- Perception: LiDAR, IMU, camera, OpenCV, PCL, sensor fusion
- Manipulation: MoveIt, trajectory planning, motion control
- ML/DL: PyTorch, TensorFlow, CNNs, YOLO
- Control: PID, path planning, state machines

Projects
1. LiDAR Perception Pipeline (C++, ROS2, PCL) — perception pipeline for a
   quadruped in simulation. Ground-plane removal via a PCL PassThrough filter
   so only real obstacle returns survive; cleaned cloud republished for
   planning. RViz shows raw vs filtered side by side so the filter's effect is
   measurable. Teleop-ready in a custom world.
   Demonstrates: C++ point-cloud processing, PCL filter chains, perception
   topic design.

2. MoveIt2 Pick & Place Demo (Python, MoveIt2, ROS2, Franka Panda) — 7-DOF arm,
   full pick-and-place, OMPL planning with constraint-based execution. ±1 cm
   positioning, >95% success via multi-attempt fallback rather than one
   optimistic plan. Production hardening: action-server verification before
   execution, velocity and acceleration scaling, graceful recovery so a failed
   grasp resumes instead of ending the run.
   Demonstrates: MoveIt2 pipelines, robust FSM design, failure paths treated as
   first-class.

3. TF Transform Explorer (C++, TF2, Nav2, pluginlib) — dynamic and static TF2
   broadcasters plus a custom TFDiagnostics message, making transform health a
   monitorable topic instead of an eyeball problem. Nav2 costmap plugin loaded
   through pluginlib implementing keepout zones the planner must respect.
   Autonomous patrol with random goal generation and recovery behaviour.
   Demonstrates: TF tree depth, custom ROS2 messages, extending Nav2 through
   its plugin interfaces rather than around them.

4. Fleet Monitoring System (Python, ROS2, Kafka, Docker, QuestDB) — distributed
   multi-robot telemetry: ROS2 topics to Kafka to QuestDB time-series storage,
   several robots running at once in simulation. Fully containerised; real-time
   dashboard over the PostgreSQL wire protocol.
   Demonstrates: the infrastructure layer around a fleet, not only the robot
   software.

Experience note: early-career, currently working professionally on ROS2
systems. Mechanical engineering degree first, software built around real robots
afterwards. The four projects are self-directed engineering work, not
tutorials. For dates, employers and specifics, refer the visitor to the email.

Contact: aungkaungmyattt1928@gmail.com · github.com/AungKaung1928
`.trim();

const SYSTEM_PROMPT = `
You are a concise assistant embedded in Aung Kaung Myat's portfolio website.
Answer questions from visitors — usually recruiters or engineers — about his
skills, projects and experience.

Rules:
- Use ONLY the profile below. Never invent employers, dates, metrics or claims.
- If the profile does not cover it, say so and point to the contact email.
- Decline anything unrelated to Aung's professional background in one sentence.
- Default to a substantive answer: 3-6 sentences, or short labelled lines when
  listing. If the visitor asks to "explain", for "detail", or about "each"
  project, go longer and cover every relevant item properly.
- Never answer in a single throwaway sentence — a recruiter should learn
  something concrete (a technology, a number, a design decision) every time.
- Plain text only, no markdown syntax. Blank lines between paragraphs are fine.
- Speak about him in the third person.

PROFILE
${PROFILE}
`.trim();

function corsHeaders(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Vary': 'Origin',
    };
}

function json(body, status, origin) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }
        if (request.method !== 'POST') {
            return json({ error: 'POST only' }, 405, origin);
        }
        if (!ALLOWED_ORIGINS.includes(origin)) {
            return json({ error: 'origin not allowed' }, 403, origin);
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'bad json' }, 400, origin);
        }

        const message = String(body.message || '').trim();
        if (!message) return json({ error: 'empty message' }, 400, origin);
        if (message.length > MAX_MESSAGE_CHARS) {
            return json({ error: 'message too long' }, 413, origin);
        }

        const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];
        const contents = [];
        for (const turn of history) {
            const role = turn.role === 'model' ? 'model' : 'user';
            const text = String(turn.text || '').slice(0, MAX_MESSAGE_CHARS);
            if (text) contents.push({ role, parts: [{ text }] });
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

        let upstream;
        try {
            upstream = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': env.GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents,
                    generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
                }),
            });
        } catch (err) {
            return json({ error: 'upstream unreachable' }, 502, origin);
        }

        if (!upstream.ok) {
            const detail = await upstream.text();
            console.log('gemini error', upstream.status, detail.slice(0, 500));
            // 429 = free-tier quota exhausted; the widget falls back locally.
            return json({ error: 'upstream error', status: upstream.status }, 502, origin);
        }

        const data = await upstream.json();
        const reply = data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('')
            .trim();

        if (!reply) return json({ error: 'no reply' }, 502, origin);
        return json({ reply }, 200, origin);
    },
};
