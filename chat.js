/* ── Portfolio assistant ───────────────────────────────────────────
 * Two modes:
 *   CHAT_ENDPOINT === ''  → offline mode. Answers come from KB below.
 *   CHAT_ENDPOINT set     → posts to a Cloudflare Worker holding the
 *                           Gemini key, and falls back to the KB if that
 *                           call fails. See worker/README.md.
 *
 * No API key ever lives in this file — it is served publicly.
 *
 * Every fact below is already printed on this page. Nothing is invented:
 * if a visitor asks something the page does not cover, the assistant says
 * so and points at the email address instead of guessing.
 * ----------------------------------------------------------------- */

const CHAT_ENDPOINT = '';   // e.g. 'https://portfolio-chat.<you>.workers.dev'

const EMAIL = 'aungkaungmyattt1928@gmail.com';

/* Answers are thorough by default — the long form is what a visitor came
 * for. These words are the opt-out. */
const BRIEF_RE = /\b(short|shortly|brief|briefly|quick|quickly|tldr|tl;dr|one line|one-line|summary|summarise|summarize|in a sentence|keep it short|just the)\b/;

/* ── Knowledge base ──────────────────────────────────────────────────
 * a     — short answer, used when the visitor asks for "short" or "brief"
 * deep  — long answer; this is the default, because a thorough reply is
 *         what someone opening the widget is actually after
 * next  — follow-up questions offered as chips after this answer
 * label — shown in the "Topics" menu; `ask` is what that chip sends
 * ------------------------------------------------------------------ */

const TOPICS = [
    {
        id: 'help',
        label: 'What can I ask?',
        ask: 'What can I ask you?',
        k: ['help', 'topics', 'menu', 'options', '!what can i ask', '!what can you', 'commands', 'guide'],
        weight: 1.4,
        a: "I answer questions about Aung Kaung Myat's robotics work. Six areas:\n\n" +
           "## Background\n" +
           "- Who he is, his experience level, how he works\n" +
           "- Where he is heading: physical AI, sim-to-real transfer\n" +
           "## Skills\n" +
           "- Robot learning: PPO, imitation learning, language-conditioned policies, reward design, domain randomisation, system identification\n" +
           "- ML / DL: PyTorch, CNNs, object detection, INT8 quantisation, ONNX Runtime\n" +
           "- C++17 and ROS2: a threaded simulation backend, nodes, actions, MoveIt2, Nav2\n" +
           "- Simulation: MuJoCo, Gazebo, RViz, synthetic data\n" +
           "## Projects\n" +
           "- The four current projects together, or any one by name\n" +
           "- Microduck balance · C++ MuJoCo backend · SO-ARM100 manipulation · Clutter detector with INT8\n" +
           "- The four earlier projects they grew out of: PPO vs LQR, cube pose CNN, MoveIt2 pick and place, fleet monitoring\n" +
           "## Numbers\n" +
           "- Every headline figure on the page and how it was measured\n" +
           "## Contact\n" +
           "- Email, GitHub, LinkedIn\n\n" +
           "Ask in plain English. Add the word \"detail\" to any question and I will go long.",
        next: ['Explain each project in detail', 'What numbers can he back up?', 'Does he do machine learning?', 'How do I contact him?'],
    },
    {
        id: 'greeting',
        label: null,
        k: ['hi', 'hello', 'hey', 'yo', 'howdy', 'good morning', 'good evening', 'good afternoon'],
        weight: 0.5,
        a: "Hi. I am the assistant for this portfolio — I answer questions about Aung Kaung Myat, a robotics software engineer working on learned perception and control for physical machines.\n\n" +
           "Good places to start:\n" +
           "- His background and experience\n" +
           "- His stack — robot learning, ML, ROS2, perception, manipulation\n" +
           "- Any of the four current projects, the four earlier ones, or all of them at once\n" +
           "- The numbers behind them, and which numbers do not exist\n\n" +
           "Ask \"what can I ask you?\" for the full list.",
        next: ['Who is he?', 'What is his experience?', 'Explain each project', 'How do I contact him?'],
    },
    {
        id: 'who',
        label: 'Who is he?',
        ask: 'Who is Aung Kaung Myat?',
        k: ['who', 'about him', '!about aung', 'background', 'yourself', 'introduce', 'bio', 'summary', 'profile', 'himself'],
        a: "Aung Kaung Myat is a robotics software engineer. His day job is ROS2, C++ and LiDAR perception on real mobile robots. The projects on this page are personal work on learned perception and control — trained in simulation, measured against a classical baseline that had to be beaten, and exported to run on device.\n\n" +
           "ROS2 and C++ carry the systems layer; PyTorch carries the learning. The pattern across every project is the same: build the hand-written method first, measure it, then find out whether the learned one is actually worth its cost.\n\n" +
           "His direction is physical AI: sim-to-real transfer, legged locomotion, and perception that survives outside a staged scene.",
        deep: "## Short version\n" +
           "Robotics software engineer, working on real mobile robots professionally — ROS2, C++, navigation and LiDAR perception. This page is his personal work: learned perception and control, built on ROS2 and PyTorch, with a measured classical baseline under every learned result.\n\n" +
           "## What he actually builds\n" +
           "Four current projects, all robot learning on a laptop with no GPU: a balance-and-recover policy for a small biped, a C++17 simulation backend proven bit-identical to its Python reference, one MuJoCo bench for the SO-ARM100 arm feeding a reinforcement-learning, an imitation and a language-conditioned policy, and a tabletop detector taken down to INT8 on one CPU thread. Four earlier projects sit behind them: PPO written from scratch against LQR, a cube-pose CNN, a closed-loop MoveIt2 pick-and-place stack on a Franka Panda, and a containerised multi-robot telemetry pipeline. The PPO loop and the keypoint head from the earlier work are reused in the current one.\n\n" +
           "## The habit worth noticing\n" +
           "Every learned result on this page is reported next to a hand-written method that was measured first. The cube-pose project refits its OpenCV baseline until it is genuinely competitive before claiming the CNN wins. The PPO project reports that its learned policy has a smaller basin of attraction than the LQR controller it is compared to. That is unusual, and it is deliberate.\n\n" +
           "## Where he is going\n" +
           "Physical AI: sim-to-real transfer, legged locomotion, and perception in unstructured environments. The robot-learning track exists to build exactly that, one measured block at a time.",
        next: ['What is his experience?', 'What is he aiming for?', 'What is his stack?', 'Explain each project'],
    },
    {
        id: 'experience',
        label: 'Experience',
        ask: 'What is his experience?',
        k: ['experience', 'exp', 'years', 'career', 'worked', 'work history', 'job', 'jobs', 'role', 'roles', 'seniority', 'senior', 'junior', 'employment', 'history', 'professional'],
        a: "Early-career robotics software engineer, working professionally on ROS2 systems — autonomous mobile robots, perception, and deployment onto real hardware.\n\n" +
           "Alongside that, a self-directed robot-learning track: four current projects (a biped balance policy, a C++ simulation backend, arm manipulation by RL, imitation and language, and an INT8 detector) built on four earlier ones, all trained and measured on CPU only. None of them are tutorial follow-alongs — each exists to answer one question with a number.\n\n" +
           "Day to day that means ROS2 in C++ and Python on Linux, PyTorch for the models, MuJoCo and Gazebo for simulation.\n\n" +
           "For dates, employers and role specifics, email him: " + EMAIL,
        deep: "## Level\n" +
           "Early career, and honest about it. What he has is depth in a narrow band rather than a long list of years.\n\n" +
           "## What the day job looks like\n" +
           "ROS2 systems work: autonomous mobile robots, perception pipelines, and getting software onto physical machines. C++ and Python on Linux, with Nav2, SLAM, PCL and MoveIt2 as the working toolset.\n\n" +
           "## What the projects prove\n" +
           "- Microduck Balance and Push Recovery — a PPO policy for a 14-servo biped, with the reward rebuilt from measurement and a PD baseline it has to beat\n" +
           "- Threaded C++ MuJoCo Backend, Bit-Identical — the same environment in C++17 on threads, 6,275 of 6,275 observations identical to the Python one, about 2x its throughput at 8 workers\n" +
           "- SO-ARM100 Manipulation with RL, Imitation and Language — one bench, three ways of learning the same arm tasks, one evaluation protocol\n" +
           "- Tabletop Clutter Detector, INT8 on One Thread — an anchor-free detector, COCO mAP implemented from scratch, then quantised and pruned for a one-thread latency budget\n" +
           "Earlier: PPO vs LQR on Cart-Pole, Cube Pose Regression CNN, MoveIt2 Pick & Place Demo, Fleet Monitoring System.\n\n" +
           "Together they cover model, policy, simulation backend, and the infrastructure around them.\n\n" +
           "## The constraint worth knowing about\n" +
           "There is no GPU in any of this. The whole robot-learning track was designed around an 8-thread CPU budget, which is why the projects lead with feasibility measurements and small architectures rather than with scale.\n\n" +
           "## What is not on this page\n" +
           "Employers, dates, and specific role scope. Email " + EMAIL + " for the CV.",
        next: ['Explain each project in detail', 'What is his strongest project?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'goal',
        label: 'Career direction',
        ask: 'What is he aiming for?',
        k: ['goal', 'goals', 'focus', 'future', 'direction', '!physical ai', 'aiming', 'aim', 'next', 'looking for', 'interested', 'ambition', 'want'],
        a: "The target is Physical AI Engineer — shipping learned behaviour onto real machines rather than into a notebook.\n\n" +
           "Concretely: sim-to-real transfer, legged locomotion, and perception that holds up outside a staged scene. The robot-learning track on this page is the deliberate route there, built block by block with a measurement closing each one.\n\n" +
           "The ROS2 side is not being abandoned — it is the deployment layer that makes a learned policy useful on an actual robot.",
        deep: "## Now\n" +
           "Two tracks, run in parallel:\n" +
           "- Robot learning on CPU — a biped balance policy, arm manipulation by RL, imitation and language, a detector quantised to INT8, and a C++ simulation backend proven bit-identical to its Python reference\n" +
           "- ROS2 systems — MoveIt2 manipulation, Nav2, perception, and the infrastructure around a fleet, from the day job and the earlier projects\n\n" +
           "## Next\n" +
           "Physical AI — getting learned behaviour to run on real machines. Three pieces:\n" +
           "- Sim-to-real transfer: closing the gap between a policy that works in simulation and one that survives hardware. Domain randomisation, system identification, and residual policies are the method, not the buzzwords\n" +
           "- Legged locomotion: Microduck Balance and Push Recovery is the first concrete step — a 25 cm biped, an observation made only of what its sensors report, a reward rebuilt from measurement, and PPO against a measured PD baseline\n" +
           "- Perception in unstructured environments, where the scene is not staged and the data is not clean\n\n" +
           "## Why the portfolio looks the way it does\n" +
           "Each block closes on a number. The augmentation ablation in the detection project exists because \"we added augmentation\" is not a result; +0.0007 mAP is. That habit is the whole point — sim-to-real is decided by measurements, not by descriptions.",
        next: ['What is his stack?', 'What about sim-to-real transfer?', 'Tell me about the Microduck balance project', 'How do I contact him?'],
    },
    {
        id: 'languages',
        label: 'C++ or Python?',
        ask: 'C++ or Python — which does he use?',
        k: ['language', 'languages', '!python', 'coding', 'programming', 'code', 'linux', 'os', '!which language'],
        a: "Both, and the split is deliberate.\n\n" +
           "C++17 is the default for anything that runs per step or per frame: the threaded MuJoCo backend, built with CMake and bound to Python through pybind11, and the reachability validator in the MoveIt2 project, which is C++ so it cannot block the Python state machine above it.\n\n" +
           "Python is for the learning work: PyTorch models, MuJoCo environments, training loops, evaluation. The training code in every project is Python; the C++ backend runs that Python training script unchanged.\n\n" +
           "Rule of thumb: real-time and edge code in C++, research and orchestration in Python.",
        deep: "## The split\n" +
           "- C++ — production nodes, real-time paths, anything performance-critical or destined for an edge device\n" +
           "- Python — model training, simulation, evaluation, orchestration\n" +
           "- Linux throughout; ROS2 as the runtime for the systems side\n\n" +
           "## Where that shows in the projects\n" +
           "- MoveIt2 Pick & Place Demo — mixed. The workspace validator that filters unreachable targets is C++ because it runs on every detection; the finite state machine that sequences grasps is Python because the value there is orchestration, not throughput\n" +
           "- Threaded C++ MuJoCo Backend — C++17, CMake, pybind11. One model per environment, N environments on T threads, tested under AddressSanitizer, UndefinedBehaviorSanitizer and ThreadSanitizer in CI. Written to be the same environment to the bit, then measured at about 2x the Python processes\n" +
           "- Microduck Balance and Push Recovery, SO-ARM100 Manipulation, Tabletop Clutter Detector, and the earlier PPO vs LQR and Cube Pose projects — Python with PyTorch, NumPy and MuJoCo\n" +
           "- Fleet Monitoring System — Python. Glue between ROS2, Kafka and QuestDB, where iteration speed beats microseconds\n\n" +
           "## The deployment answer\n" +
           "Training in Python does not mean serving in Python. The learned projects export to ONNX and re-measure the full task metric through ONNX Runtime, which is the step that lets a C++ node run the same weights on a robot. In the detection project that export turned a 3.87 ms eager forward pass into 1.20 ms end to end, and step 6 takes the same graph to INT8 for a one-thread budget.\n\n" +
           "## Beyond the two\n" +
           "PyTorch and ONNX Runtime for models, OpenCV and PCL for vision and point clouds, CMake for the C++ build, Docker for packaging. Every current repository ships a Dockerfile and a GitHub Actions workflow that runs its tests.",
        next: ['What is his stack?', 'Does he do machine learning?', 'How does he deploy and package his work?', 'What is his experience?'],
    },
    {
        id: 'stack',
        label: 'Full technical stack',
        ask: 'What is his full technical stack?',
        k: ['stack', 'skill', 'skills', 'tech', 'technology', 'technologies', 'tools', 'toolset', 'know', 'knows', 'good at', 'expertise', 'competencies', 'capable'],
        a: "## Core\n" +
           "ROS2 (Humble) · C++17 · Python · Linux · Docker · CMake\n" +
           "## Robot Learning\n" +
           "PPO · Imitation learning · Language-conditioned policies · Domain randomisation · System identification · Sim-to-real transfer\n" +
           "## ML / DL\n" +
           "PyTorch · CNN · Object detection · INT8 quantisation · ONNX Runtime\n" +
           "## Perception\n" +
           "LiDAR · IMU · Sensor fusion · OpenCV · PCL\n" +
           "## Navigation & Manipulation\n" +
           "Nav2 · SLAM · MoveIt2 · OMPL\n" +
           "## Simulation\n" +
           "MuJoCo · Gazebo · RViz\n" +
           "## Navigation\n" +
           "Nav2 · SLAM · AMCL · Cartographer\n" +
           "## Control\n" +
           "LQR · PID controllers · State machines · Path planning\n\n" +
           "The through-line is the whole loop — sensor in, model, policy, planner, motion out — plus the infrastructure to run it: Docker, Kafka, time-series storage.",
        deep: "## Core\n" +
           "ROS2 (Humble), C++17, Python, Linux, CMake. ROS2 is the runtime for the systems side; the learning code is Python until it is exported, and the one C++ project is a simulation backend that the Python training script runs on unchanged.\n" +
           "## Robot Learning\n" +
           "PPO implemented from scratch — advantage estimation, ratio clipping and normalisation each ablated rather than assumed, then reused for the biped and for the arm with a reach-push-lift curriculum. Imitation learning on the arm: behaviour cloning, DAgger with a shadow expert, and an ACT-style action-chunking policy, with a dataset-size scaling curve. A language-conditioned multitask policy scored on held-out paraphrases and on task-colour pairs never seen together. Reward design as an explicit artefact: the Microduck project measures each reward term's contribution against a hand-written controller before training starts, and rebuilt the reward when three of four penalties turned out to be inert. Domain randomisation with ranges taken from measured servo fits, and held-out physics that sits outside those ranges, are the sim-to-real method.\n" +
           "## ML / DL\n" +
           "PyTorch throughout. CNNs for object detection and keypoints, with architecture treated as a decision to justify: a spatial soft-argmax head beat a generic flatten head at a fifth of the parameters. ONNX Runtime for export, verified by recomputing the whole task metric through it, not by checking that a file exists. Static INT8 quantisation in QDQ form with per-channel weights and calibration on the training split, structured channel pruning with a short fine-tune, and a one-thread mAP-versus-latency curve.\n" +
           "## Simulation\n" +
           "MuJoCo for the learning work — scene generation, segmentation-buffer labels, and physics for control. Gazebo for the ROS2 side. RViz for visualising what a pipeline actually produced. Synthetic data generation is a first-class part of every learned project, because the label comes out of the renderer rather than out of a human.\n" +
           "## Perception\n" +
           "LiDAR, IMU and camera, fused. OpenCV for image work — used both as a tool and as the baseline the learned models have to beat. PCL for point clouds.\n" +
           "## Manipulation\n" +
           "MoveIt2 for motion planning and execution, OMPL as the sampling planner, trajectory planning and motion control on a 7-DOF arm including post-planning retiming for velocity scaling.\n" +
           "## Navigation\n" +
           "Nav2, SLAM, AMCL and Cartographer — the professional side of the work rather than the portfolio side.\n" +
           "## Control\n" +
           "LQR solved by iterating the Riccati recursion by hand in the earlier cart-pole project, PD and PID controllers measured as baselines, state machines, and path planning. The state-machine part is underrated: reliable robot behaviour is mostly a well-designed FSM with real recovery states.\n" +
           "## Infrastructure\n" +
           "Docker, GitHub Actions CI on every current repository, Kafka, QuestDB, ONNX Runtime. Enough to stand up a fleet and to ship a model, not only to train one.",
        next: ['Explain each project in detail', 'Does he do machine learning?', 'What about sim-to-real transfer?', 'C++ or Python?'],
    },
    {
        id: 'detection',
        label: 'Tabletop Clutter Detector, INT8 on One Thread',
        ask: 'Tell me about the clutter detection project',
        k: ['!clutter', '!detector', '!detection', '!object detection', '!map', '!coco', '!anchor-free', '!anchor free', '!centernet', '!heatmap', '!bounding box', '!occlusion', '!segmentation', '!augmentation', '!ablation', '!int8', '!quantisation', '!quantization', '!quantised', '!quantized', '!pruning', '!prune', '!edge ai', '!edge-ai', '!one thread', '!single thread'],
        a: "## Tabletop Clutter Detector, INT8 on One Thread — Python, PyTorch, MuJoCo, ONNX Runtime\n" +
           "An anchor-free detector for three to six objects on a table, where they overlap and hide one another, then taken down to INT8 for a one-thread CPU budget.\n\n" +
           "- Every box is read straight out of the renderer's segmentation buffer, so no label is hand-drawn and every box is already correct under perspective and occlusion\n" +
           "- mAP@[.5:.95] of 0.911 against a fitted classical pipeline's 0.532, with COCO mAP implemented from scratch and unit-tested rather than imported\n" +
           "- 1.20 ms per image through ONNX Runtime on 8 CPU threads, but 3.69 ms on one thread against the classical pipeline's 2.13 ms, which is the budget a ROS2 node usually gets\n" +
           "- Step 6 attacks that one-thread number with static INT8 quantisation and structured channel pruning, scored by the same mAP on the same images. Static INT8 (minmax calibration on 200 training images) runs the detector in 1.38 ms on one thread, 2.6x faster than fp32's 3.57 ms and under the classical pipeline's 2.13 ms, at mAP 0.9097 against fp32's 0.9107 (-0.0010); structured pruning was the wrong tool here: removing half the channels cost 0.065 mAP for 2.42 ms, and pruned-plus-INT8 at 1.25 ms buys under 10% over INT8 alone at that price, so static INT8 alone is what would ship.\n\n" +
           "The part worth noticing: an ablation found that photometric augmentation on top of the simulator's own randomisation buys +0.0007 mAP. That is nothing, and it is reported as nothing.\n\n" +
           "Repository: https://github.com/AungKaung1928/mujoco-clutter-detect",
        deep: "## Tabletop Clutter Detector, INT8 on One Thread — Python, PyTorch, MuJoCo, ONNX Runtime\n" +
           "Multi-object detection on a simulated tabletop: three classes, three to six objects per scene, a tilted camera, and a deployment budget of one CPU thread.\n" +
           "## Why the camera is tilted\n" +
           "A top-down view makes detection degenerate — objects resting on a flat table cannot overlap in that image, so there is no occlusion, no perspective and no depth-dependent scale. Moving the camera to 39 degrees of elevation is what makes the task a detection task at all.\n" +
           "## Why the labels are exact\n" +
           "Each scene is rendered twice: once for RGB, once with segmentation rendering on. The second pass returns which object won each pixel, so a tight box around an instance mask is already correct for a rotated box, already correct under perspective, and already correct about what is hidden behind what. This is the concrete argument for doing robot learning in simulation — the label is read out of the renderer instead of drawn by a person.\n" +
           "## The metric was built before the model\n" +
           "COCO mAP@[.5:.95] is implemented from scratch and tested against known inputs before any detector exists. A shift table makes the reason visible: a uniform 4-pixel error leaves AP50 untouched at 1.000 while mAP has already fallen by half. AP50 alone cannot see localisation, which is exactly what a robot needs it to see.\n" +
           "## Results\n" +
           "- Classical baseline, fitted rather than strawmanned: mAP 0.532\n" +
           "- Learned detector, 380,631 parameters, 215.0 M multiply-accumulates, 25 epochs, 34 minutes on 8 CPU threads: mAP 0.911\n" +
           "- AP75 0.9896 against AP50 0.9899 — a gap of 0.0003, meaning localisation is essentially exact. The classical method lost 0.134 between the same two thresholds\n" +
           "- Small objects still cost: 0.805 mAP on the smallest size tercile against 0.884 on the largest\n" +
           "## The ablation that returned nothing\n" +
           "Photometric augmentation applied on top of the simulator's own appearance randomisation buys +0.0007 mAP. The two are not symmetric — randomising at render time changes geometry and lighting, augmentation only changes pixels — and the result is recorded as a null because that is what it is.\n" +
           "## Deployment, and the number that was still wrong\n" +
           "Exported to ONNX and re-scored end to end through ONNX Runtime: identical mAP, 1.20 ms per image on 8 threads against 3.87 ms in eager PyTorch. On one thread, though, the detector takes 3.69 ms against the classical pipeline's 2.13 ms. One thread is the budget a perception node is most likely to be given on a robot, so the detector was still the slower option where it mattered.\n" +
           "## Step 6 — INT8 and pruning\n" +
           "Two tools shrink CPU latency without touching the architecture: fewer bits per multiply and fewer multiplies.\n" +
           "- Static INT8 through ONNX Runtime, in QDQ form (standard Quantize and Dequantize nodes the runtime fuses into integer convolutions), unsigned 8-bit activations and signed per-channel weights. Activation scales are fixed once from a calibration pass on 200 training images, never on the validation split the graph is scored on. Three calibration methods are compared: MinMax, Percentile 99.99 and Entropy. A dynamic-quantisation row exists only to show why it is the wrong tool for a CNN\n" +
           "- Structured channel pruning at 25% and 50%, ranked by batch-norm scale, then a 3-epoch fine-tune with the same losses as training. Whole channels are removed so the convolutions actually get smaller; zeroing individual weights would leave every kernel the same cost\n" +
           "- Every variant goes through the same predictor and the same mAP code as the fp32 graph, and the numbers that matter are the mAP drop, the per-class drop, and the recall on objects under 50% visible, which quantisation noise takes first\n" +
           "- The result is one figure: model latency at one thread against mAP, every graph a labelled point, the classical pipeline's 2.13 ms as a dashed line\n" +
           "Static INT8 (minmax calibration on 200 training images) runs the detector in 1.38 ms on one thread, 2.6x faster than fp32's 3.57 ms and under the classical pipeline's 2.13 ms, at mAP 0.9097 against fp32's 0.9107 (-0.0010); structured pruning was the wrong tool here: removing half the channels cost 0.065 mAP for 2.42 ms, and pruned-plus-INT8 at 1.25 ms buys under 10% over INT8 alone at that price, so static INT8 alone is what would ship.\n" +
           "A one-thread x86 latency is not a Jetson latency; the ordering of the graphs is expected to carry to an ARM core with TensorRT, the ratios are not, and the page says so.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/mujoco-clutter-detect",
        next: ['Tell me about the C++ MuJoCo backend', 'Does he do machine learning?', 'What numbers can he back up?', 'Explain each project in detail'],
    },
    {
        id: 'rl',
        label: 'PPO vs LQR on Cart-Pole',
        ask: 'Tell me about the PPO project',
        k: ['!ppo', '!rl', '!reinforcement learning', '!policy gradient', '!lqr', '!riccati', '!cart-pole', '!cartpole', '!gae', '!advantage', '!seeds', '!permutation test', '!from scratch', '!optimal control'],
        a: "## PPO vs LQR on Cart-Pole — Python, PyTorch, NumPy, MuJoCo\n" +
           "Earlier work, and the engine under two current projects: the PPO loop written here is the one that trains the Microduck biped and the SO-ARM100 arm.\n\n" +
           "The same problem solved twice: once with an optimal controller derived from the physics, once with PPO written from first principles.\n\n" +
           "- No gymnasium, no stable-baselines3, no cleanrl copy-paste, no scipy — the discrete Riccati equation is solved by iterating the recursion, because understanding the recursion is the point\n" +
           "- 16 seeds reported as median and interquartile range, plus ablations on GAE, advantage normalisation and ratio clipping, each judged by a two-sided permutation test\n" +
           "- LQR reaches threshold at zero sample cost; PPO needs a median 62,144 environment steps and ends with a smaller basin of attraction\n\n" +
           "The question the repository answers is not whether PPO can balance a pole. It is what the learned policy buys over a controller you can solve for, and what it costs — including the axes where it loses.\n\n" +
           "Repository: https://github.com/AungKaung1928/ppo-from-scratch",
        deep: "## PPO vs LQR on Cart-Pole — Python, PyTorch, NumPy, MuJoCo\n" +
           "A hand-written environment, an optimal controller that costs zero samples, and PPO implemented from scratch.\n" +
           "## Why the environment is hand-written\n" +
           "PPO fails to learn several times before a seed study is finished, and every time it does the first question is: algorithm or environment. That question is only cheap to answer if the environment was verified before any RL existed. This one was — 13 checks against the published 1983 dynamics, including the half-length convention that is the most common bug in a hand-written cart-pole.\n" +
           "## The baseline costs nothing\n" +
           "Linearise, iterate the discrete Riccati recursion, project the continuous control onto the two available forces. The result balances the pole indefinitely having consumed zero environment steps. Any honest comparison starts from there, not from a random policy.\n" +
           "## The seed study\n" +
           "16 seeds, median and IQR, never a single reward curve. Steps-to-threshold median 62,144, IQR [60,442, 63,448]. Re-running the 16 seeds returned the identical median. Runs that never reach threshold are entered as budget plus one rather than dropped, because dropping them is the standard way to make a bad configuration look good.\n" +
           "## The ablations\n" +
           "GAE, advantage normalisation and ratio clipping, 16 seeds each, one switch changed at a time, with a two-sided permutation test on the difference of medians. Advantage normalisation turns out to matter most — half the seeds never reach threshold without it. The study was run at 8 seeds first and two of the three conclusions changed at 16, which is reported rather than quietly overwritten.\n" +
           "## Where the learned policy loses\n" +
           "On a widened initial-condition sweep, PPO's basin of attraction is roughly half the LQR's on angular rate and a third on cart velocity. The median seed is well behind the closed-form controller on robustness. That is the honest answer to \"is RL better here\", and it is on the page.\n" +
           "## Hyperparameters\n" +
           "Searched on seeds 100 to 103, disjoint from the reported seeds 0 to 15. Tuning on the seeds you then report is the most common quiet mistake in an RL repository.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/ppo-from-scratch",
        next: ['Tell me about the Microduck balance project', 'Tell me about the SO-ARM100 projects', 'What numbers can he back up?', 'Explain each project in detail'],
    },
    {
        id: 'duck',
        label: 'Microduck Balance and Push Recovery',
        ask: 'Tell me about the Microduck balance project',
        k: ['!microduck', '!duck', '!biped', '!bipedal', '!walking', '!walk', '!locomotion', '!gait', '!legged', '!servo', '!servos', '!balance', '!push recovery', '!recover', '!observation contract', '!cpu only', '!no gpu', '!reward'],
        a: "## Microduck Balance and Push Recovery — Python, MuJoCo, PyTorch, ONNX\n" +
           "A balance-and-recover policy for a 25 cm, 737 g open-source biped with 14 position-controlled servos, trained with PPO in MuJoCo on a laptop with no GPU anywhere in the stack.\n\n" +
           "- The observation is 48 numbers and every one of them is something the real robot's sensors report: joint angles, joint speeds, the last commanded action, the gyro, and gravity in the body frame. The 13 quantities only a simulator knows were dropped on purpose\n" +
           "- The reward was rebuilt from measurement. Three of the four penalties in the first version were each under 0.25% of the return, so two were dropped and the joint-velocity weight was set from its measured share; a height term that was flat everywhere the fallen robot actually lies became a linear ramp\n" +
           "- The PD hold-pose controller that ships with the robot scores 175.2 ± 3.1 of a 500 ceiling under that reward (108.7 ± 2.9 under the old one), over 20 seeds with random pushes. That is the number the learned policy has to beat\n" +
           "- After the first 25M-step chunk, PPO scores 332.6 ± 5.1 of 500 against the PD controller's 175.8 ± 0.2 under the same reward and keeps the trunk above the fall height for 74% of steps (PD 47%), 100 episodes x 5 seeds. The push column reads 100% against 88%, but with a 0.00 s time to recover it measures push resistance, not standing back up. The second 25M chunk is the next run, with a smaller step size: the clip fraction reached 0.73 and the return stopped improving after about 8M steps.\n\n" +
           "- Domain randomisation, measured on two held-out physics models, made the policy worse: it learned to brace in a crouch, upright 28% of steps against 47%, robust to backlash but collapsed on rollers (147 against 374). Reported as it came out\n\n" +
           "Also measured, and kept on the page: the training budget was set from 13,300 environment steps per second, and the real training loop runs at about 3,300, because the round trip to eight worker processes and the policy's forward pass were never in the composition. Fifth revision of that one number, and the first measured on the actual workload.\n\n" +
           "Repository: https://github.com/AungKaung1928/microduck-rl",
        deep: "## Microduck Balance and Push Recovery — Python, MuJoCo, PyTorch, ONNX\n" +
           "Robot learning for a biped on a laptop with no GPU: stand, get pushed, recover, with every step measured before the next one was allowed to start.\n" +
           "## The robot and the task\n" +
           "The Microduck is an open-source 25 cm biped with 14 hobby servos. It is simulated in MuJoCo at 500 Hz physics with a 50 Hz control loop, using the model variant whose whole body can touch the floor, because a robot that has to get up from a fall needs a floor to lie on. Episodes are a fixed 5 seconds with three pushes at seeded times and random strength; there is no early termination, because ending the episode when the robot falls would make recovery unlearnable by construction.\n" +
           "## The observation is what the hardware knows\n" +
           "48 dimensions: 14 joint positions, 14 joint velocities, the 14 previous actions, 3 gyro rates and 3 components of gravity in the body frame. Step 1 had planned 61. The 13 that were dropped — linear velocity from a velocimeter the robot does not have, world position, the full orientation quaternion whose yaw is unobservable without a magnetometer, and a subtree angular momentum the simulator computes — are things a policy could learn to depend on and then have nothing to run on. A test rebuilds the observation from the five declared sensor sources and asserts a bit-for-bit match, which is the only way to prove nothing simulator-only leaked in.\n" +
           "## The reward was measured before anything optimised against it\n" +
           "A script runs the shipped PD controller and random actions over 20 seeds and prints what each reward term actually contributes. Three of four penalties were dead: under 0.25% of the return under both policies. The height term, a 3 cm Gaussian around standing height, was worth about a thousandth at floor level, so it gave a fallen robot no gradient to climb. The rewritten reward keeps the upright term unchanged (the fallen trunk never tilts past 90 degrees, measured over 1,248 fallen steps, so flooring it costs nothing), replaces the Gaussian with a linear ramp that pays 8.3 per metre everywhere below standing height, drops the two inert penalties, and sets the joint-velocity weight so that it is about 5% of the return under random actions: measured share 5.24%. The old reward stays selectable so the old baseline stays reproducible.\n" +
           "## The baseline\n" +
           "The shipped PD controller commanded to hold the standing pose: 175.2 ± 3.1 of 500 under the new reward, 54% of each episode spent on the floor, tilting after 0.65 s and reaching the ground at 2.28 s. Under the old reward the same trajectories scored 108.7 ± 2.9. Both come from a script in the repository, because the first version of that number came from one that was not kept.\n" +
           "## The training loop\n" +
           "PPO from the earlier cart-pole project, extended with four things this task demands: eight environments in forked processes, a running observation normaliser (the observation groups differ in scale by 13x and a fixed constant guessed wrong), a truncation bootstrap that uses the value of the last observation when an episode hits its step limit rather than zeroing it, and checkpointed chunks so no run needs the machine for more than about two hours. The normaliser is part of the policy: it is saved with it and folded into the ONNX graph at export.\n" +
           "## Result\n" +
           "After the first 25M-step chunk, PPO scores 332.6 ± 5.1 of 500 against the PD controller's 175.8 ± 0.2 under the same reward and keeps the trunk above the fall height for 74% of steps (PD 47%), 100 episodes x 5 seeds. The push column reads 100% against 88%, but with a 0.00 s time to recover it measures push resistance, not standing back up. The second 25M chunk is the next run, with a smaller step size: the clip fraction reached 0.73 and the return stopped improving after about 8M steps.\n" +
           "## The throughput number, revised for the fifth time\n" +
           "The feasibility gate measured bare physics at 28,749 steps per second in a 20-second burst, then 18,400 sustained, then 8,000 after a derate that turned out to be counted twice, then 13,300 from a sustained physics rate times a measured wrapper cost. The training loop itself runs at about 3,300 environment steps per second, because the inter-process round trip and the policy forward pass on every step were never in that composition. The C++ backend project found the same thing from the other side: the Python vector environment delivers about 6,400 steps per second at 8 processes under random actions. Every one of the five figures is on the page with the reason the previous one was wrong.\n" +
           "## Domain randomisation, measured: it made the policy worse\n" +
           "A second policy was trained for the same 25M steps under physics randomised between four measured servo fits, plus mass, friction, latency and noise, and both were evaluated on two held-out model variants neither trained on: backlash joints, and passive rollers at the feet. 100 episodes x 5 seeds per cell. By the height-only survival test the randomised policy looked like a clear win, 1.00 against 0.74. It was not standing: upright only 28% of steps against 47%, trunk at a median 9 cm against 12 cm standing. It had learned to brace in a low crouch. It shrugged off backlash (+3.2 return against the nominal policy's -15.2) and collapsed on rollers (147 against 374), a model the nominal policy actually found easier than its own. Net: on this robot, this reward, one seed and half the schedule, randomisation made things worse, and it is reported that way. The likely cause is a height reward that is blind to tilt; testing that needs a new reward version. Upright share and trunk height were added to the metrics after this was found.\n" +
           "## ONNX export\n" +
           "One graph from the 48-dim observation to the action with the normaliser folded in, verified to 2.4e-06 against PyTorch on 1,000 rollout observations, 0.033 ms p99 on one thread, 0.2% of the 20 ms control period.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/microduck-rl",
        next: ['Tell me about the C++ MuJoCo backend', 'What about sim-to-real transfer?', 'What is he aiming for?', 'What are the gaps in his experience?'],
    },
    {
        id: 'cpp',
        label: 'Threaded C++ MuJoCo Backend, Bit-Identical',
        ask: 'Tell me about the C++ MuJoCo backend',
        k: ['!c++', '!cpp', '!c++17', '!bit-identical', '!bit identical', '!bit-exact', '!thread', '!threads', '!threaded', '!multithreading', '!pybind', '!pybind11', '!cmake', '!sanitizer', '!sanitizers', '!asan', '!tsan', '!vector environment', '!vector env', '!backend', '!vecenv', '!numpy'],
        a: "## Threaded C++ MuJoCo Backend, Bit-Identical — C++17, MuJoCo, pybind11, CMake\n" +
           "The Microduck environment rewritten in C++17, running eight environments on eight threads of one process instead of eight forked Python processes, with a binding that lets the Python training script run on it unchanged.\n\n" +
           "- The claim comes first and it is not speed: over 25 episodes, 6,275 of 6,275 observations come out bit-identical to the Python environment, with identical rewards and flags. A faster environment that is even slightly different trains a different policy\n" +
           "- Getting there meant matching numpy's pairwise summation tree, Python's power operator (which is the C library's pow, not x times x), a float32 constant promoted to float64, and a second MuJoCo forward pass that is not a no-op because the solver warm-starts\n" +
           "- Measured after that: about 2x the Python processes at 8 workers (12,327 against 6,385 environment steps per second, alternated in the same run), 27,011 bare physics steps per second at 8 threads, and the same power-management dip over six minutes that the Python version shows\n" +
           "- Tested on every commit under AddressSanitizer, UndefinedBehaviorSanitizer and ThreadSanitizer\n\n" +
           "Repository: https://github.com/AungKaung1928/mujoco-vecenv-cpp",
        deep: "## Threaded C++ MuJoCo Backend, Bit-Identical — C++17, MuJoCo, pybind11, CMake\n" +
           "A vector environment is the object that steps N copies of a simulated robot together so a policy sees a batch of observations per step. Python can only run one thread of its own code at a time, so the Microduck project's vector environment forks eight processes and talks to them through pipes. This repository is the same environment in C++17 on threads.\n" +
           "## The one claim\n" +
           "Given the same starting state and the same actions, the C++ environment returns the same 48 floating-point observations, the same reward and the same flags as the Python one, with no tolerance. The test lets the Python environment draw its randomness (initial noise, push schedule, randomised physics), hands the drawn values to the C++ side, feeds both 250 identical actions and compares everything that comes back. 25 episodes covering both reward versions, action latency, initial noise, two held-out model variants and two randomised-physics cases: 6,275 of 6,275 observations identical, zero reward or flag differences. CI runs it against a pinned commit of the Python repository.\n" +
           "## Three arithmetic details that decided it\n" +
           "- numpy's mean over 14 joints is not a left-to-right sum. It keeps eight partial sums and combines them as a tree. Measured on 20,000 random vectors: a sequential loop matched on 15,831, the tree from an identity start matched on 20,000 of 20,000\n" +
           "- Python's x ** 2 is the C library's pow(x, 2.0), which disagrees with x * x in 1,621 of 2,000,000 random doubles. The compiler folds pow(x, 2) back into a multiply unless stopped, so the exponent is routed through a volatile\n" +
           "- The observation scale table is float32 in Python and the product with a float64 raw value uses the widened float32: 0.05 becomes 0.05000000074505806\n" +
           "Plus one that is not arithmetic: the Python reset runs MuJoCo's forward pass a second time only when initial noise is applied, and a repeated forward pass on an unchanged state is not a no-op because the constraint solver warm-starts. The C++ reset runs it under exactly the same condition. The build also turns off fused multiply-add, which rounds once where numpy rounds twice.\n" +
           "## Design\n" +
           "One MuJoCo model copy per environment, because domain randomisation writes into the model and a shared one would make it a data race. Environment i always runs on thread i mod T, so the result does not depend on the thread count, and a test checks 1, 2 and 4 threads agree with each other and with sequential stepping. Workers spin on a generation counter for tens of microseconds and then block, so an idle environment burns nothing. Autoreset carries the ended episode's last observation across, because every episode end here is a truncation and the value bootstrap needs it. More than 8 threads is refused unless asked for, because every Microduck number was measured inside that budget.\n" +
           "## Sanitizers\n" +
           "CI rebuilds the suite under AddressSanitizer with UndefinedBehaviorSanitizer, and again under ThreadSanitizer. Both needed a workaround for MuJoCo's prebuilt library: a header MuJoCo includes for its own sanitizer builds does not compile in C++, so every file includes MuJoCo through a wrapper; and MuJoCo's XML compiler runs its own thread pool inside the uninstrumented library, which ThreadSanitizer reports as a race it cannot see into, so reports from inside that library are suppressed and nothing else.\n" +
           "## Measured throughput\n" +
           "- Full environment sweep: 5,639 environment steps per second on one thread, 20,287 on eight (45% efficiency). The Python processes reached 42% on the same model, so process isolation was not the loss; whatever caps this machine at 8 workers caps threads the same way\n" +
           "- Bare physics sweep: 27,011 steps per second at 8 threads, reproduced within 1% by a sweep three minutes earlier. The benchmark's own guard flagged both as trending because the single-thread reference on this laptop scatters about 5% against a 4% bar; the rows are quoted with that verdict attached\n" +
           "- Sustained, eight threads, eighteen 20-second windows with no pause: peak 20,829, plateau 13,329 to 16,238 over the last six windows, with a dip at window 11 and a climb afterwards. The Python run of the same workload had the same shape, so the dip is the host's power management, not either implementation\n" +
           "- Python processes against C++ threads, alternated in one run: 2,336 vs 4,867 at one worker, 6,385 vs 12,327 at eight, a ratio of 1.9 to 2.0x in both runs. The decision rule written in advance was that under 1.3x the C++ backend would not be worth its build step; it is\n" +
           "- The comparison also showed the Python vector environment delivering about 6,400 steps per second at 8 processes, half of the 13,300 that project had budgeted from bare physics times a wrapper factor. The inter-process round trip was never in that composition\n" +
           "## Not yet done\n" +
           "A training run on the C++ backend, compared to the Python one across seeds. Same seed gives different pushes on the two backends (the C++ seeds its generator differently), so that comparison is statistical, and it has not run yet.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/mujoco-vecenv-cpp",
        next: ['Tell me about the Microduck balance project', 'C++ or Python — which does he use?', 'What numbers can he back up?', 'Explain each project in detail'],
    },
    {
        id: 'arm',
        label: 'SO-ARM100 Manipulation with RL, Imitation and Language',
        ask: 'Tell me about the SO-ARM100 projects',
        k: ['!so-arm100', '!so arm', '!so-arm', '!arm', '!manipulation', '!grasp', '!imitation', '!imitation learning', '!behaviour cloning', '!behavior cloning', '!dagger', '!act', '!action chunking', '!vla', '!language', '!language-conditioned', '!lerobot', '!smolvla', '!curriculum', '!minilm', '!lora', '!bench', '!scripted expert'],
        a: "## SO-ARM100 Manipulation with RL, Imitation and Language — Python, MuJoCo, PyTorch, LeRobot\n" +
           "One MuJoCo bench for the SO-ARM100 arm (a low-cost 5-joint arm with a parallel gripper, the one most open LeRobot data was recorded on) and three policy repositories that learn the same four tasks three different ways.\n\n" +
           "- The bench: reach, push, lift and pick-and-place on three coloured cubes; a scripted inverse-kinematics expert; domain randomisation over mass, friction, servo gain, damping, cube size, action latency and sensor noise; six held-out physics settings that each sit outside the randomised range; one evaluation protocol of 100 episodes times 5 seeds; a recorder that writes LeRobot datasets\n" +
           "- Reinforcement learning: PPO with a reach-to-push-to-lift curriculum, trained with and without randomisation, evaluated on the held-out physics to put a number on the transfer gap\n" +
           "- Imitation: behaviour cloning, DAgger with a shadow expert relabelling the policy's own rollouts, and an action-chunking transformer, with a dataset-size scaling curve from 10 to 200 demonstrations\n" +
           "- Language: a frozen sentence encoder, a keypoint CNN and an action-chunk transformer, scored on sentences it never saw and on task-colour pairs never seen together, with a 450M-parameter open VLA run zero-shot in the same simulator as a reference line\n\n" +
           "Status, stated plainly: all four repositories are code-complete with 122 tests green in CI. The bench reference is measured: at 100 episodes times 5 seeds the scripted expert scores 0.93 on lift and pick-and-place, but 0.73 and 0.72 on the small cube, the one physics setting that breaks it. The policy result tables are still not measured; the training runs are the next step.\n\n" +
           "Repositories: https://github.com/AungKaung1928/so-arm100-sim · https://github.com/AungKaung1928/so-arm100-rl · https://github.com/AungKaung1928/so-arm100-il · https://github.com/AungKaung1928/so-arm100-vla",
        deep: "## SO-ARM100 Manipulation with RL, Imitation and Language — Python, MuJoCo, PyTorch, LeRobot\n" +
           "Four repositories: a shared bench and three ways of learning the same arm, arranged so that their result tables are directly comparable.\n" +
           "## The bench (so-arm100-sim)\n" +
           "- The arm description comes from MuJoCo Menagerie unchanged; a table, three cubes, a target marker and three cameras are added programmatically\n" +
           "- Four tasks: reach (hover over a cube), push (onto the marker), lift (clear of the table), pick-and-place. Observations are a 25-dimensional state or a 15-dimensional proprioceptive vector plus an image; actions are joint deltas or absolute targets at 20 Hz\n" +
           "- A scripted expert solves inverse kinematics to waypoints, rate-limited so its motions are smooth enough to learn from. Two things a first draft got wrong and the tests caught: a parallel jaw closing at yaw θ is the same grasp as θ + 180°, but only one branch may be inside the wrist limit, so both are solved and the winner is held for the episode; and the position servos are plain PD with no gravity compensation, so the arm sags 1 to 2 cm below the pose asked for, and the expert integrates the end-effector error with anti-windup to cancel it\n" +
           "- A defect the tests found before any policy did: the action-latency buffer held one entry too many, so every command reached the servos a step late even at zero latency\n" +
           "- Domain randomisation samples cube mass, friction, servo gain, damping and friction loss, cube size, 0 to 2 steps of latency, and observation noise. Six held-out settings — heavy, slippery, weak, laggy, noisy, small — each sit outside that range in at least one factor, and a test asserts it\n" +
           "- The evaluation protocol is 100 episodes times 5 seeds per cell, with the seed-to-seed spread reported; the recorder writes LeRobot v3 datasets so the imitation and language projects read a standard format\n" +
           "## Route 1 — reinforcement learning (so-arm100-rl)\n" +
           "The PPO loop from the earlier cart-pole project, with a curriculum: reach, then push, then lift, promoting when rolling success over the last 100 episodes reaches 0.8, 0.8 and 0.6. Weights and the observation normaliser carry across the promotion; the learning-rate schedule restarts. The comparison is the same budget spent training lift from scratch. Then two policies, one trained on nominal physics and one under full randomisation, are evaluated on every held-out cell, and the difference in their mean drop is what randomisation is worth on this arm. Checkpoints carry model, optimiser, normaliser, random state and curriculum stage, and a test asserts two updates after a reload equal two without one, bit for bit. ONNX export with the normaliser folded in.\n" +
           "## Route 2 — imitation (so-arm100-il)\n" +
           "Demonstrations from the scripted expert, recorded into LeRobot datasets. Three models on one loss: a state policy, an image policy with a keypoint head reused from the earlier cube-pose project, and an action-chunking transformer that predicts a window of future actions. A scaling curve trains on 10, 25, 50, 100 and 200 demonstrations with 3 seeds each. DAgger runs five iterations in which the policy acts, a shadow copy of the expert relabels what it should have done, and the policy is retrained on the aggregate, against plain behaviour cloning on the same 200 demonstrations. The best image policy is then evaluated on every held-out physics cell, with the expert's own numbers on those cells as the ceiling. An experimental path maps human hand video through a hand-landmark model onto arm poses.\n" +
           "## Route 3 — language (so-arm100-vla)\n" +
           "A frozen small sentence encoder (MiniLM, with a hashing encoder as the ablation), the keypoint CNN, and a transformer that predicts an action chunk conditioned on both. Twelve task-colour pairs; nine are trained, three are held out (lift blue, push red, pick-and-place green). Five sentence templates per task are trained, three are held out. Three splits: seen (the policy executes what it was shown), paraphrase (the instruction is read through the encoder, not matched as a string) and combo (colour and task compose although never seen together). SmolVLA-base is run zero-shot in the same simulator as a reference line; it was trained on a different embodiment and the page says the line is not evidence about SmolVLA. A gate timed one training step of a LoRA adapter on a stand-in of the same size, 0.51 s, and the rule written before measuring said under 5 s means the LoRA experiment proceeds.\n" +
           "## What is measured so far\n" +
           "122 tests (63, 16, 19 and 24) green in CI across the four repositories. The latency off-by-one, found and fixed. One measurement that changed a plan: MiniLM cosine similarities on the instruction templates are dominated by surface words — lift green against lift blue scores 0.82 while a true paraphrase scores 0.59 — so paraphrase generalisation cannot be assumed from the encoder and has to be tested. The LoRA gate at 0.51 s per step. The expert's reference table, 100 episodes times 5 seeds per cell: reach 1.00 everywhere; lift 0.93 nominal, 0.90 heavy, 0.97 weak, 0.73 small; pick-and-place 0.93 nominal, 0.85 heavy, 0.72 small; push 0.73 to 0.79 in every cell, a limit of the scripted push itself. The one-seed development readings had put the small cube at 0.87 and 0.80, which is why they were never the reference. Throughput is 1,954 environment steps per second on one process and 7,302 on eight in 15-second bursts, but 5,361 sustained; the first three sweeps were discarded for drift until a warm-up was added to get past the Windows power plan's low starting clock. The policy result tables are still marked not yet measured, each with the command that produces it.\n" +
           "## Limits\n" +
           "Simulation only, a fixed front camera, three cubes of three colours, templated language without negation or counting, a scripted expert whose style and failure modes the policies inherit. Nothing has run on a physical arm.\n" +
           "## Repositories\n" +
           "https://github.com/AungKaung1928/so-arm100-sim\n" +
           "https://github.com/AungKaung1928/so-arm100-rl\n" +
           "https://github.com/AungKaung1928/so-arm100-il\n" +
           "https://github.com/AungKaung1928/so-arm100-vla",
        next: ['What about sim-to-real transfer?', 'Tell me about the Microduck balance project', 'Does he do machine learning?', 'What are the gaps in his experience?'],
    },
    {
        id: 'pose',
        label: 'Cube Pose Regression CNN',
        ask: 'Tell me about the cube pose project',
        k: ['!cube', '!pose', '!pose estimation', '!pose regression', '!soft-argmax', '!soft argmax', '!keypoint', '!regression', '!baseline', '!classical cv', '!hsv', '!sub-millimetre', '!sub millimeter'],
        a: "## Cube Pose Regression CNN — Python, PyTorch, MuJoCo, OpenCV\n" +
           "Earlier work; its spatial soft-argmax keypoint head is the vision front end of the SO-ARM100 image and language policies.\n\n" +
           "Recovering the planar pose of a cube — x, y and yaw — from a single 128x128 render.\n\n" +
           "- A hand-written OpenCV baseline is measured first, twice, with two different thresholds so that \"classical CV fails\" cannot be blamed on one badly chosen prior\n" +
           "- Calibrating a single scalar on the training split removed a systematic +2.98 mm radial bias and took the baseline from 3.41 mm to 1.91 mm — 53% of the gap to the network, closed for free\n" +
           "- A spatial soft-argmax head reaches 0.59 mm median error with 27k parameters: five times smaller, 2.6 times faster and with a better error tail than a 130k generic head\n\n" +
           "The conclusion is stated against the network's interest: if 1.9 mm is inside tolerance, the CNN is the wrong engineering choice.\n\n" +
           "Repository: https://github.com/AungKaung1928/mujoco-cube-pose-cnn",
        deep: "## Cube Pose Regression CNN — Python, PyTorch, MuJoCo, OpenCV\n" +
           "One question, answered with numbers: when does a learned model beat hand-written geometry, and when does it not.\n" +
           "## The setup\n" +
           "Two dataset regimes. In the easy one the cube colour and lighting are fixed and a colour-threshold baseline should win or tie. In the hard one hue, light position, light intensity and table shade are all randomised, and the baseline should degrade while the network should not.\n" +
           "## The baseline is refitted, not strawmanned\n" +
           "The first classical method reached 3.41 mm median error, and inspection showed the error was dominated by a systematic +2.98 mm radial bias — an overhead camera sees the top face of a cube offset outward from its centre. One scalar, calibrated on the training split so both methods have seen the same labels, removes the bias entirely and brings the baseline to 1.91 mm. That single number closed 53% of the gap to the CNN.\n" +
           "## The architecture prior beat the parameter count\n" +
           "- Generic flatten head: 130k parameters, 1.70 ms, 0.75 mm median\n" +
           "- Spatial soft-argmax keypoint head: 27k parameters, 0.65 ms, 0.59 mm median and a better p95\n" +
           "Five times smaller, 2.6 times faster, and more accurate. The prior is worth more than the capacity here.\n" +
           "## Where the classical method still wins\n" +
           "Median yaw error, 0.19 degrees against the CNN's 0.21. The network wins on the tail — p95 yaw 0.66 against 1.66 degrees — and for a controller the tail is the number that matters. Both are reported.\n" +
           "## A correction kept on the page\n" +
           "An early version of the training script selected the best epoch on the validation split and then reported that split's numbers, which is a small leak. It was found, fixed, the affected run retrained, and the difference measured: 0.48 mm against 0.47 before. The leak cost nothing measurable — which is the point of checking rather than assuming.\n" +
           "## Deployment\n" +
           "Exported to ONNX and proven, not just exported: maximum absolute output difference against PyTorch plus the full task metrics recomputed through ONNX Runtime. 0.23 ms on one thread against 0.65 ms in eager PyTorch on eight.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/mujoco-cube-pose-cnn",
        next: ['Tell me about the clutter detection project', 'Does he do machine learning?', 'What numbers can he back up?', 'Explain each project in detail'],
    },
    {
        id: 'manipulation',
        label: 'MoveIt2 Pick & Place',
        ask: 'Tell me about the MoveIt2 pick and place project',
        k: ['!moveit', '!moveit2', 'manipulator', 'pick', 'place', '!panda', '!franka', '!gripper', '!ompl', 'trajectory', 'dof', 'kinematics', '7-dof', '!reachability', '!validator', '!fsm', '!pick and place', '!pick-and-place'],
        a: "## MoveIt2 Pick & Place Demo — Python, C++, MoveIt2, ROS2, Franka Panda\n" +
           "Earlier work on the ROS2 systems side; its walkthrough is still on the site.\n\n" +
           "A 7-DOF Franka Panda clears seven balls from a table and drops them into a box, fully autonomously.\n\n" +
           "- Nothing is hard-coded. A simulated camera renders the scene, an OpenCV node finds the balls, a C++ validator discards anything the arm cannot reach, and a state machine grasps only what survived that chain\n" +
           "- Cartesian-first execution gives straight-line end-effector motion, with OMPL RRTConnect as the fallback when a straight line is not available\n" +
           "- Action-server verification at startup, post-planning trajectory retiming for velocity scaling, and recovery to a known home state when planning fails\n\n" +
           "Stated on the repository itself: detection is HSV on synthetic frames and positions are recovered by exact pinhole back-projection onto a known table plane. It demonstrates the pipeline architecture, not robustness to real-sensor noise.\n\n" +
           "Repository: https://github.com/AungKaung1928/moveit_pickplace_demo",
        deep: "## MoveIt2 Pick & Place Demo — Python, C++, MoveIt2, ROS2, Franka Panda\n" +
           "A closed perception-to-execution loop on a 7-DOF arm, in simulation.\n" +
           "## The loop\n" +
           "1. A scene manager holds ground truth and publishes it on a latched topic\n" +
           "2. A camera simulator renders synthetic frames from it\n" +
           "3. A vision node finds red balls by HSV threshold and back-projects them onto the known table plane\n" +
           "4. A C++ workspace validator filters the detections down to what the arm can actually reach\n" +
           "5. A Python finite state machine grasps, places, and repeats until nothing is left\n" +
           "The arm picks only what the camera detected and the validator approved. There are no hard-coded grasp poses anywhere in it.\n" +
           "## Why the validator is C++\n" +
           "Reachability filtering runs on every detection and must not block the state machine above it. The orchestration layer stays in Python, where async goal handling and recovery logic are easier to get right.\n" +
           "## Motion decisions worth defending\n" +
           "- Cartesian-first: a straight-line end-effector path over the ball, down to grasp, up and over to the box. OMPL RRTConnect is the fallback only, because a sampling planner produces wrist excursions that look wrong and are hard to certify\n" +
           "- Post-planning retiming: the Humble Cartesian-path service has no velocity-scaling field, so timestamps are stretched after planning instead\n" +
           "- An orientation constraint keeps the gripper pointing down with yaw left free, because a ball is symmetric and locking yaw makes the inverse kinematics needlessly hard\n" +
           "- No attached collision object: it produced a gripper artefact and self-collision failures, so it was removed and the reason recorded\n" +
           "## Failure handling\n" +
           "Action-server verification before anything is commanded, so a missing controller fails loudly at startup rather than silently mid-motion. A dedicated homing state on planning failure returns the arm to a known configuration and the run continues.\n" +
           "## What it does not claim\n" +
           "The repository carries an explicit honest-simulation note: HSV detection on synthetic frames with exact geometric back-projection is not robustness to real-sensor noise. There is no positioning-accuracy figure and no success-rate figure, because neither was measured.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/moveit_pickplace_demo",
        next: ['Explain each project in detail', 'How does he handle failure and recovery?', 'How deep is his ROS2 knowledge?', 'How do I contact him?'],
    },
    {
        id: 'fleet',
        label: 'Fleet Monitoring System',
        ask: 'Tell me about the fleet monitoring project',
        k: ['fleet', '!kafka', '!docker', 'container', 'containerized', 'containerised', '!telemetry', 'database', '!questdb', 'postgres', '!postgresql', 'infra', 'infrastructure', 'monitoring', 'dashboard', 'multi-robot', 'multi robot', '!turtlebot', '!turtlebot3', 'devops', 'time-series', 'time series', 'scale'],
        a: "## Fleet Monitoring System — Python, ROS2, Kafka, Docker\n" +
           "A distributed multi-robot telemetry pipeline: ROS2 topics feed Kafka, Kafka feeds QuestDB as a time-series store.\n\n" +
           "- Simulates production fleet infrastructure with multiple TurtleBot3 robots running at once in Gazebo\n" +
           "- Fully containerised with Docker\n" +
           "- Real-time dashboard reading from QuestDB over the PostgreSQL wire protocol\n\n" +
           "Earlier work, and the infrastructure slot rather than the main line: it shows he can build the layer around the robots, which is a useful secondary skill for a team that has robots and no telemetry.\n\n" +
           "Repository: https://github.com/AungKaung1928/fleet_monitoring_ws",
        deep: "## Fleet Monitoring System — Python, ROS2, Kafka, Docker\n" +
           "The infrastructure a fleet needs, rather than the software on one robot.\n" +
           "## The data path\n" +
           "1. ROS2 topics carry telemetry from multiple robots\n" +
           "2. Kafka takes it as a message broker, decoupling producers from consumers\n" +
           "3. QuestDB stores it as time-series data\n" +
           "4. A real-time dashboard reads from QuestDB over the PostgreSQL wire protocol\n" +
           "## Why a broker at all\n" +
           "ROS2's DDS transport is built for a robot, not for a datacentre. Kafka is the standard answer once telemetry has to leave the robot network, buffer, and be replayed. Choosing it shows he understands where the ROS2 boundary is.\n" +
           "## Simulation scale\n" +
           "Multiple TurtleBot3 robots run simultaneously in Gazebo, so the pipeline is exercised with concurrent producers rather than a single stream.\n" +
           "## Deployment\n" +
           "The whole stack is containerised with Docker — broker, database, dashboard and ROS2 nodes — which makes it reproducible instead of a machine-specific setup.\n" +
           "## How to weigh it\n" +
           "It is deliberately the last project on the page. The main line of work is robot learning and manipulation; this one exists because a robotics team eventually needs someone who can stand up the observability layer, and it is the only project here that proves he can.\n" +
           "## Repository\n" +
           "https://github.com/AungKaung1928/fleet_monitoring_ws",
        next: ['Explain each project in detail', 'How does he deploy and package his work?', 'What is his stack?', 'How do I contact him?'],
    },
    {
        id: 'ml',
        label: 'ML / deep learning',
        ask: 'Does he do machine learning?',
        k: ['ml', '!machine learning', '!deep learning', 'dl', 'neural', '!pytorch', '!cnn', 'ai', 'model', 'models', 'training', 'train', 'inference', 'vision', '!onnx', '!onnx runtime', '!network', '!architecture'],
        a: "Yes — every current project trains or runs a PyTorch model, and every one is measured against a hand-written method that was built first.\n\n" +
           "- Microduck Balance and Push Recovery — PPO for a 14-servo biped against a measured PD baseline of 175.2 ± 3.1\n" +
           "- SO-ARM100 Manipulation — curriculum PPO, behaviour cloning, DAgger, an action-chunking transformer and a language-conditioned policy, all on one bench\n" +
           "- Tabletop Clutter Detector — anchor-free detection, mAP 0.911 against a fitted classical baseline's 0.532, then static INT8 and structured pruning\n" +
           "- Earlier: a cube-pose CNN at 0.59 mm median error from 27k parameters, and PPO written from first principles against LQR over 16 seeds\n\n" +
           "PyTorch throughout, ONNX Runtime for export, MuJoCo for the simulation. No GPU anywhere in the stack — the whole track is designed around an 8-thread CPU budget.\n\n" +
           "What this is not: a research record. There are no publications and no benchmark leaderboard entries, and he does not claim any.",
        deep: "## What is actually here\n" +
           "Learned projects, all public, all reproducible on a CPU:\n" +
           "- Microduck Balance and Push Recovery — PPO with a running normaliser and a truncation bootstrap, a reward rebuilt from measured term shares, a PD baseline of 175.2 ± 3.1 of 500 under that reward\n" +
           "- SO-ARM100 Manipulation — one bench, then curriculum PPO with and without domain randomisation, behaviour cloning, DAgger, an action-chunking transformer with a 10-to-200-demonstration scaling curve, and a language-conditioned policy scored on held-out paraphrases and unseen task-colour pairs. 122 tests green; the result tables are the next step and say so\n" +
           "- Tabletop Clutter Detector — anchor-free detection with a heatmap, size and offset head. 380,631 parameters, mAP@[.5:.95] 0.911 against a fitted classical pipeline's 0.532, 1.20 ms per image through ONNX Runtime at 8 threads, then static INT8 in QDQ form and structured channel pruning for the one-thread budget\n" +
           "- Earlier: Cube Pose Regression CNN — a spatial soft-argmax head, 27k parameters, 0.59 mm median error, beating a 130k generic head at a fifth of the size; and PPO vs LQR on Cart-Pole — PPO from scratch, 16 seeds, three ablations with two-sided permutation tests\n" +
           "## The method that runs through all of them\n" +
           "Build the hand-written method first and measure it. Refit it until it is genuinely competitive. Only then find out whether the learned model is worth its cost — and report the axes where it is not. The cube-pose project closes 53% of the gap to its own CNN by calibrating one scalar in the baseline. The PPO project reports a smaller basin of attraction than the LQR it is compared to. The detection project reports an augmentation ablation that returned +0.0007 mAP.\n" +
           "## The engineering side, not just the model\n" +
           "- ONNX export verified by recomputing the whole task metric through ONNX Runtime, not by checking that a file exists; INT8 graphs go through the same check\n" +
           "- A simulation backend in C++17 proven bit-identical to the Python environment before its speed was measured, because a faster environment that differs trains a different policy\n" +
           "- Metrics implemented from scratch and unit-tested — COCO mAP among them — so a number cannot be wrong in a way the library hides\n" +
           "- Labels generated from the renderer's segmentation buffer rather than annotated\n" +
           "- Hyperparameters searched on seeds disjoint from the seeds that get reported\n" +
           "## The constraint\n" +
           "No CUDA anywhere. Everything runs inside an 8-thread CPU budget, which is why the architectures are small and why every project opens by measuring whether it is feasible at all.\n" +
           "## The honest framing\n" +
           "Applied robot learning with unusually careful measurement, not an ML research record. No publications, no large-scale training, no benchmark leaderboard.",
        next: ['Tell me about the SO-ARM100 projects', 'What about sim-to-real transfer?', 'What numbers can he back up?', 'What are the gaps in his experience?'],
    },
    {
        id: 'control',
        label: 'Control & simulation',
        ask: 'What control and simulation experience does he have?',
        k: ['control', 'controller', '!pid', '!state machine', 'fsm', '!gazebo', '!mujoco', 'simulation', 'simulator', 'sim', '!rviz', 'motion control', '!synthetic data'],
        a: "## Control\n" +
           "PD and PID controllers measured as baselines (the Microduck's shipped PD controller is scored over 20 seeds before any policy trains), LQR derived by iterating the discrete Riccati recursion by hand in the earlier cart-pole project, path planning and state machines. A curriculum and a scripted inverse-kinematics expert on the arm are control engineering too: the expert integrates end-effector error to cancel servo sag before it is allowed to demonstrate anything.\n\n" +
           "## Simulation\n" +
           "MuJoCo for all the learning work: scene generation, segmentation-buffer labels, and physics for control. Gazebo for the ROS2 side. RViz throughout for looking at what a pipeline actually produced.\n\n" +
           "Synthetic data generation is a first-class part of every learned project — the label comes out of the renderer, not out of a person, which is the concrete reason robot learning starts in simulation.",
        next: ['Tell me about the PPO project', 'Does he do machine learning?', 'What about sim-to-real transfer?', 'Explain each project'],
    },
    {
        id: 'navigation',
        label: 'Navigation & SLAM',
        ask: 'What is his navigation and SLAM experience?',
        k: ['navigation', 'navigate', '!nav2', '!slam', '!amcl', '!cartographer', '!localization', '!localisation', 'mapping', '!costmap', 'path planning', 'planner', 'autonomous mobile'],
        a: "Navigation is professional work rather than portfolio work, and the page is clear about that.\n\n" +
           "Nav2 for the planning and control stack, SLAM for mapping, AMCL for localization against a known map, Cartographer among the mapping tools. That comes from his day job on autonomous mobile robots, not from a project on this page.\n\n" +
           "What is on the page instead: motion planning on a 7-DOF arm with MoveIt2 and OMPL, and path planning as part of the control skill set.\n\n" +
           "For the scope of the navigation work — which robots, which environments, how long — email " + EMAIL,
        deep: "## The stack he uses professionally\n" +
           "- Nav2 — the planning and control stack: global and local planners, behaviour trees, recovery behaviours\n" +
           "- SLAM for building maps, with Cartographer among the tools\n" +
           "- AMCL — particle-filter localization against a known map\n" +
           "- TF2 underneath all of it, because navigation is a frame problem before it is a planning problem\n" +
           "## Why it is not a project on this page\n" +
           "The portfolio was deliberately re-pointed at robot learning and manipulation, which is where he is heading. Navigation is real experience and it is listed as a skill, but there is no navigation project here to check it against — so treat it as a claim to verify in conversation rather than as a demonstrated result.\n" +
           "## What is demonstrated instead\n" +
           "Planning on a 7-DOF arm: OMPL as the sampling planner, Cartesian paths preferred where a straight line exists, constraint-based execution, and trajectory retiming for velocity scaling. Different problem, same underlying discipline.\n" +
           "## What to ask\n" +
           "Which platforms, which environments, and whether the work was simulation or hardware: " + EMAIL,
        next: ['Tell me about the MoveIt2 pick and place project', 'What is his stack?', 'What is his experience?', 'How do I contact him?'],
    },
    {
        id: 'projects',
        label: 'The projects',
        ask: 'Explain each project in detail',
        k: ['project', 'projects', 'portfolio', 'built', 'build', 'repo', 'repos', 'repository', 'github', 'work on', 'works on', 'showcase', 'made', 'demos'],
        weight: 0.9,
        a: "Four current projects, all robot learning on a CPU, and four earlier ones they grew out of.\n\n" +
           "1. Microduck Balance and Push Recovery — MuJoCo, PyTorch. PPO for a 14-servo biped, reward rebuilt from measurement, PD baseline 175.2 ± 3.1 of 500 to beat.\n" +
           "2. Threaded C++ MuJoCo Backend, Bit-Identical — C++17, pybind11. The same environment on threads, 6,275 of 6,275 observations identical to Python, about 2x its throughput at 8 workers.\n" +
           "3. SO-ARM100 Manipulation with RL, Imitation and Language — MuJoCo, PyTorch, LeRobot. One bench, three ways to learn the same arm; code and 122 tests done, bench reference measured, policy tables not yet measured.\n" +
           "4. Tabletop Clutter Detector, INT8 on One Thread — PyTorch, ONNX Runtime. mAP 0.911 against a fitted classical 0.532, then INT8 and pruning for a one-thread budget.\n\n" +
           "Earlier: PPO vs LQR on Cart-Pole (the PPO loop reused above), Cube Pose Regression CNN (the keypoint head reused above), MoveIt2 Pick & Place Demo, Fleet Monitoring System.\n\n" +
           "Ask about any one by name, or say \"explain each project in detail\" for the full breakdown. Every card above links to its repository.",
        deep: "Four current projects and four earlier ones. All of the current work is robot learning, trained and measured on CPU only.\n\n" +
           "## 1 · Microduck Balance and Push Recovery — Python, MuJoCo, PyTorch, ONNX\n" +
           "A balance-and-recover policy for a 25 cm, 14-servo biped with no GPU in the stack.\n" +
           "- 48-dimensional observation made only of what the real sensors report; 13 simulator-only quantities dropped and a test that proves nothing leaked back in\n" +
           "- Reward rebuilt from measured term shares: two inert penalties dropped, a flat height Gaussian replaced by a linear ramp, the joint-velocity weight set so its share is about 5%\n" +
           "- PD hold-pose baseline 175.2 ± 3.1 of 500 under that reward, 108.7 ± 2.9 under the old one\n" +
           "- PPO with a running normaliser, a truncation bootstrap and checkpointed chunks; the loop runs at about 3,300 environment steps per second, the fifth and first directly measured revision of that figure\n" +
           "https://github.com/AungKaung1928/microduck-rl\n\n" +
           "## 2 · Threaded C++ MuJoCo Backend, Bit-Identical — C++17, MuJoCo, pybind11, CMake\n" +
           "The Microduck environment in C++17 on threads, drop-in for the Python training script.\n" +
           "- 6,275 of 6,275 observations bit-identical over 25 episodes, by matching numpy's pairwise sum, libm pow, a float32 constant and MuJoCo's warm-started forward pass\n" +
           "- One model per environment, environment i on thread i mod T, results independent of thread count\n" +
           "- ASan, UBSan and TSan in CI, with a documented workaround for each MuJoCo quirk\n" +
           "- 1.9 to 2.0x the Python processes at 8 workers; 27,011 bare physics steps per second at 8 threads; the same six-minute power-management curve as Python\n" +
           "https://github.com/AungKaung1928/mujoco-vecenv-cpp\n\n" +
           "## 3 · SO-ARM100 Manipulation with RL, Imitation and Language — Python, MuJoCo, PyTorch, LeRobot\n" +
           "One bench, three policy repositories, one evaluation protocol.\n" +
           "- Bench: reach, push, lift, pick-and-place; scripted IK expert; domain randomisation and six held-out physics cells outside it; 100 episodes times 5 seeds; LeRobot dataset recorder\n" +
           "- RL: curriculum PPO, nominal against randomised, evaluated on the held-out cells\n" +
           "- Imitation: behaviour cloning, DAgger, action chunking, a 10-to-200-demonstration scaling curve\n" +
           "- Language: frozen MiniLM plus keypoint CNN plus action-chunk transformer, seen / paraphrase / combo splits, SmolVLA-base zero-shot as a reference line\n" +
           "- 122 tests green in CI; the expert reference is measured (0.93 lift, 0.73 on the small cube), and the policy tables are not yet measured, as the page says\n" +
           "https://github.com/AungKaung1928/so-arm100-rl (and so-arm100-sim, so-arm100-il, so-arm100-vla)\n\n" +
           "## 4 · Tabletop Clutter Detector, INT8 on One Thread — Python, PyTorch, MuJoCo, ONNX Runtime\n" +
           "Anchor-free detection of three to six overlapping objects on a table, then an edge budget.\n" +
           "- Labels read from the renderer's segmentation buffer; COCO mAP implemented from scratch and unit-tested\n" +
           "- mAP@[.5:.95] 0.911 against a fitted classical pipeline's 0.532; AP75 within 0.0003 of AP50\n" +
           "- 1.20 ms per image at 8 threads, 3.69 ms at one against the classical 2.13 ms; step 6 answers that with static INT8 and structured pruning on a one-thread mAP-versus-latency curve\n" +
           "- An augmentation ablation that returned +0.0007 mAP, reported as the null it is\n" +
           "https://github.com/AungKaung1928/mujoco-clutter-detect\n\n" +
           "## Earlier work\n" +
           "- PPO vs LQR on Cart-Pole — PPO from first principles, 16 seeds, permutation-tested ablations, and a conclusion against the learned method. Its PPO loop trains projects 1 and 3. https://github.com/AungKaung1928/ppo-from-scratch\n" +
           "- Cube Pose Regression CNN — 0.59 mm median error from a 27k-parameter soft-argmax head, against a refitted classical baseline. Its keypoint head is the front end of project 3's image policies. https://github.com/AungKaung1928/mujoco-cube-pose-cnn\n" +
           "- MoveIt2 Pick & Place Demo — a closed camera-to-grasp loop on a 7-DOF Franka Panda with no hard-coded poses. https://github.com/AungKaung1928/moveit_pickplace_demo\n" +
           "- Fleet Monitoring System — ROS2 to Kafka to QuestDB, containerised, several TurtleBot3 in Gazebo. https://github.com/AungKaung1928/fleet_monitoring_ws\n\n" +
           "## Why these four\n" +
           "Legs, simulation infrastructure, hands and eyes: a locomotion policy, the C++ backend under it, arm manipulation by three methods, and a detector taken to an edge budget. Each has a full written walkthrough linked from its card, and so do the four earlier projects.",
        next: ['What is his strongest project?', 'Tell me about the Microduck balance project', 'What numbers can he back up?', 'How do I contact him?'],
    },
    {
        id: 'strongest',
        label: 'Strongest work',
        ask: 'What is his strongest project?',
        k: ['!strongest', 'best', 'favourite', 'favorite', 'impressive', 'highlight', 'proudest', 'standout', 'stand out', '!why hire', '!why him', '!hire him', '!should we hire', '!worth hiring', '!good fit', 'differentiator', 'unique'],
        weight: 1.2,
        a: "Depends what the role needs, and the honest read is this:\n\n" +
           "- Best complete result — Tabletop Clutter Detector, INT8 on One Thread. mAP 0.911 against a fitted classical 0.532, a metric implemented from scratch, a deployment path measured at 8 threads and at one\n" +
           "- Most exacting engineering — Threaded C++ MuJoCo Backend, Bit-Identical. 6,275 of 6,275 observations identical to the Python environment, which took matching numpy's summation order and libm's pow, then a measured 2x\n" +
           "- Closest to where he is heading — Microduck Balance and Push Recovery. A biped, a reward rebuilt from measurement, PPO against a measured baseline\n" +
           "- Widest method coverage — SO-ARM100 Manipulation. RL, imitation and language on one bench with one protocol; the least measured of the four, and it says so\n\n" +
           "The common thread is not any single project: it is that every learned result on this page sits next to a hand-written method that was measured first, and the comparison is reported even when it goes the wrong way.",
        next: ['Explain each project in detail', 'What are the gaps in his experience?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'contact',
        label: 'Contact',
        ask: 'How do I contact him?',
        k: ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'recruit', 'recruiter', '!linkedin', 'cv', '!resume', 'talk', '!get in touch', 'available', 'availability', 'opportunity', 'opportunities', 'interview', 'apply'],
        a: "## Email — fastest route\n" + EMAIL + "\n" +
           "## GitHub\n" +
           "github.com/AungKaung1928 — every project is public\n" +
           "## LinkedIn\n" +
           "Linked in the Contact section above\n\n" +
           "For a CV, role details, availability, or anything this page does not cover, email is the right channel.",
        next: ['What is his experience?', 'Explain each project in detail', 'What is his stack?', 'Who is he?'],
    },
    {
        id: 'ros2',
        label: 'ROS2 depth',
        ask: 'How deep is his ROS2 knowledge?',
        k: ['!ros2', '!ros', '!humble', '!rclcpp', '!rclpy', 'node', 'nodes', 'topics', '!colcon', '!launch file', 'interface', 'interfaces', '!action server', '!action servers', 'middleware', '!dds', '!workspace', '!package', '!packages'],
        a: "## ROS2 — Humble, in C++ and Python\n" +
           "He works inside ROS2's interfaces rather than only on top of them. Concrete markers on this page:\n\n" +
           "- A multi-node pipeline in the MoveIt2 project where each stage is its own node with a defined topic contract: ground truth, rendered image, detections, validated targets\n" +
           "- A C++ node and a Python node in the same package, split on a real criterion — the per-detection reachability filter must not block the orchestrating state machine\n" +
           "- Action-server verification before execution, so a missing controller fails at startup instead of mid-motion\n" +
           "- A latched topic for scene ground truth, so a node that starts late still receives it\n\n" +
           "Professionally: Nav2, SLAM and AMCL on autonomous mobile robots, which is where the deeper navigation-side ROS2 work sits.",
        deep: "## The version and the languages\n" +
           "ROS2 Humble, C++ and Python, on Linux. C++ for nodes that run per frame or per detection; Python where iteration speed and async orchestration matter more.\n" +
           "## Where the depth shows on this page\n" +
           "- Topic contracts between nodes: scene ground truth on a latched topic, rendered frames, detected objects, validated targets, and a scene-update channel that hides a ball once it is picked. Each stage is replaceable without touching the others\n" +
           "- Actions: the MoveIt2 project verifies its action server before commanding anything, and drives MoveGroup asynchronously with an explicit completion event rather than blocking\n" +
           "- Service quirks handled rather than worked around: the Humble Cartesian-path service has no velocity-scaling field, so the trajectory is retimed after planning\n" +
           "- Language split inside one package, justified per node\n" +
           "## Where the deeper ROS2 work actually lives\n" +
           "In the day job: Nav2, SLAM, AMCL and TF2 on autonomous mobile robots. That is professional experience and it is not demonstrated by a repository here, so it should be verified in conversation.\n" +
           "## What is not claimed\n" +
           "No real-time executors, no DDS QoS tuning, no micro-ROS. Ask by email if that is what the role needs.\n" +
           "## Why the portfolio leans away from ROS2 now\n" +
           "Deliberately. The target role is Physical AI Engineer — learned behaviour on real machines — not ROS2 integration. ROS2 is the deployment layer for that, and it is represented here by the earlier closed-loop pick-and-place system and the fleet pipeline rather than by the current cards.",
        next: ['Tell me about the MoveIt2 pick and place project', 'C++ or Python?', 'What roles is he a fit for?', 'How does he debug robot problems?'],
    },
    {
        id: 'simtoreal',
        label: 'Sim-to-real',
        ask: 'What about sim-to-real transfer?',
        k: ['!sim-to-real', '!sim to real', '!sim2real', '!reality gap', '!domain gap', '!simulation to reality', '!real world', '!transfer', '!domain randomisation', '!domain randomization', '!system identification', '!does it work on real hardware'],
        weight: 1.3,
        a: "This is his stated differentiator, and the honest version matters more than the enthusiastic one.\n\n" +
           "## What is on this page\n" +
           "- Domain randomisation measured rather than described: the detection project randomises hue, lighting and table shade at render time, and then ablates whether photometric augmentation on top adds anything. It adds +0.0007 mAP\n" +
           "- The same question asked in the pose project, with two dataset regimes — fixed appearance and randomised appearance — and the classical baseline's detection rate collapsing to 10.9% under the hard one\n" +
           "- An evaluation habit that transfers: hold out the split you report on, search hyperparameters on disjoint seeds, and report the axis where the learned method loses\n" +
           "- ONNX export verified by recomputing the task metric through the runtime, which is the step that gets a model onto a robot\n\n" +
           "## What is not on this page\n" +
           "A policy trained in simulation and measured on hardware. There is no robot to deploy to. That is the missing artefact and he would say so first.\n\n" +
           "If a role turns on that specifically, email him: " + EMAIL,
        deep: "## Why this is the differentiator\n" +
           "His stated target is Physical AI Engineer, and the thing that separates one from a general ML engineer is sim-to-real: domain randomisation, system identification, residual policies, and hardware failure analysis. That is a systems problem — the failure lives in the seams: frames, latency, sensor noise, actuator saturation, contact.\n" +
           "## What the page actually supports\n" +
           "- Randomisation as a measured variable, not a checkbox. The Tabletop Clutter Detector randomises appearance at render time and then ablates photometric augmentation on top of it: +0.0007 mAP, a null, reported as a null. The two are not symmetric and the project says why\n" +
           "- Two regimes in the Cube Pose Regression CNN — fixed appearance and randomised hue, light position, light intensity and table shade. The classical colour-threshold baseline's detection rate falls to 10.9% under the randomised regime while the network holds at 100%. That is the reality-gap experiment in miniature\n" +
           "- Evaluation discipline that survives contact with a real result: the val split touched exactly once, hyperparameters searched on seeds disjoint from the reported ones, and a training-selection leak found, fixed and quantified at 0.01 mm\n" +
           "- A deployment path: ONNX export with the full task metric recomputed through the runtime, and latency measured on the CPU budget a robot would actually have\n" +
           "- Microduck Balance and Push Recovery: the observation is restricted to what the hardware reports, the randomisation ranges come from four measured fits of the same servo (friction loss disagrees by 6.7x between them), and two held-out model variants with backlash joints and rollers are the physics both policies were scored on without having trained on it. The measured answer was negative: randomisation bought robustness to backlash and cost the robot its stance, because it learned to brace in a crouch\n" +
           "- SO-ARM100: six held-out physics cells that each sit outside the randomised range, asserted by a test, and a nominal-against-randomised comparison written into the protocol before any policy trained\n" +
           "- Threaded C++ MuJoCo Backend: a faster simulator only helps sim-to-real if it is the same simulator, so equality to the bit was proven before speed was measured\n" +
           "## What is honestly missing\n" +
           "- No policy has been transferred to hardware, because there is no hardware. Everything is simulation to simulation so far\n" +
           "- System identification is method knowledge and a planned step, not a shipped result\n" +
           "- No residual or hybrid policy work published yet\n" +
           "## The next step that would prove it\n" +
           "For the Microduck that table now exists, and it came out against randomisation: robust to backlash, collapsed on rollers, upright less everywhere. The next proof is a reward that pays height only when upright, re-run the same way, and the same held-out table for the arm, which is written into the repository and not yet measured.",
        next: ['Tell me about the Microduck balance project', 'Tell me about the SO-ARM100 projects', 'What are the gaps in his experience?', 'What is he aiming for?'],
    },
    {
        id: 'legged',
        label: 'Legged robotics',
        ask: 'What legged robotics experience does he have?',
        k: ['!legged robotics', '!quadruped', '!quadrupedal', '!four-legged', '!four legged', '!walking robot', '!dog robot', '!humanoid'],
        a: "## What exists\n" +
           "Microduck Balance and Push Recovery — a balance-and-recover policy for a 25 cm, 737 g open-source biped with 14 position-controlled servos, in MuJoCo. The environment contract is 48 observations (only what the robot's own sensors report) and 14 actions at 50 Hz, the reward was rebuilt after measuring that three of four penalties were inert, and the shipped PD controller scores 175.2 ± 3.1 of 500 under that reward. PPO trains against it, and a C++17 backend runs the same environment bit-identically at about twice the speed.\n\n" +
           "## What that is and is not\n" +
           "It is a balance-and-recovery task, not a walking gait, and there is no physical robot. Domain randomisation was measured on held-out physics and made this policy worse, because it learned to brace instead of stand; both policies are the first half of a 50M-step run on one seed.\n\n" +
           "Legged locomotion is one of the three things he names as his direction, and this is the first deliberate step rather than the finished article.",
        next: ['Tell me about the Microduck balance project', 'What about sim-to-real transfer?', 'What is he aiming for?', 'What are the gaps in his experience?'],
    },
    {
        id: 'hardware',
        label: 'Robots & sensors',
        ask: 'Which robots and sensors has he worked with?',
        k: ['!hardware', '!real robot', '!real robots', '!physical robot', '!physical hardware', '!which robots', '!what robots', '!robot platforms', '!platforms', '!actuator', '!actuators', '!motor', '!motors', '!sensor suite', '!sensors used', '!sensor stack', '!on real hardware'],
        a: "## Platforms named on this page\n" +
           "- Microduck — a 25 cm, 737 g open-source biped with 14 servos, in MuJoCo\n" +
           "- SO-ARM100 — a low-cost 5-joint arm with a parallel gripper, the MuJoCo Menagerie model, in simulation\n" +
           "- Franka Panda, 7-DOF arm — the earlier closed-loop pick-and-place stack, in simulation\n" +
           "- TurtleBot3, several at once — the earlier fleet telemetry project, in Gazebo\n\n" +
           "## Sensors\n" +
           "LiDAR, IMU and camera, with sensor fusion across them. PCL for point clouds, OpenCV for images — used both as a tool and as the baseline the learned models have to beat.\n\n" +
           "## The honest split\n" +
           "He works on real robot hardware professionally — mobile platforms, navigation, LiDAR perception. Every project on this page is personal work and runs in simulation; the machines from his job are not published here.\n\n" +
           "For the real-hardware detail, employers and dates, email him: " + EMAIL,
        deep: "## Platforms\n" +
           "- Microduck — a 25 cm, 737 g open-source biped with 14 position-controlled servos, simulated in MuJoCo at 500 Hz physics with 50 Hz control\n" +
           "- SO-ARM100 — five joints and a parallel gripper on position servos, 20 Hz control, a scripted IK expert that has to correct for the servos' gravity sag\n" +
           "- Franka Panda — a 7-DOF arm, OMPL and Cartesian planning, constraint-based execution, trajectory retiming for velocity scaling\n" +
           "- TurtleBot3 — multiple units simulated simultaneously, producing concurrent telemetry for the Kafka and QuestDB pipeline\n" +
           "## Sensors and the libraries around them\n" +
           "- Camera — synthetic RGB from MuJoCo and Gazebo renderers, with labels taken from the segmentation buffer\n" +
           "- LiDAR and IMU with sensor fusion, and PCL for point-cloud work, from the professional side\n" +
           "- OpenCV for image work: HSV thresholding, contour extraction, minimum-area rectangles — all of it used as a measured baseline rather than as a demo\n" +
           "## Simulation versus hardware, stated plainly\n" +
           "Every project here is simulated. That is a deliberate choice for a public portfolio — a simulated stack is reproducible by whoever is reading it, and every claim can be re-run from the repository. It is also a constraint: there is no GPU and no robot to buy.\n" +
           "The About section states that his professional work covers deployment on real hardware. The page does not name those robots, so neither will I.\n" +
           "## What to ask him directly\n" +
           "Which physical platforms, at what scale, and for how long — email " + EMAIL + " for that.",
        next: ['What about sim-to-real transfer?', 'Explain each project in detail', 'What numbers can he back up?', 'How do I contact him?'],
    },
    {
        id: 'reliability',
        label: 'Failure handling',
        ask: 'How does he handle failure and recovery?',
        k: ['!reliability', '!reliable', '!robust', '!robustness', '!recovery', '!recover', '!fallback', '!failure', '!failures', '!fail', '!safety', '!safe', '!error handling', '!graceful', '!edge case', '!edge cases', '!unattended', '!production ready', '!production-ready'],
        weight: 1.1,
        a: "Failure paths are designed, not bolted on — and the same instinct shows up in how the measurements are run.\n\n" +
           "- MoveIt2 Pick & Place Demo — a C++ validator rejects unreachable targets before the planner is asked, Cartesian planning falls back to OMPL RRTConnect, the action server is verified at startup, and a planning failure routes to a homing state rather than ending the run\n" +
           "- PPO vs LQR on Cart-Pole — runs that never reach threshold are entered as budget plus one rather than dropped, because dropping them is how a bad configuration is made to look good\n" +
           "- Fleet Monitoring System — Kafka between producers and consumers, so a slow or dead consumer does not take telemetry down with it\n\n" +
           "The pattern: assume it breaks, decide what happens next, and make the breakage visible — in a robot and in a results table.",
        deep: "## In the robot code\n" +
           "- The reachability validator is a filter placed before the planner, so an impossible target is a rejected message rather than a planning failure. Failing early is cheaper than failing loudly\n" +
           "- Cartesian-first with OMPL RRTConnect as fallback: the preferred motion is the predictable one, and the sampling planner is what happens when the preferred motion is unavailable\n" +
           "- Action-server verification before anything is commanded, so a missing or unready controller fails at startup rather than mid-motion\n" +
           "- A dedicated homing state on planning failure, returning the arm to a known configuration so the run continues\n" +
           "- An attached collision object was removed after it caused self-collision failures, and the reason is recorded in the repository rather than silently reverted\n" +
           "## In the measurements\n" +
           "This is the less obvious half, and it is the same habit.\n" +
           "- Unsolved RL runs are entered at budget plus one instead of dropped, so a failing configuration cannot hide behind the survivors' median\n" +
           "- Throughput figures that turned out to be bursts or incomplete compositions are corrected on the page with all five values kept, rather than overwritten\n" +
           "- A C++ environment is proven equal to the Python one to the bit before its speed is quoted, because a fast environment that differs is a silent failure\n" +
           "- A training-selection leak was found, fixed, the affected run retrained, and the difference quantified at 0.01 mm\n" +
           "- An ablation that returned nothing is published as nothing\n" +
           "## In the infrastructure\n" +
           "Kafka decouples producers from consumers so a slow consumer buffers instead of dropping telemetry, and the whole stack is containerised, which removes the class of failures that begin with \"it worked on my machine\".\n" +
           "## The underlying habit\n" +
           "Design the failure path first, make the failure observable, and give the system a defined next move. A results table gets the same treatment as a robot.",
        next: ['Tell me about the MoveIt2 pick and place project', 'What numbers can he back up?', 'How does he debug robot problems?', 'How does he work?'],
    },
    {
        id: 'metrics',
        label: 'The numbers',
        ask: 'What numbers can he back up?',
        k: ['!metric', '!metrics', '!accuracy', '!success rate', '!numbers', '!measured', '!measurable', '!benchmark', '!benchmarks', '!precision', '!latency', '!throughput', '!fps', '!proof', '!evidence', '!quantify', '!quantified', '!results'],
        a: "## Published on this page\n" +
           "- mAP@[.5:.95] 0.911 against a fitted classical pipeline's 0.532 — Tabletop Clutter Detector, COCO mAP implemented from scratch\n" +
           "- 1.20 ms per image through ONNX Runtime on 8 CPU threads, against 3.87 ms in eager PyTorch — same project\n" +
           "- 0.59 mm median position error from 27k parameters — Cube Pose Regression CNN, against a refitted classical baseline at 1.91 mm\n" +
           "- Steps-to-threshold median 62,144 over 16 seeds, IQR [60,442, 63,448] — PPO vs LQR on Cart-Pole, against LQR at zero sample cost\n" +
           "- PD baseline 175.2 ± 3.1 of 500 under the rebuilt reward, 108.7 ± 2.9 under the old one; training loop at about 3,300 environment steps per second, measured on the workload itself — Microduck Balance and Push Recovery\n" +
           "- 6,275 of 6,275 observations bit-identical; 1.9 to 2.0x the Python processes at 8 workers (12,327 vs 6,385 environment steps per second); 27,011 bare physics steps per second at 8 threads — Threaded C++ MuJoCo Backend\n" +
           "- 122 tests green across four repositories, the expert reference measured, and the policy tables marked not yet measured — SO-ARM100 Manipulation\n\n" +
           "## Not published\n" +
           "No result table yet for the SO-ARM100 policies. No positioning-accuracy or success-rate figure for the earlier MoveIt2 project — neither was measured, so neither is claimed. No throughput number for the telemetry pipeline. No hardware-versus-simulation comparison, because nothing has run on hardware.\n\n" +
           "Every project links to its repository and every number above is reproducible from it.",
        deep: "## The numbers, with their mechanism attached\n" +
           "A figure without its method is decoration, so each one comes with how it was obtained.\n" +
           "- **mAP@[.5:.95] 0.911** — Tabletop Clutter Detector, 380,631 parameters, 25 epochs, 34 minutes on 8 CPU threads. The comparison point is a classical pipeline refitted with a score, at 0.532. The metric itself is implemented from scratch and unit-tested, and the val split was touched exactly once\n" +
           "- **AP75 0.9896 against AP50 0.9899** — a gap of 0.0003, which is the evidence that localisation is essentially exact. The baseline lost 0.134 between the same thresholds\n" +
           "- **1.20 ms per image** through ONNX Runtime at 8 threads, against 3.87 ms eager. Re-measured on an idle machine because the first pair was taken on a hot one\n" +
           "- **+0.0007 mAP** — the augmentation ablation. A null result, reported\n" +
           "- **0.59 mm median, 1.32 mm p95** — Cube Pose Regression CNN, 27k parameters. The refitted classical baseline reaches 1.91 mm, and the network's real advantage is the tail rather than the median\n" +
           "- **62,144 steps-to-threshold**, median over 16 seeds, IQR [60,442, 63,448], reproduced exactly on a second run. LQR reaches the same threshold having consumed zero samples\n" +
           "- **175.2 ± 3.1 of 500** — the Microduck PD hold-pose baseline under the rebuilt reward, 20 seeds, from a script in the repository; 108.7 ± 2.9 under the old reward\n" +
           "- **About 3,300 environment steps per second** for the Microduck training loop, measured on the workload itself — the fifth value after 28,749, 18,400, 8,000 and 13,300, each kept on the page with the reason the previous one was wrong\n" +
           "- **6,275 of 6,275** — observations bit-identical between the C++ and Python environments over 25 episodes, zero reward or flag differences\n" +
           "- **12,327 vs 6,385 environment steps per second** at 8 workers, C++ threads against Python processes alternated in one run, 1.93x; a run started on a still-loaded box gave 2.04x. The single-process reference was flagged unstable both times and the page says so\n" +
           "- **27,011 bare physics steps per second** at 8 threads in C++, reproduced within 1% by a second sweep\n" +
           "## What is deliberately absent\n" +
           "- No results table yet for the SO-ARM100 reinforcement, imitation or language policies; the protocol and the commands are published, the numbers are not\n" +
           "- No training run yet on the C++ backend\n" +
           "- No positioning accuracy and no success rate for the earlier MoveIt2 project. Neither was measured, so neither is claimed\n" +
           "- No end-to-end throughput figure for the telemetry pipeline\n" +
           "- No hardware measurements of any kind, because no project has run on hardware\n" +
           "## How to verify\n" +
           "Every project is public on github.com/AungKaung1928 and every card links to a full written walkthrough. Each repository ships the script that produces its numbers, a test suite, a Dockerfile and a CI workflow that runs the tests.",
        next: ['Tell me about the clutter detection project', 'What are the gaps in his experience?', 'How does he handle failure and recovery?', 'How do I contact him?'],
    },
    {
        id: 'deployment',
        label: 'Deployment & packaging',
        ask: 'How does he deploy and package his work?',
        k: ['!deploy', '!deployment', '!deploying', '!packaging', '!containerised', '!containerized', '!reproducible', '!ship', '!shipping', '!export', '!ci', '!cd', '!build system', '!setup', '!install', '!run it', '!devops', '!edge'],
        a: "## Models\n" +
           "The learned projects export to ONNX, and the export is proven rather than assumed: the full task metric is recomputed through ONNX Runtime and compared, not just the output tensors. In the detection project that step turned a 3.87 ms eager forward pass into 1.20 ms end to end, and step 6 takes the same graph to static INT8 and prunes it for a one-thread budget. The Microduck and arm policies export with their observation normaliser folded into the graph, because a policy shipped without its normaliser is a different policy.\n\n" +
           "## Systems\n" +
           "The fleet monitoring stack is fully containerised with Docker — broker, time-series database, dashboard and ROS2 nodes — so the whole system comes up as a unit on someone else's machine.\n\n" +
           "## Why the ONNX step matters for robotics\n" +
           "A model that only runs inside a Python training script is not deployed. Exporting it is what lets a C++ ROS2 node run the same weights on a robot, and re-scoring the task through the runtime is what proves the exported graph is the same model.\n\n" +
           "Every current repository ships a Dockerfile and a GitHub Actions workflow that runs its tests on each push; the C++ backend's CI also rebuilds under three sanitizers. Not on this page: cross-compilation or edge-device images.",
        deep: "## Model deployment\n" +
           "- ONNX export in both vision projects, with opset and graph size recorded\n" +
           "- Verified by recomputing the entire task metric through ONNX Runtime, not by checking a maximum absolute difference alone. A graph can be numerically close and still have a wrong output order or a dropped layer\n" +
           "- Latency measured at the thread counts a robot would actually have: 1.20 ms per image at 8 threads for the detector, 3.69 ms at one thread against the classical pipeline's 2.13 ms, 0.23 ms at one thread for the pose network\n" +
           "- The detector was 1.9x slower than the classical pipeline in eager PyTorch and 1.8x faster through the runtime at 8 threads, and still slower at one thread. That last number is what step 6's INT8 quantisation and pruning exist to fix, on a one-thread mAP-versus-latency curve\n" +
           "- Policies export with the running observation normaliser folded into the ONNX graph, and a test proves the exported graph disagrees with the un-normalised network and agrees with the training-time path\n" +
           "## System deployment\n" +
           "The Fleet Monitoring System runs as a Docker stack: Kafka as the broker, QuestDB as the time-series store, the dashboard, and the ROS2 nodes producing telemetry. Bringing it up is one operation.\n" +
           "## Reproducibility as the actual test\n" +
           "Every repository ships the script that regenerates its numbers, and each states what to run and roughly how long it takes on CPU. Anyone reading can re-run the claim.\n" +
           "## The runtime environment\n" +
           "Linux throughout, ROS2 Humble for the robot side, Python with PyTorch and MuJoCo for the learning side, ONNX Runtime as the serving layer. Nothing exotic, which is the point.\n" +
           "## Build and CI\n" +
           "Every current repository has a Dockerfile (CPU-only images, tests run inside) and a GitHub Actions workflow. The C++ backend builds with CMake, links the MuJoCo library shipped inside the Python wheel so both sides use the same physics binary, and its CI rebuilds the suite under AddressSanitizer, UndefinedBehaviorSanitizer and ThreadSanitizer.\n" +
           "## What is not claimed\n" +
           "- No cross-compilation or Jetson image building\n" +
           "- No TensorRT or GPU inference work, because there is no GPU\n" +
           "Email " + EMAIL + " if a role depends on any of those.",
        next: ['Does he do machine learning?', 'Tell me about the fleet monitoring project', 'C++ or Python?', 'What are the gaps in his experience?'],
    },
    {
        id: 'debug',
        label: 'How he debugs',
        ask: 'How does he debug robot problems?',
        k: ['!debug', '!debugging', '!troubleshoot', '!troubleshooting', '!diagnose', '!root cause', '!failure analysis', '!goes wrong', '!something breaks', '!find bugs', '!fix bugs', '!observability', '!monitoring health'],
        a: "Two habits show up repeatedly.\n\n" +
           "## Verify the substrate before blaming the algorithm\n" +
           "The cart-pole environment was checked against the published dynamics — 13 checks — before any RL existed, precisely so that \"algorithm or environment\" would be a cheap question later. The dataset labels are drawn back onto the images before any model is trained, because if the markers miss the objects the label convention is wrong and nothing downstream means anything.\n\n" +
           "## Make the invisible observable\n" +
           "- Raw and processed data rendered side by side rather than trusted\n" +
           "- Action-server verification that fails loudly at startup instead of silently at runtime\n" +
           "- Throughput measured under sustained load and then on the training loop itself, after the burst number proved misleading four times\n\n" +
           "The theme: turn a debugging session into a signal you can watch.",
        deep: "## First principle — verify the layer underneath\n" +
           "Every project builds the thing that could be silently wrong, then checks it before building on top.\n" +
           "- The cart-pole dynamics are verified against the 1983 source equations, 13 checks, before PPO is written. When PPO then fails to learn, the environment is already excluded\n" +
           "- Dataset labels are projected back onto the rendered images and inspected. A wrong label convention invalidates every number that follows it, and it is invisible in a loss curve\n" +
           "- The COCO mAP implementation is tested against known inputs before a detector exists, so a bad metric cannot be mistaken for a bad model\n" +
           "- The observation dimension was stated as 61 in one step and found to be 48 in the next. The correction is on the page rather than quietly applied\n" +
           "## Second principle — instrument the silent failures\n" +
           "- Rendered comparisons instead of asserted improvements\n" +
           "- Action-server verification before commanding motion, so an unready controller is a startup failure rather than a mysterious stop\n" +
           "- Sustained-load measurement after a burst measurement misled three times in a row, then a measurement on the training loop itself after the composed figure still left out the inter-process round trip. The machine's power state is not visible from inside the environment, so the measurement had to be redesigned rather than repeated\n" +
           "- When the C++ environment disagreed with Python in the last bit, the cause was traced to numpy's summation order and the C library's pow, measured over millions of random inputs, rather than papered over with a tolerance\n" +
           "## Third principle — a defined next move\n" +
           "Recovery to a home state after a failed plan, a fallback planner when the preferred one fails, unsolved runs entered at budget plus one. Debugging is easier when the system's response to failure is deterministic instead of improvised.\n" +
           "## Where the hardware instinct comes in\n" +
           "When a robot misbehaves the candidate list starts with mounting, frames, controller limits and timing, then the algorithm. That ordering is what saves the days most people lose.",
        next: ['How does he handle failure and recovery?', 'What numbers can he back up?', 'How does he work?', 'What is his experience?'],
    },
    {
        id: 'kinematics',
        label: 'Maths & control theory',
        ask: 'What is his maths and control theory background?',
        k: ['!kinematics', '!inverse kinematics', '!forward kinematics', '!dynamics', '!maths', '!mathematics', '!math background', '!linear algebra', '!transform math', '!rotation', '!quaternion', '!quaternions', '!frames math', '!control theory', '!riccati', '!statistics'],
        a: "## Control theory, applied rather than cited\n" +
           "The LQR baseline in the PPO project is derived, not imported: linearise the plant, iterate the discrete Riccati recursion, project the continuous control onto the available actuation. No scipy — the recursion is the point.\n\n" +
           "## Rigid-body geometry\n" +
           "A 7-DOF arm with redundant degrees of freedom, joint limits, orientation constraints and trajectory retiming. Pinhole back-projection onto a known plane to recover world coordinates from pixels. Projective geometry used to check labels rather than to describe them.\n\n" +
           "## Statistics, which is the underrated one\n" +
           "Median and IQR over 16 seeds instead of a best curve. Two-sided permutation tests on differences of medians. Hyperparameters searched on disjoint seeds. A conclusion that changed between 8 and 16 seeds, and is reported as having changed.\n\n" +
           "The practical value: when a result looks good, he can tell whether it is real.",
        deep: "## Control theory\n" +
           "- LQR derived from the linearised cart-pole: the discrete Riccati recursion iterated directly, then the continuous control projected onto a two-action plant through a sign-based switching surface\n" +
           "- The plant dynamics themselves written from the published equations, including the half-length convention and the 4/3 term that comes from a uniform rod's moment of inertia\n" +
           "- PID controllers and a hand-tuned PD hold-pose controller for the biped, measured as a baseline rather than assumed adequate\n" +
           "## Geometry\n" +
           "- A 7-DOF redundant arm: joint limits, orientation constraints with yaw deliberately left free for a symmetric object, and post-planning trajectory retiming\n" +
           "- Exact pinhole back-projection onto a known table plane, which is what makes the pick-and-place loop closed rather than approximate\n" +
           "- An analytic overhead projection used to verify dataset labels, and a radial-bias correction derived from what an overhead camera actually sees of a cube's top face\n" +
           "## Statistics and experiment design\n" +
           "This is the part that separates a measurement from a demo.\n" +
           "- 16 seeds, median and interquartile range, never a single reward curve\n" +
           "- Two-sided permutation tests on the difference of medians, rather than eyeballing a gap\n" +
           "- Unsolved runs entered at budget plus one instead of dropped\n" +
           "- Hyperparameters searched on seeds disjoint from the reported ones\n" +
           "- A study run at 8 seeds first, where two of three conclusions changed at 16 — kept on the page as evidence that eight was not enough\n" +
           "- Aggregate error floors computed properly: a per-sample pixel quantisation is not a floor on a median over N samples\n" +
           "## Not on this page\n" +
           "University, degree specifics and coursework. Email " + EMAIL + " for that.",
        next: ['Tell me about the PPO project', 'What numbers can he back up?', 'Tell me about the MoveIt2 pick and place project', 'How does he work?'],
    },
    {
        id: 'gaps',
        label: 'Limits & gaps',
        ask: 'What are the gaps in his experience?',
        k: ['!weakness', '!weaknesses', '!gap', '!gaps', '!limitation', '!limitations', '!missing', '!concern', '!concerns', '!red flag', '!red flags', '!downside', '!risk', '!risks', '!not done', '!blind spot', '!what he cannot', '!honest assessment'],
        weight: 1.2,
        a: "Straight answer, because the question deserves one.\n\n" +
           "- Early career. Depth in a narrow band, not a long track record\n" +
           "- Every project runs in simulation. Nothing on this page has been transferred to hardware, which is awkward for someone whose stated differentiator is sim-to-real\n" +
           "- No GPU experience in the portfolio. No CUDA, no TensorRT, no distributed training — the whole learning track is an 8-thread CPU budget by necessity\n" +
           "- The SO-ARM100 result tables are not measured yet, and the one sim-to-real method result that is measured, Microduck domain randomisation, came out negative\n" +
           "- Model scale is small: the largest network on the page is 380,631 parameters\n" +
           "- Employers, dates and role scope are not on the page at all\n\n" +
           "What is genuinely strong: measurement discipline that is rare at any level — baselines refitted until they are hard to beat, null results published, corrections left visible, and conclusions reported against the learned method when that is what the data says.\n\n" +
           "For anything in the first list, email " + EMAIL,
        deep: "## The gaps, plainly\n" +
           "- Early career. The claim is depth in a narrow band, not seniority. He would say the same\n" +
           "- Simulation only. Eight projects, zero hardware results. His professional work involves real robots, but none of that is documented here — and sim-to-real is precisely the thing he names as his differentiator\n" +
           "- No GPU work. No CUDA, no TensorRT, no multi-GPU training, no large models. This is a hard constraint rather than a preference, and it caps what the portfolio can demonstrate about scale\n" +
           "- One of the four current cards is ahead of its numbers: the SO-ARM100 policy tables are marked not yet measured (only the bench reference is). The Microduck policies are the first half of their schedule on one seed; its domain-randomisation result is measured and negative\n" +
           "- Small models and small datasets. 380,631 parameters at the top end, tens of thousands of images\n" +
           "- Navigation and SLAM appear as skills with no project behind them on this page — professional experience that has to be verified in conversation\n" +
           "- No employment detail: no employers, dates, team size or role scope\n" +
           "- CI runs tests only; nothing published on cross-compilation or edge-device deployment, and the one-thread INT8 latency is an x86 number, not a Jetson one\n" +
           "## What that leaves genuinely strong\n" +
           "- Measurement discipline. Baselines refitted until they are competitive, metrics implemented and tested from scratch, null results published, corrections left on the page with the reason, and conclusions that go against the learned method when the data says so. This is rare and hard to fake\n" +
           "- End-to-end ownership: dataset generation, model, metric, ablation, export, latency — all of it, per project\n" +
           "- A working ROS2 systems layer to deploy into, including a closed perception-to-execution loop on a 7-DOF arm\n" +
           "## How to read the combination\n" +
           "An early-career engineer with unusually good scientific hygiene, aimed deliberately at physical AI, who has built the method but not yet the hardware result. If the role can supply the robot, that gap closes fast. If the role needs someone who has already shipped a policy onto a machine, it does not.\n" +
           "## What to ask him\n" +
           "Real-hardware scope, employers and dates, and the state of the open runs: " + EMAIL,
        next: ['What is his strongest project?', 'What about sim-to-real transfer?', 'What roles is he a fit for?', 'How do I contact him?'],
    },
    {
        id: 'fit',
        label: 'Role fit',
        ask: 'What roles is he a fit for?',
        k: ['!role fit', '!fit for', '!which role', '!what role', '!what kind of role', '!suited', '!suitable for', '!right role', '!job type', '!position', '!positions', '!team fit', '!where would he fit'],
        a: "## Direct fits\n" +
           "- Physical AI / robot learning engineer, junior to mid — perception models, policies, sim-to-real, on a team that has the hardware\n" +
           "- Perception engineering: detection and pose estimation with a deployment path, not just a notebook\n" +
           "- Robotics software engineer on a ROS2 stack — manipulation, MoveIt2, closed perception-to-execution loops\n" +
           "- Robot infrastructure adjacent work: telemetry, fleet observability, containerised deployment\n\n" +
           "## Poor fits\n" +
           "- ML research positions — no publications, no benchmark record, and he does not claim either\n" +
           "- Large-scale training or GPU infrastructure roles — there is no GPU experience in this portfolio\n" +
           "- Pure cloud or web engineering\n" +
           "- Roles needing a shipped hardware policy today rather than in a year\n\n" +
           "For scope, availability and the CV: " + EMAIL,
        deep: "## Where he lines up well\n" +
           "- Robot learning, junior to mid — a biped policy, arm manipulation by RL, imitation and language, a detector, each with a measured baseline under it, metrics implemented from scratch, and ONNX deployment. On a team with hardware, the missing half of sim-to-real closes quickly\n" +
           "- Simulation and training infrastructure — a threaded C++17 environment proven bit-identical to its Python reference, sanitizer-clean, with benchmarks that carry their own stability verdicts\n" +
           "- Applied perception — object detection and pose regression taken all the way from synthetic data generation to a latency figure on the CPU budget a robot would have\n" +
           "- ROS2 manipulation — a closed camera-to-grasp loop on a 7-DOF arm, with the language split between C++ and Python justified per node\n" +
           "- Robot-adjacent infrastructure — Kafka, QuestDB, Docker, live dashboards. Useful on a team that has robots but no telemetry layer\n" +
           "## Where he would be the wrong hire\n" +
           "- ML research or applied-science roles measured in publications and leaderboard results\n" +
           "- GPU infrastructure, distributed training, or anything where model scale is the job\n" +
           "- Pure cloud, backend or web engineering\n" +
           "- A senior or lead position requiring years of shipped hardware programmes\n" +
           "- A role needing an existing sim-to-real hardware result today\n" +
           "## The one-line version\n" +
           "Early-career robot-learning engineer with unusually rigorous measurement habits and a working ROS2 deployment layer, aimed squarely at physical AI, missing the hardware half of sim-to-real.\n" +
           "## Next step\n" +
           "Email " + EMAIL + " for the CV, availability and role scope — none of that is published here.",
        next: ['What are the gaps in his experience?', 'What is his strongest project?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'workstyle',
        label: 'How he works',
        ask: 'How does he work?',
        k: ['!how does he work', '!work style', '!workstyle', '!approach', '!process', '!methodology', '!philosophy', '!principles', '!way of working', '!engineering approach', '!habits', '!standards', '!code quality'],
        a: "Four habits are visible across the projects.\n\n" +
           "- Build the baseline first, and make it hard to beat. The cube-pose project refits its OpenCV baseline until it closes 53% of the gap to the CNN, then reports that if 1.9 mm is inside tolerance the network is the wrong choice\n" +
           "- Publish the null and the correction. An augmentation ablation worth +0.0007 mAP, five successive throughput figures with the reason each earlier one was wrong, a training-selection leak found and quantified, a benchmark guard's unstable verdict printed next to the rows it flagged\n" +
           "- Measure before committing. Every project opens with a feasibility or verification step: is the machine fast enough, is the environment correct, is the metric right, is the label convention right\n" +
           "- Right language for the job. C++ for per-frame and per-detection work, Python for models and orchestration\n\n" +
           "And one structural choice: the projects are sequenced as blocks, each closing on a number, rather than accumulated as demos.",
        deep: "## Baseline first, and make it hard to beat\n" +
           "A learned model measured against a weak baseline proves nothing. The Cube Pose Regression CNN runs two different hand-written thresholds so \"classical CV fails\" cannot be blamed on one bad prior, then calibrates a scalar that closes 53% of the remaining gap — and states that if 1.9 mm is inside tolerance, the CNN is the wrong engineering choice. The detection project fits a score onto its classical pipeline for the same reason.\n" +
           "## Publish the null, keep the correction\n" +
           "- An augmentation ablation returning +0.0007 mAP, reported as nothing\n" +
           "- Five throughput figures for the same machine — 28,749, 18,400, 8,000, 13,300, then about 3,300 on the training loop itself — all kept, each with the reason the previous one was wrong\n" +
           "- A validation-selection leak found, fixed, retrained and quantified at 0.01 mm\n" +
           "- An observation dimension stated as 61 and corrected to 48, in writing\n" +
           "- An RL conclusion that changed between 8 and 16 seeds, reported as having changed\n" +
           "## Measure before committing\n" +
           "The Microduck project's first step is a throughput gate with a pass threshold written down before the measurement. The cart-pole environment is verified against published dynamics before any RL is written. The mAP implementation is tested before a detector exists. In each case the cheap check comes before the expensive work.\n" +
           "## Language discipline\n" +
           "C++ for anything running per frame or per detection — the reachability validator. Python for models, training and orchestration. The split is defensible node by node rather than by preference.\n" +
           "## Sequenced, not accumulated\n" +
           "The learning track runs as blocks: pose regression, then detection, then reinforcement learning, then the biped, the C++ backend under it, and the arm. Each closes on a measurement and each one's result is the starting point of the next — the soft-argmax head from block 1 is the front end of the arm's image policies, and the PPO loop from block 3 trains the biped and the arm.\n" +
           "## Written down\n" +
           "Every project has a full written walkthrough on this site explaining the architecture, every source file, the measurements and what the result does not prove.",
        next: ['What numbers can he back up?', 'How does he handle failure and recovery?', 'What is his strongest project?', 'Explain each project in detail'],
    },
];

/* Long forms added after the fact, kept out of the literal above so the
 * table stays readable. Merged in below — same effect as writing `deep:`
 * inside each entry. */
const DEEP_EXTRA = {
    help:
        "## What I cover\n" +
        "Everything published on this page, in as much depth as you want. Answers default to the long form; add \"short\" or \"brief\" to any question if you would rather have the summary.\n" +
        "## Background\n" +
        "- Who he is, his experience level, stated honestly\n" +
        "- Where he is heading: physical AI, sim-to-real transfer, legged locomotion\n" +
        "- The maths and control theory that actually gets used\n" +
        "## Skills\n" +
        "- The full stack, or any layer of it\n" +
        "- Robot learning: PPO, imitation learning, language-conditioned policies, reward design, domain randomisation, system identification\n" +
        "- ML / DL: PyTorch, CNNs, object detection, INT8 quantisation, ONNX Runtime\n" +
        "- C++17 (a threaded simulation backend), ROS2 depth, MoveIt2 and Nav2\n" +
        "- Simulation: MuJoCo, Gazebo, RViz, synthetic data\n" +
        "## Projects\n" +
        "- The four current projects together, or any one by name; the four earlier ones too\n" +
        "- Microduck Balance and Push Recovery · Threaded C++ MuJoCo Backend, Bit-Identical · SO-ARM100 Manipulation with RL, Imitation and Language · Tabletop Clutter Detector, INT8 on One Thread\n" +
        "- The numbers behind them, how each was measured, and which numbers do not exist\n" +
        "## How he works\n" +
        "- Baseline-first measurement, null results, corrections kept visible\n" +
        "- Failure handling and recovery design\n" +
        "- How he debugs a misbehaving robot or a misleading measurement\n" +
        "## Hiring\n" +
        "- Which roles fit and which do not\n" +
        "- The honest gaps in his experience\n" +
        "- Email, GitHub, LinkedIn\n" +
        "## Two things I will not do\n" +
        "Invent facts that are not on this page, and pad an answer when the honest reply is \"that is not published, email him\".",
    control:
        "## Control\n" +
        "- LQR, derived rather than imported: the discrete Riccati recursion iterated by hand on a linearised cart-pole, then projected onto a two-action plant\n" +
        "- PID controllers, and a hand-tuned PD hold-pose controller for the biped that is measured as a baseline rather than assumed adequate\n" +
        "- State machines to sequence behaviour, with recovery states rather than an abort\n" +
        "- Path planning, and motion planning on a 7-DOF arm with OMPL\n" +
        "The state-machine part is underrated. The pick-and-place run continues through a failed plan because there is a homing state to route to, not because the planner is better.\n" +
        "## Simulation — MuJoCo\n" +
        "The learning track's substrate. Scene generation with randomised hue, lighting and table shade; labels read from the segmentation buffer rather than annotated; 500 Hz physics with 50 Hz control for the biped; and throughput measured under sustained load because a 20-second burst misled three times.\n" +
        "## Simulation — Gazebo\n" +
        "The ROS2 side: multiple TurtleBot3 robots simulated at once so the telemetry pipeline sees concurrent producers rather than a single stream.\n" +
        "## Visualisation — RViz\n" +
        "Used as a measurement tool rather than a screenshot generator: raw and processed data displayed together so an effect is inspected rather than asserted.\n" +
        "## Synthetic data as a first-class artefact\n" +
        "Every learned project generates its own dataset, and every one verifies the labels before training — projecting them back onto the images, because a wrong label convention is invisible in a loss curve and invalidates everything after it.",
    strongest:
        "Depends what the role needs. Four honest readings:\n\n" +
        "## Best complete result — Tabletop Clutter Detector, INT8 on One Thread\n" +
        "An anchor-free detector at mAP@[.5:.95] 0.911 against a fitted classical pipeline's 0.532, with COCO mAP implemented from scratch and unit-tested before the detector existed, an augmentation ablation published as the null it returned, and a deployment path measured at 8 threads (1.20 ms) and at one (3.69 ms against the classical 2.13 ms). Step 6 answers the one-thread number with static INT8 and structured pruning on a mAP-versus-latency curve.\n" +
        "## Most exacting engineering — Threaded C++ MuJoCo Backend, Bit-Identical\n" +
        "The Microduck environment in C++17 on threads, proven equal to the Python one to the bit over 6,275 observations before any speed was quoted. Getting there meant reproducing numpy's pairwise summation tree, Python's libm pow, a float32 promotion and MuJoCo's warm-started forward pass, each found by measurement over millions of inputs. Then a measured 1.9 to 2.0x over the Python processes at 8 workers, with the benchmark's own stability verdicts printed next to the rows.\n" +
        "## Closest to where he is heading — Microduck Balance and Push Recovery\n" +
        "A 25 cm biped, an observation made only of what its sensors report, a reward rebuilt after measuring that three of four penalties were inert, a PD baseline at 175.2 ± 3.1 of 500, and PPO trained against it in checkpointed chunks. Domain randomisation, tested on held-out physics, made the policy brace in a crouch instead of standing, and that negative result is on the page.\n" +
        "## Widest method coverage — SO-ARM100 Manipulation with RL, Imitation and Language\n" +
        "One bench with one evaluation protocol, and three ways of learning the same four tasks: curriculum PPO with and without randomisation, behaviour cloning through DAgger to action chunking, and a language-conditioned policy scored on held-out paraphrases and unseen task-colour pairs. 122 tests green; the result tables are the least finished thing on the page and are marked as such.\n" +
        "## The common thread\n" +
        "Every learned result sits next to a hand-written method that was measured first, every environment is verified before anything trains in it, and the comparison is published even when it favours the hand-written side.",
    contact:
        "## Email — the fastest route\n" +
        EMAIL + "\n" +
        "Right channel for the CV, availability, role scope, employers and dates, real-hardware detail, and anything else this page does not publish.\n" +
        "## GitHub\n" +
        "github.com/AungKaung1928 — every project is public, and every claim on this page is checkable against the code:\n" +
        "- Microduck Balance and Push Recovery: https://github.com/AungKaung1928/microduck-rl\n" +
        "- Threaded C++ MuJoCo Backend, Bit-Identical: https://github.com/AungKaung1928/mujoco-vecenv-cpp\n" +
        "- SO-ARM100 Manipulation with RL, Imitation and Language: https://github.com/AungKaung1928/so-arm100-rl, with so-arm100-sim, so-arm100-il and so-arm100-vla beside it\n" +
        "- Tabletop Clutter Detector, INT8 on One Thread: https://github.com/AungKaung1928/mujoco-clutter-detect\n" +
        "- Earlier: PPO vs LQR on Cart-Pole https://github.com/AungKaung1928/ppo-from-scratch · Cube Pose Regression CNN https://github.com/AungKaung1928/mujoco-cube-pose-cnn · MoveIt2 Pick & Place Demo https://github.com/AungKaung1928/moveit_pickplace_demo · Fleet Monitoring System https://github.com/AungKaung1928/fleet_monitoring_ws\n" +
        "## Walkthroughs\n" +
        "Every project has a full written walkthrough on this site, linked from its card — architecture, every source file, the measurements, and what the result does not prove.\n" +
        "## What to include if you are hiring\n" +
        "The stack the role actually uses and whether it is simulation or hardware work. He is early career, aimed at physical AI, and specific about what he has and has not done — a specific question gets a specific answer.",
};

for (const t of TOPICS) {
    if (!t.deep && DEEP_EXTRA[t.id]) t.deep = DEEP_EXTRA[t.id];
}

/* Topics menu layout. Any labelled topic missing here is appended under
 * "More", so adding a topic above never silently drops it from the menu. */
const TOPIC_GROUPS = [
    { name: 'Background', ids: ['help', 'who', 'experience', 'goal', 'kinematics'] },
    { name: 'Skills', ids: ['stack', 'ml', 'languages', 'ros2', 'control', 'navigation', 'deployment'] },
    { name: 'Projects', ids: ['projects', 'duck', 'cpp', 'arm', 'detection', 'rl', 'pose', 'manipulation', 'fleet', 'metrics', 'hardware'] },
    { name: 'Approach', ids: ['workstyle', 'reliability', 'debug', 'simtoreal', 'legged'] },
    { name: 'Hiring', ids: ['strongest', 'fit', 'gaps', 'contact'] },
];

/* Rotated four at a time when a conversation starts, so the widget does not
 * look like it only knows four questions. */
const STARTERS = [
    'Who is Aung Kaung Myat?',
    'What is his experience?',
    'Explain each project in detail',
    'What is his full technical stack?',
    'Does he do machine learning?',
    'Tell me about the Microduck balance project',
    'Tell me about the C++ MuJoCo backend',
    'Tell me about the SO-ARM100 projects',
    'Tell me about the clutter detection project',
    'Tell me about the PPO project',
    'Tell me about the cube pose project',
    'Tell me about the MoveIt2 pick and place project',
    'Tell me about the fleet monitoring project',
    'What about sim-to-real transfer?',
    'What numbers can he back up?',
    'How deep is his ROS2 knowledge?',
    'C++ or Python — which does he use?',
    'What is his maths and control theory background?',
    'Which robots and sensors has he worked with?',
    'How does he handle failure and recovery?',
    'How does he debug robot problems?',
    'What are the gaps in his experience?',
    'What roles is he a fit for?',
    'What is his strongest project?',
    'How does he work?',
    'How do I contact him?',
];

/* Questions the page genuinely cannot answer — say so instead of guessing. */
const NOT_COVERED = {
    k: ['salary', 'pay', 'rate', 'age', 'old', 'married', 'visa', 'sponsor', 'relocate', 'relocation', 'remote', 'onsite', 'on-site', 'notice period', 'start date', 'address', 'phone', 'live', 'lives', 'located', 'location', 'city', 'country', 'nationality', 'citizenship', 'university', 'school', 'degree', 'graduated', 'gpa', 'certification', 'certificate', 'employer', 'employers', 'company', 'companies', 'references', 'hobby', 'hobbies', 'family', 'religion', 'politics', 'japanese', 'english level'],
    a: "That is not published on this page, and I do not guess about it — inventing a detail about someone's employment or personal life would be worse than not answering.\n\n" +
       "Things that genuinely are not here: employers, dates, location, visa and salary, university and grades, availability.\n\n" +
       "Email him directly and he will answer: " + EMAIL,
    next: ['What is his experience?', 'What is his stack?', 'Explain each project', 'How do I contact him?'],
};

const FALLBACK_NEXT = ['What can I ask you?', 'Who is he?', 'Explain each project in detail', 'What roles is he a fit for?'];

const FALLBACK =
    "I did not catch that one. I cover Aung's robotics work only — background, experience, the technical stack, the projects, how he works, and contact details.\n\n" +
    "Questions I answer well:\n" +
    "- \"what is his experience\"\n" +
    "- \"explain each project in detail\"\n" +
    "- \"does he do machine learning\"\n" +
    "- \"what about sim-to-real transfer\"\n" +
    "- \"what numbers can he back up\"\n" +
    "- \"how deep is his ROS2 knowledge\"\n" +
    "- \"what are the gaps in his experience\"\n" +
    "- \"how do I contact him\"\n\n" +
    "Tap the list icon in the header for every topic I hold.";

const OFF_TOPIC_RE = /\b(recipe|weather|joke|poem|bitcoin|crypto|football|movie|song|translate|homework|write me|code for me|stock|news)\b/;

const OFF_TOPIC =
    "I only answer questions about Aung Kaung Myat's robotics work — background, stack, projects, contact.\n\n" +
    "Ask \"what can I ask you?\" to see the full list.";

/* ── Matching ────────────────────────────────────────────────────── */

function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Word-boundary match — never a substring, or "his" would match "hi".
 * C++ needs its own branch because '+' is not a word character. */
function hits(query, keyword) {
    if (keyword === 'c++' || keyword === 'cpp') {
        return query.includes('c++') || /\bcpp\b/i.test(query);
    }
    return new RegExp(`\\b${escapeRe(keyword)}\\b`, 'i').test(query);
}

/* Scoring. Raw keyword length is a bad proxy for intent — "experience" is
 * ten characters of nothing in particular, "nav2" is four characters that
 * pin the question down exactly. So length contributes only a little, and
 * keywords marked with a leading '!' (product and technology names) count
 * for much more. */
const STRONG = 2.6;
const MULTIWORD = 2.2;

function scoreTopics(q) {
    const scored = [];
    for (const t of TOPICS) {
        let score = 0;
        for (const marked of t.k) {
            const strong = marked.startsWith('!');
            const kw = strong ? marked.slice(1) : marked;
            if (!hits(q, kw)) continue;
            score += (3 + kw.length * 0.5)
                   * (kw.includes(' ') ? MULTIWORD : 1)
                   * (strong ? STRONG : 1)
                   * (t.weight ?? 1);
        }
        if (score > 0) scored.push({ t, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

/* Returns { text, next } so the UI can offer relevant follow-ups. */
function localAnswer(raw) {
    const q = raw.toLowerCase();
    const brief = BRIEF_RE.test(q);
    const scored = scoreTopics(q);

    // Drop the greeting once any real topic also matched.
    const real = scored.filter((s) => s.t.id !== 'greeting');
    const picked = real.length ? real : scored;

    if (!picked.length) {
        if (NOT_COVERED.k.some((kw) => hits(q, kw))) {
            return { text: NOT_COVERED.a, next: NOT_COVERED.next };
        }
        if (OFF_TOPIC_RE.test(q)) return { text: OFF_TOPIC, next: FALLBACK_NEXT };
        return { text: FALLBACK, next: FALLBACK_NEXT };
    }

    const top = picked[0];

    // A weak single hit that also looks like an off-page question: be honest.
    if (top.score < 5 && NOT_COVERED.k.some((kw) => hits(q, kw))) {
        return { text: NOT_COVERED.a, next: NOT_COVERED.next };
    }

    const parts = [!brief && top.t.deep ? top.t.deep : top.t.a];

    // Multi-topic question ("stack and projects") — add a comparable runner-up.
    const second = picked[1];
    if (second && second.score >= top.score * 0.6 && second.t.id !== 'greeting') {
        // Short form for the runner-up: two long answers stacked is a wall,
        // and the follow-up chips can take the visitor to the long version.
        parts.push(second.t.a);
    }

    // Follow-ups: the top topic's, minus anything it just answered.
    const answered = new Set(picked.slice(0, 2).map((s) => s.t.ask));
    const next = (top.t.next ?? FALLBACK_NEXT).filter((s) => !answered.has(s)).slice(0, 4);

    return { text: parts.join('\n\n'), next: next.length ? next : FALLBACK_NEXT };
}

/* ── Answer rendering ────────────────────────────────────────────── */
/* Plain text in, structured DOM out. Supports "## heading", "- bullet"
 * and "1. numbered". textContent everywhere, so nothing can inject HTML.
 *
 * The text is parsed into blocks once, and the same block list feeds both
 * renderers: the instant one (replayed history) and the typewriter (a live
 * answer). One parser, two speeds — they can never drift apart. */

function stripMd(s) {
    return s.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function parseBlocks(text) {
    const blocks = [];

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();

        if (!line) { blocks.push({ kind: 'gap' }); continue; }

        const heading = line.match(/^#{1,3}\s+(.*)$/);
        if (heading) { blocks.push({ kind: 'h', text: stripMd(heading[1]) }); continue; }

        const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
        if (numbered) { blocks.push({ kind: 'li', num: numbered[1], text: stripMd(numbered[2]) }); continue; }

        const bullet = line.match(/^[-•·]\s+(.*)$/);
        if (bullet) { blocks.push({ kind: 'li', text: stripMd(bullet[1]) }); continue; }

        blocks.push({ kind: 'p', text: stripMd(line) });
    }

    return blocks;
}

/* Appends blocks into a container and returns the empty text node each one
 * is to be filled with — so the caller decides whether that happens all at
 * once or a word at a time. */
function makeRenderer(container) {
    let list = null;

    return {
        add(b) {
            if (b.kind === 'gap') { list = null; return null; }

            if (b.kind === 'li') {
                if (!list) {
                    list = document.createElement('ul');
                    list.className = 'ans-list';
                    container.appendChild(list);
                }
                const li = document.createElement('li');
                if (b.num) {
                    const n = document.createElement('span');
                    n.className = 'ans-num';
                    n.textContent = b.num;
                    li.appendChild(n);
                    li.classList.add('numbered');
                }
                const t = document.createTextNode('');
                li.appendChild(t);
                list.appendChild(li);
                return t;
            }

            list = null;
            const el = document.createElement('p');
            if (b.kind === 'h') el.className = 'ans-h';
            const t = document.createTextNode('');
            el.appendChild(t);
            container.appendChild(el);
            return t;
        },
    };
}

function renderAnswer(text) {
    const frag = document.createDocumentFragment();
    const render = makeRenderer(frag);
    for (const b of parseBlocks(text)) {
        const node = render.add(b);
        if (node) node.textContent = b.text;
    }
    return frag;
}

/* ── Typewriter ──────────────────────────────────────────────────── */
/* Blocks appear in order; words stream into the current one, with a short
 * pause between blocks and a longer one before a heading, so a structured
 * answer arrives the way it reads. Speed scales with length — a two-line
 * reply is not worth watching slowly, a 2,000-character breakdown must not
 * take a minute.
 *
 * Returns { promise, finish }: finish() dumps the remainder immediately,
 * which is what the Stop button and Escape do. */

const CARET_MIN_SPEED = 340;   // characters per second, short answers
const CARET_MAX_SPEED = 900;   // characters per second, long answers

function streamAnswer(container, text) {
    const blocks = parseBlocks(text);
    const render = makeRenderer(container);
    const chars = blocks.reduce((n, b) => n + (b.text ? b.text.length : 0), 0);
    const speed = Math.min(CARET_MAX_SPEED, Math.max(CARET_MIN_SPEED, CARET_MIN_SPEED + chars / 6));

    const caret = document.createElement('span');
    caret.className = 'chat-caret';
    caret.setAttribute('aria-hidden', 'true');

    let bi = 0;          // next block
    let ti = 0;          // next token inside the current block
    let tokens = [];
    let node = null;     // text node being filled
    let budget = 0;      // characters owed for the elapsed time
    let last = 0;
    let raf = 0;
    let timer = 0;
    let over = false;
    let resolve;
    const promise = new Promise((r) => { resolve = r; });

    function done() {
        if (over) return;
        over = true;
        caret.remove();
        resolve();
    }

    /* Creates the next block's element. Blank lines carry no text — they only
     * break a bullet list — so they are skipped without a pause. */
    function openBlock() {
        while (bi < blocks.length) {
            const b = blocks[bi++];
            node = render.add(b);
            if (!node) continue;
            tokens = b.text.match(/\S+\s*/g) || [b.text];
            ti = 0;
            node.parentNode.appendChild(caret);
            return true;
        }
        return false;
    }

    function startBlock() {
        timer = 0;
        if (over) return;
        if (!openBlock()) { done(); return; }
        budget = 0;
        last = 0;
        raf = requestAnimationFrame(tick);
    }

    function tick(now) {
        raf = 0;
        if (over) return;
        if (!last) last = now;
        budget += ((now - last) * speed) / 1000;
        last = now;

        while (budget >= 1 && ti < tokens.length) {
            const token = tokens[ti++];
            node.textContent += token;
            budget -= token.length;
        }
        keepScrolled();

        if (ti >= tokens.length) {
            const pause = blocks[bi] && blocks[bi].kind === 'h' ? 180 : 70;
            timer = setTimeout(startBlock, pause);
            return;
        }
        raf = requestAnimationFrame(tick);
    }

    function finish() {
        if (over) return;
        if (raf) cancelAnimationFrame(raf);
        if (timer) clearTimeout(timer);
        raf = 0;
        timer = 0;

        if (node && ti < tokens.length) node.textContent = tokens.join('');
        while (bi < blocks.length) {
            const b = blocks[bi++];
            const n = render.add(b);
            if (n) n.textContent = b.text;
        }
        done();
        scrollLog();
    }

    startBlock();
    return { promise, finish };
}

/* ── UI ──────────────────────────────────────────────────────────── */

const fab = document.createElement('button');
fab.id = 'chat-fab';
fab.setAttribute('aria-label', 'Ask about Aung');
fab.setAttribute('aria-expanded', 'false');
fab.innerHTML = `
    <svg class="open-icon" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
    <svg class="close-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`;

const panel = document.createElement('div');
panel.id = 'chat-panel';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Portfolio assistant');
panel.innerHTML = `
    <div class="chat-header">
        <div class="chat-id">
            <span class="chat-dot" aria-hidden="true"></span>
            <div>
                <h4>Portfolio Assistant</h4>
                <span class="chat-sub">robotics &middot; physical AI</span>
            </div>
        </div>
        <div class="chat-actions">
            <button id="chat-topics-btn" class="chat-icon-btn" aria-label="Show topics" aria-expanded="false" title="Topics">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
                    <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none"></circle>
                    <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none"></circle>
                    <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none"></circle>
                </svg>
            </button>
            <button id="chat-close" class="chat-icon-btn" aria-label="Close chat" title="Close">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    </div>
    <div class="chat-bar">
        <select id="chat-convo" aria-label="Conversation history" title="Past conversations"></select>
        <button id="chat-new" class="chat-icon-btn" aria-label="New conversation" title="New conversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </button>
        <button id="chat-del" class="chat-icon-btn" aria-label="Delete this conversation" title="Delete this conversation">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
        </button>
    </div>
    <div id="chat-topics" hidden>
        <div class="chat-topics-body"></div>
    </div>
    <div id="chat-log" role="log"></div>
    <p id="chat-live" class="chat-sr" aria-live="polite"></p>
    <div class="chat-suggestions"></div>
    <div class="chat-input-row">
        <textarea id="chat-input" rows="1" maxlength="500" placeholder="Ask about his stack, a project, experience…" aria-label="Your question"></textarea>
        <button id="chat-send" aria-label="Send" title="Send">
            <svg class="send-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <svg class="stop-icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2"></rect>
            </svg>
        </button>
    </div>
    <p class="chat-foot">Answers cover only what is published on this page.</p>`;

document.body.append(fab, panel);

const log = panel.querySelector('#chat-log');
const liveRegion = panel.querySelector('#chat-live');
const input = panel.querySelector('#chat-input');
const sendBtn = panel.querySelector('#chat-send');
const suggestionBar = panel.querySelector('.chat-suggestions');
const topicsPane = panel.querySelector('#chat-topics');
const topicsBody = panel.querySelector('.chat-topics-body');
const topicsBtn = panel.querySelector('#chat-topics-btn');
const convoSelect = panel.querySelector('#chat-convo');
const newBtn = panel.querySelector('#chat-new');
const delBtn = panel.querySelector('#chat-del');

const reducedMotion = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Conversation store ──────────────────────────────────────────── */
/* Kept in localStorage so a visitor who comes back still has what they
 * asked. Conversation shape:
 *   { id, title, messages: [{ role: 'user'|'bot'|'error', text }], next: [] }
 * `next` is the follow-up chip set, stored so switching conversations
 * restores the whole view rather than half of it. */

const STORE_KEY = 'akm-chat-v1';
const MAX_CONVOS = 20;
const MAX_MSGS = 80;
const TITLE_MAX = 44;

let conversations = [];
let activeId = null;

function newId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function active() {
    return conversations.find((c) => c.id === activeId) || null;
}

/* localStorage is user-writable, so everything read back is re-checked
 * before it goes anywhere near the DOM. */
function loadStore() {
    let data;
    try {
        data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch (e) {
        return;
    }
    if (!data || data.v !== 1 || !Array.isArray(data.conversations)) return;

    conversations = data.conversations
        .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
        .slice(0, MAX_CONVOS)
        .map((c) => ({
            id: c.id,
            title: typeof c.title === 'string' && c.title ? c.title.slice(0, TITLE_MAX) : null,
            messages: c.messages
                .filter((m) => m && typeof m.text === 'string')
                .slice(-MAX_MSGS)
                .map((m) => ({
                    role: m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : 'bot',
                    text: m.text,
                })),
            next: Array.isArray(c.next) ? c.next.filter((s) => typeof s === 'string').slice(0, 4) : [],
        }));

    activeId = conversations.some((c) => c.id === data.activeId)
        ? data.activeId
        : (conversations[0] ? conversations[0].id : null);
}

function saveStore() {
    const write = (list) => localStorage.setItem(
        STORE_KEY, JSON.stringify({ v: 1, activeId, conversations: list }),
    );
    try {
        write(conversations);
    } catch (e) {
        // Quota or private-mode storage. Try to keep at least the open
        // conversation; if even that fails, the session runs in memory.
        try { write(conversations.filter((c) => c.id === activeId)); }
        catch (e2) { console.warn('chat history not saved:', e2); }
    }
}

function titleFor(c) {
    return c.title || 'New conversation';
}

function setTitleFrom(text) {
    const c = active();
    if (!c || c.title) return;
    const one = text.replace(/\s+/g, ' ').trim();
    c.title = one.length > TITLE_MAX ? one.slice(0, TITLE_MAX - 1) + '…' : one;
    renderConvoOptions();
}

function record(role, text) {
    const c = active();
    if (!c) return;
    c.messages.push({ role, text });
    if (c.messages.length > MAX_MSGS) c.messages = c.messages.slice(-MAX_MSGS);
    if (role === 'user') setTitleFrom(text);
    saveStore();
}

function renderConvoOptions() {
    convoSelect.innerHTML = '';
    for (const c of conversations) {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = titleFor(c);
        convoSelect.appendChild(o);
    }
    if (activeId) convoSelect.value = activeId;
}

/* ── Log rendering ───────────────────────────────────────────────── */

function nearBottom() {
    return log.scrollHeight - log.scrollTop - log.clientHeight < 140;
}

function scrollLog() {
    log.scrollTop = log.scrollHeight;
}

function keepScrolled() {
    if (nearBottom()) scrollLog();
}

function addMsg(text, cls, instant) {
    const stick = nearBottom();
    const el = document.createElement('div');
    el.className = `chat-msg ${cls}`;
    if (instant) el.classList.add('no-anim');
    if (cls === 'bot') {
        if (text) el.appendChild(renderAnswer(text));
    } else {
        el.textContent = text;
    }
    log.appendChild(el);
    if (stick || cls === 'user') scrollLog();
    return el;
}

function addTyping() {
    const stick = nearBottom();
    const el = document.createElement('div');
    el.className = 'chat-msg bot chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(el);
    if (stick) scrollLog();
    return el;
}

function renderSuggestions(items) {
    suggestionBar.innerHTML = '';
    if (!items || !items.length) return;
    for (const s of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = s;
        b.addEventListener('click', () => { ask(s); });
        suggestionBar.appendChild(b);
    }
}

function setSuggestions(items) {
    const c = active();
    if (c) { c.next = items || []; saveStore(); }
    renderSuggestions(items);
}

function renderLog() {
    log.innerHTML = '';
    liveRegion.textContent = '';
    const c = active();
    if (!c) { renderSuggestions([]); return; }
    for (const m of c.messages) addMsg(m.text, m.role, true);
    renderSuggestions(c.next);
    scrollLog();
}

/* ── Topics menu ─────────────────────────────────────────────────── */

function buildTopicsMenu() {
    topicsBody.innerHTML = '';

    const byId = new Map(TOPICS.filter((t) => t.label && t.ask).map((t) => [t.id, t]));
    const groups = TOPIC_GROUPS.map((g) => ({
        name: g.name,
        items: g.ids.map((id) => byId.get(id)).filter(Boolean),
    }));
    for (const g of groups) for (const t of g.items) byId.delete(t.id);
    if (byId.size) groups.push({ name: 'More', items: [...byId.values()] });

    for (const g of groups) {
        if (!g.items.length) continue;

        const head = document.createElement('p');
        head.className = 'chat-topics-title';
        head.textContent = g.name;
        topicsBody.appendChild(head);

        const row = document.createElement('div');
        row.className = 'chat-topics-list';
        for (const t of g.items) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = t.label;
            b.addEventListener('click', () => { closeTopics(); ask(t.ask); });
            row.appendChild(b);
        }
        topicsBody.appendChild(row);
    }
}

function closeTopics() {
    topicsPane.hidden = true;
    topicsBtn.setAttribute('aria-expanded', 'false');
}

/* ── Starter chips ───────────────────────────────────────────────── */

function starterSet() {
    const pool = STARTERS.slice();
    const picked = ['What can I ask you?'];
    while (picked.length < 4 && pool.length) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked;
}

/* ── Endpoint mode ───────────────────────────────────────────────── */

function endpointHistory() {
    const c = active();
    if (!c) return [];
    const msgs = c.messages.filter((m) => m.role !== 'error');
    // The trailing entry is the question being asked right now; the worker
    // receives that separately as `message`.
    if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.pop();
    return msgs.slice(-8).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
    }));
}

async function askEndpoint(text) {
    const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: endpointHistory() }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.reply) throw new Error('empty reply');
    return data.reply;
}

/* ── Ask / answer flow ───────────────────────────────────────────── */

const OPENING =
    "Ask me about Aung Kaung Myat's robotics work — skills, projects, how he works.\n\n" +
    "Answers are detailed by default; add \"short\" for a summary. List icon for all topics."

let phase = 'idle';      // idle | thinking | streaming
let streamCtl = null;
let pending = null;

function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function setPhase(p) {
    phase = p;
    const working = p !== 'idle';
    sendBtn.classList.toggle('stopping', p === 'streaming');
    sendBtn.disabled = p === 'thinking';
    sendBtn.setAttribute('aria-label', p === 'streaming' ? 'Stop typing' : 'Send');
    sendBtn.title = p === 'streaming' ? 'Stop' : 'Send';
    convoSelect.disabled = working;
    newBtn.disabled = working;
    delBtn.disabled = working;
}

async function showBot(text) {
    record('bot', text);
    const el = addMsg('', 'bot');

    if (reducedMotion) {
        el.appendChild(renderAnswer(text));
        scrollLog();
    } else {
        el.setAttribute('aria-busy', 'true');
        setPhase('streaming');
        streamCtl = streamAnswer(el, text);
        try { await streamCtl.promise; } finally { streamCtl = null; }
        el.removeAttribute('aria-busy');
    }

    // Announced once, complete — streaming into a live region would read
    // the answer out word by word.
    liveRegion.textContent = text;
}

async function run(text) {
    try {
        setPhase('thinking');
        record('user', text);
        addMsg(text, 'user');
        setSuggestions([]);

        const local = localAnswer(text);
        let reply = local.text;
        let fellBack = false;

        const dots = addTyping();
        try {
            if (CHAT_ENDPOINT) {
                try {
                    reply = await askEndpoint(text);
                } catch (err) {
                    fellBack = true;
                    console.warn('chat endpoint failed:', err);
                }
            } else {
                // A beat of thinking before the answer starts, scaled a
                // little by how much there is to say.
                await wait(Math.min(1000, 420 + Math.round(local.text.length / 14)));
            }
        } finally {
            dots.remove();
        }

        await showBot(reply);

        if (fellBack) {
            const note = 'Live assistant unreachable — answered from the local profile instead.';
            record('error', note);
            addMsg(note, 'error');
        }
        setSuggestions(local.next);
    } finally {
        setPhase('idle');
        if (panel.classList.contains('open')) input.focus();
    }
}

async function ask(raw) {
    const text = String(raw).trim();
    if (!text) return;

    // A chip pressed mid-answer finishes that answer first, so the log
    // never has two things typing into it.
    if (streamCtl) streamCtl.finish();
    if (pending) { try { await pending; } catch (e) {} }
    if (phase !== 'idle') return;

    pending = run(text);
    try { await pending; } catch (e) { console.warn('chat failed:', e); } finally { pending = null; }
}

async function greet() {
    try {
        setPhase('thinking');
        const dots = addTyping();
        await wait(360);
        dots.remove();
        await showBot(OPENING);
        setSuggestions(starterSet());
    } finally {
        setPhase('idle');
    }
}

function submit() {
    if (phase === 'streaming') {
        if (streamCtl) streamCtl.finish();
        return;
    }
    if (phase !== 'idle') return;

    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';
    ask(text);
}

/* ── Conversation controls ───────────────────────────────────────── */

function newConversation(force) {
    const c = active();
    // An untouched conversation is already a new one — don't stack empties.
    if (!force && c && !c.messages.some((m) => m.role === 'user')) {
        input.focus();
        return;
    }
    if (streamCtl) streamCtl.finish();

    const fresh = { id: newId(), title: null, messages: [], next: [] };
    conversations.unshift(fresh);
    if (conversations.length > MAX_CONVOS) conversations.length = MAX_CONVOS;
    activeId = fresh.id;

    renderConvoOptions();
    renderLog();
    saveStore();
    greet();
}

let confirmTimer = 0;

function resetConfirm() {
    if (confirmTimer) clearTimeout(confirmTimer);
    confirmTimer = 0;
    delBtn.classList.remove('confirm');
    delBtn.title = 'Delete this conversation';
    delBtn.setAttribute('aria-label', 'Delete this conversation');
}

/* Two presses, because one press should not be able to destroy the log. */
function onDelete() {
    if (!delBtn.classList.contains('confirm')) {
        delBtn.classList.add('confirm');
        delBtn.title = 'Press again to delete';
        delBtn.setAttribute('aria-label', 'Press again to delete this conversation');
        confirmTimer = setTimeout(resetConfirm, 3200);
        return;
    }
    resetConfirm();

    conversations = conversations.filter((c) => c.id !== activeId);
    if (!conversations.length) {
        activeId = null;
        newConversation(true);
        return;
    }
    activeId = conversations[0].id;
    renderConvoOptions();
    renderLog();
    saveStore();
}

function switchConversation(id) {
    if (id === activeId) return;
    if (!conversations.some((c) => c.id === id)) return;
    if (streamCtl) streamCtl.finish();
    activeId = id;
    renderLog();
    saveStore();
    if (!active().messages.length) greet();
    else input.focus();
}

/* ── Panel ───────────────────────────────────────────────────────── */

function toggle(open) {
    const willOpen = open ?? !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    fab.classList.toggle('open', willOpen);
    fab.setAttribute('aria-expanded', String(willOpen));

    if (willOpen) {
        const c = active();
        if (!c) newConversation(true);
        else if (!c.messages.length) greet();
        input.focus();
    } else {
        resetConfirm();
        closeTopics();
        fab.focus();
    }
}

loadStore();
buildTopicsMenu();
if (conversations.length) {
    renderConvoOptions();
    renderLog();
}

fab.addEventListener('click', () => toggle());
panel.querySelector('#chat-close').addEventListener('click', () => toggle(false));
sendBtn.addEventListener('click', submit);
newBtn.addEventListener('click', () => newConversation(false));
delBtn.addEventListener('click', onDelete);
convoSelect.addEventListener('change', () => switchConversation(convoSelect.value));

topicsBtn.addEventListener('click', () => {
    const show = topicsPane.hidden;
    topicsPane.hidden = !show;
    topicsBtn.setAttribute('aria-expanded', String(show));
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});

input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (streamCtl) { streamCtl.finish(); return; }
    if (delBtn.classList.contains('confirm')) { resetConfirm(); return; }
    if (!topicsPane.hidden) { closeTopics(); return; }
    if (panel.classList.contains('open')) toggle(false);
});
