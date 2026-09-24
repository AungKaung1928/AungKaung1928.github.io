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
Aung Kaung Myat — Robotics Software Engineer.
Professionally he works on real mobile robots: ROS2, C++, navigation, LiDAR
perception and system integration. The projects below are personal work, not
job work: robot learning trained in simulation on a laptop CPU, measured
against a hand-written baseline that was built first, and exported to run on
device. ROS2 and C++ for the systems layer, PyTorch for the learning. Early
career.

Current focus: robot learning on CPU — a biped balance policy, arm
manipulation by RL, imitation and language, a detector quantised to INT8;
sim-to-real method (domain randomisation, held-out physics, system
identification, ONNX export); a C++17 simulation backend proven bit-identical
to its Python reference.
Career direction: Physical AI Engineer — shipping learned behaviour onto real
machines: sim-to-real transfer, legged locomotion, perception outside a staged
scene.

Hard constraint worth knowing: there is no GPU in any of this work. The whole
robot-learning track was designed around an 8-thread CPU budget, which is why
the models are small and why every project opens with a feasibility or
verification measurement.

Stack
- Core: ROS2 (Humble), C++17, Python, Linux, Docker, CMake
- Robot Learning: PPO, Imitation learning, Language-conditioned policies,
  Domain randomisation, System identification, Sim-to-real transfer
- ML / DL: PyTorch, CNN, Object detection, INT8 quantisation, ONNX Runtime
- Perception: LiDAR, IMU, Sensor fusion, OpenCV, PCL
- Navigation & Manipulation: Nav2, SLAM, MoveIt2, OMPL
- Simulation: MuJoCo, Gazebo, RViz
Every current repository ships a Dockerfile and a GitHub Actions workflow that
runs its tests.

Projects — four current, all robot learning on CPU, plus four earlier ones.

1. Microduck Balance and Push Recovery (Python, MuJoCo, PyTorch, ONNX)
   https://github.com/AungKaung1928/microduck-rl
   A balance-and-recover policy for a 25 cm, 737 g open-source biped with 14
   position-controlled servos, trained with PPO in CPU MuJoCo. Physics at
   500 Hz, control at 50 Hz, fixed 5-second episodes with three seeded pushes
   and no early termination. The observation is 48 numbers and every one is
   something the real robot's sensors report (joint angles, joint speeds, the
   previous action, gyro, gravity in the body frame); 13 simulator-only
   quantities were dropped and a test proves nothing leaked back in. The
   reward was rebuilt from measurement: three of four penalties were each
   under 0.25% of the return, so two were dropped and the joint-velocity
   weight was set from its measured share (5.24% under random actions); a
   height Gaussian that was flat everywhere the fallen robot lies became a
   linear ramp. The shipped PD hold-pose controller scores 175.2 +/- 3.1 of a
   500 ceiling under that reward over 20 seeds (108.7 +/- 2.9 under the old
   one) and is the baseline the policy has to beat. PPO carries a running
   observation normaliser, a truncation bootstrap, and checkpointed chunks.
   Result: After the first 25M-step chunk, PPO scores 332.6 ± 5.1 of 500 against the PD controller's 175.8 ± 0.2 under the same reward and keeps the trunk above the fall height for 74% of steps (PD 47%), 100 episodes x 5 seeds. The push column reads 100% against 88%, but with a 0.00 s time to recover it measures push resistance, not standing back up. The second 25M chunk is the next run, with a smaller step size: the clip fraction reached 0.73 and the return stopped improving after about 8M steps.
   Throughput lesson, kept on the page: the budget was set from 13,300
   environment steps per second (bare physics times a wrapper factor); the
   training loop itself runs at about 3,300 because the round trip to eight
   worker processes and the policy forward pass were never in the
   composition. Fifth revision of that figure, the first measured on the
   workload. Domain randomisation, measured: a second policy trained for the
   same 25M steps under physics randomised between four measured servo fits
   (plus mass, friction, latency, noise), both evaluated on two held-out model
   variants (backlash joints, passive rollers), 100 episodes x 5 seeds. It made
   the policy worse. By the height-only survival test it looked like a win
   (1.00 vs 0.74), but it was upright only 28% of steps vs 47% with the trunk
   at a median 9 cm: it learned to brace in a crouch, not stand. Robust to
   backlash (+3.2 return vs -15.2), collapsed on rollers (147 vs 374), which
   the nominal policy found easier than its own model. One seed, half the
   schedule, one reward; likely cause is a height term blind to tilt. Upright
   share and trunk height were added to the metrics after this. ONNX export
   with the normaliser folded in: 2.4e-06 max error vs PyTorch, 0.033 ms p99
   on one thread.

2. Threaded C++ MuJoCo Backend, Bit-Identical (C++17, MuJoCo, pybind11, CMake)
   https://github.com/AungKaung1928/mujoco-vecenv-cpp
   The Microduck environment rewritten in C++17: one MuJoCo model copy per
   environment, N environments on T threads of one process (environment i on
   thread i mod T, so results do not depend on T), a pybind11 module and a
   drop-in vector env that runs the Python PPO script unchanged. The claim
   comes before speed: over 25 episodes, 6,275 of 6,275 observations are
   bit-identical to the Python environment, with identical rewards and flags,
   tested in CI against a pinned commit of the Python repo. Getting there
   meant matching numpy's eight-accumulator pairwise sum (20,000 of 20,000
   random vectors), Python's ** which is libm pow not x*x (1,621 mismatches in
   2,000,000), a float32 scale constant promoted to float64, and MuJoCo's
   second forward pass which is not a no-op because the solver warm-starts;
   fused multiply-add is disabled. CI also rebuilds under AddressSanitizer,
   UndefinedBehaviorSanitizer and ThreadSanitizer, each needing a documented
   workaround for MuJoCo's prebuilt library. Measured: full-environment sweep
   5,639 env-steps/s on 1 thread to 20,287 on 8 (45% efficiency, the same
   figure the Python processes reach, so process isolation was not the
   loss); bare physics 27,011 at 8 threads, reproduced within 1% by a second
   sweep, with the benchmark's own trend guard flagging the run because the
   single-thread reference scatters about 5% on this laptop (the verdict is
   printed next to the rows); sustained 8 threads over six minutes: peak
   20,829, plateau 13,329 to 16,238, the same power-management dip at window
   11 that the Python run shows; head to head with Python processes
   alternating in one run: 12,327 vs 6,385 env-steps/s at 8 workers, 1.9 to
   2.0x in both runs, clearing the 1.3x rule written in advance. The
   comparison also showed the Python vector env delivering about 6,400
   env-steps/s at 8 processes, half the 13,300 budget. Not yet done: a
   training run on the C++ backend compared to the Python one across seeds.

3. SO-ARM100 Manipulation with RL, Imitation and Language
   (Python, MuJoCo, PyTorch, LeRobot)
   https://github.com/AungKaung1928/so-arm100-rl
   https://github.com/AungKaung1928/so-arm100-sim
   https://github.com/AungKaung1928/so-arm100-il
   https://github.com/AungKaung1928/so-arm100-vla
   One MuJoCo bench for the SO-ARM100 (a low-cost 5-joint arm with a parallel
   gripper, MuJoCo Menagerie model) and three policy repositories that learn
   the same four tasks (reach, push, lift, pick-and-place on three coloured
   cubes) three ways. Bench: 25-d state or 15-d proprio + image observations,
   20 Hz, a scripted IK expert that resolves the 180-degree grasp ambiguity
   and integrates end-effector error to cancel servo sag, domain
   randomisation over mass, friction, servo gain, damping, cube size, action
   latency and noise, six held-out physics cells (heavy, slippery, weak,
   laggy, noisy, small) each outside the randomised range, one evaluation
   protocol of 100 episodes x 5 seeds, a LeRobot v3 dataset recorder. A test
   caught a latency-buffer off-by-one that delayed every command one step.
   RL: PPO with a reach -> push -> lift curriculum (promotion at rolling
   success 0.8 / 0.8 / 0.6), nominal vs full randomisation, evaluated on the
   held-out cells, checkpoints proven bit-exact on resume, ONNX export.
   Imitation: behaviour cloning, DAgger with a shadow expert (5 iterations, 20
   rollouts each), an action-chunking transformer, a scaling curve over 10,
   25, 50, 100 and 200 demonstrations x 3 seeds, held-out physics transfer.
   Language: frozen MiniLM sentence encoder (hashing encoder as ablation) +
   keypoint CNN + action-chunk transformer; 12 task-colour pairs of which 3
   are held out (lift blue, push red, pick-and-place green), 5 training and 3
   held-out sentence templates per task; splits seen / paraphrase / combo;
   SmolVLA-base run zero-shot in the same simulator as a reference line only;
   a LoRA gate at 0.51 s per step on a 176.7M stand-in passed its
   pre-written under-5-s rule. Measured so far: 127 tests (63 / 21 / 19 / 24)
   green; MiniLM cosines are dominated by surface words (lift green vs
   lift blue 0.82, a true paraphrase 0.59), so paraphrase generalisation has
   to be tested, not assumed. Bench reference measured: scripted expert at
   100 episodes x 5 seeds, reach 1.00 everywhere, lift and pick-and-place
   0.93 nominal but 0.73 / 0.72 on the small cube (the only cell that breaks
   it; no other cell moves them more than 0.08), push 0.73-0.79 in every
   cell. Throughput 1,954 env-steps/s at 1 process, 7,302 at 8 in 15 s
   bursts, 5,361 sustained. RL measured on one training seed: PPO lifts from
   scratch at 1.0M steps; DR from scratch stalled (rolling success never
   above 0.09) and was stopped at 4.9M; a DR fine-tune of the nominal policy halves the mean
   held-out success drop, 0.120 -> 0.056, almost all on 3-step action latency
   (0.458 -> 0.760). The DR policy had 10M more steps, so part of the gain may
   be training length; the control run was not done. Two more failures kept
   as evidence: KL blow-up without a stop, and a hover exploit under the 5 cm
   success line. ONNX export matches PyTorch to 2.1e-6, 0.008 ms p50 on one
   thread. The imitation and language tables are still not measured. Say so
   plainly if asked.

4. Tabletop Clutter Detector, INT8 on One Thread (Python, PyTorch, MuJoCo,
   ONNX Runtime)
   https://github.com/AungKaung1928/mujoco-clutter-detect
   Anchor-free detection of 3-6 overlapping objects on a table, tilted
   camera. Labels read from the renderer's segmentation buffer, so no box is
   hand-drawn and every box is already correct under perspective and
   occlusion. COCO mAP@[.5:.95] implemented from scratch and unit-tested
   before the detector existed. Results: mAP 0.911 for the learned detector
   (380,631 parameters, 215.0 M MACs, 25 epochs, 34 min on 8 CPU threads)
   against 0.532 for a fitted classical pipeline. AP75 0.9896 vs AP50 0.9899,
   a 0.0003 gap, meaning localisation is essentially exact. An augmentation
   ablation returned +0.0007 mAP and is published as the null it is. Exported
   to ONNX: identical mAP, 1.20 ms per image at 8 threads against 3.87 ms in
   eager PyTorch, but 3.69 ms on one thread against the classical pipeline's
   2.13 ms, and one thread is the budget a perception node usually gets. Step
   6: static INT8 through ONNX Runtime in QDQ form, unsigned activations and
   signed per-channel weights, calibrated on 200 training images (never on
   the validation split), MinMax vs Percentile vs Entropy calibration
   compared, a dynamic-quantisation row kept to show it is the wrong tool for
   a CNN; structured channel pruning at 25% and 50% with a 3-epoch fine-tune;
   every graph scored by the same mAP on the same images, with recall on
   objects under 50% visible watched separately; one figure of one-thread
   latency against mAP. Result: Static INT8 (minmax calibration on 200 training images) runs the detector in 1.38 ms on one thread, 2.6x faster than fp32's 3.57 ms and under the classical pipeline's 2.13 ms, at mAP 0.9097 against fp32's 0.9107 (-0.0010); structured pruning was the wrong tool here: removing half the channels cost 0.065 mAP for 2.42 ms, and pruned-plus-INT8 at 1.25 ms buys under 10% over INT8 alone at that price, so static INT8 alone is what would ship.
   A one-thread x86 latency is not a Jetson latency; the ordering is expected
   to carry, the ratios are not.

Earlier work, walkthroughs still on the site:
- PPO vs LQR on Cart-Pole https://github.com/AungKaung1928/ppo-from-scratch
  PPO from first principles against LQR derived by iterating the Riccati
  recursion; 16 seeds, steps-to-threshold median 62,144, IQR [60,442,
  63,448]; ablations judged by two-sided permutation tests; LQR keeps about
  twice PPO's basin of attraction at zero sample cost. Its PPO loop trains
  projects 1 and 3.
- Cube Pose Regression CNN https://github.com/AungKaung1928/mujoco-cube-pose-cnn
  Planar pose from one 128x128 render; a 27k-parameter soft-argmax head at
  0.59 mm median error against a refitted classical baseline at 1.91 mm
  (one calibrated scalar removed a +2.98 mm radial bias). Its keypoint head
  is the front end of project 3's image policies.
- MoveIt2 Pick & Place Demo https://github.com/AungKaung1928/moveit_pickplace_demo
  A 7-DOF Franka Panda clears seven balls into a box in simulation with no
  hard-coded poses: HSV detection, pinhole back-projection, a C++
  reachability validator, a Python state machine, Cartesian-first execution
  with OMPL fallback. No positioning-accuracy or success-rate figure is
  claimed, because neither was measured.
- Fleet Monitoring System https://github.com/AungKaung1928/fleet_monitoring_ws
  ROS2 -> Kafka -> QuestDB telemetry for several TurtleBot3 in Gazebo,
  containerised, dashboard over the PostgreSQL wire protocol.

Every project has a full written walkthrough at
aungkaung1928.github.io/projects/ — architecture, every source file, the
measurements, and what each result does not prove.

The method that runs through all of it: build the hand-written baseline first
and refit it until it is hard to beat; implement and test the metric before
the model; verify the environment (to the bit, where a second implementation
exists) before anything trains in it; publish null results, unstable-benchmark
verdicts and corrections rather than overwriting them; report the axes where
the learned method loses.

Honest gaps: early career; every project is simulation, nothing transferred to
hardware; no GPU, CUDA, TensorRT or large-scale training experience; the
SO-ARM100 imitation and language tables are not measured yet (RL is, one seed), and the Microduck
domain-randomisation result is measured and negative (half schedule, one seed); largest
model is 380,631 parameters; Nav2/SLAM/AMCL are professional experience with
no project on this page behind them; no employers, dates or role scope
published.

Contact: aungkaungmyattt1928@gmail.com · github.com/AungKaung1928
`.trim();

const SYSTEM_PROMPT = `
You are a concise assistant embedded in Aung Kaung Myat's portfolio website.
Answer questions from visitors — usually engineers or people reviewing his work — about his
skills, projects and experience.

Rules:
Grounding
- Use ONLY the profile below. Never invent employers, dates, metrics or claims.
- If the profile does not cover it — salary, location, visa status, university,
  exact dates — say plainly that it is not published and give the email. Do not
  hedge, speculate, or pad the gap with generic filler.
- Decline anything unrelated to his professional background in one sentence,
  then offer a topic you can cover.
- Speak about him in the third person. Never claim to be him.

Depth — long by default
- Answer thoroughly every time: 2-4 headings with bullets under them, covering
  the mechanism and not only the claim. The widget types answers out, so
  length is expected; a recruiter should learn something concrete — a
  technology, a number, or a design decision — from every reply.
- Only go short when the visitor asks for it: "short", "brief", "quick",
  "summary", "tldr", "in a sentence". Then give 2-4 sentences and stop.
- Prefer specifics over adjectives: "mAP 0.911 against a fitted classical
  baseline's 0.532, 1.20 ms through ONNX Runtime" beats "strong ML skills".
- Say what is NOT covered where it matters — no hardware transfer, no GPU
  work, no accuracy or success-rate figure for the MoveIt2 project, the
  SO-ARM100 imitation and language tables not yet measured, and no training run yet on the
  C++ backend. Honest limits beat padding.
- Never answer in a single throwaway sentence.
- End with one short follow-up question the visitor could ask next, only when
  it is genuinely useful.

Formatting — the widget renders this exact subset, nothing else
- "## Section name" on its own line becomes a small heading. Use 2-4 of them
  for longer answers; skip headings entirely for short ones.
- "- item" becomes a bullet. "1. item" becomes a numbered item.
- Everything else is a paragraph. Blank lines separate blocks.
- No other markdown. No **bold**, no backticks, no tables, no links in
  brackets. Write bare URLs and email addresses as plain text.

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
                    generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
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
