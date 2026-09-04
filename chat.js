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
           "- Who he is, his mechanical engineering route into software\n" +
           "- Experience level and how he works\n" +
           "- Where he is heading: physical AI, sim-to-real\n" +
           "## Skills\n" +
           "- Languages: C++ vs Python and when he uses each\n" +
           "- Navigation: Nav2, SLAM, AMCL, Cartographer\n" +
           "- Perception: LiDAR, PCL, OpenCV, sensor fusion\n" +
           "- Manipulation, control, ML/DL\n" +
           "## Projects\n" +
           "- All four at once, or any one by name\n" +
           "- Go2 perception · MoveIt2 pick & place · TF explorer · Fleet monitoring\n" +
           "## Contact\n" +
           "- Email, GitHub, LinkedIn\n\n" +
           "Ask in plain English. Add the word \"detail\" to any question and I will go long.",
        next: ['Explain each project in detail', 'What is his experience?', 'C++ or Python?', 'How do I contact him?'],
    },
    {
        id: 'greeting',
        label: null,
        k: ['hi', 'hello', 'hey', 'yo', 'howdy', 'good morning', 'good evening', 'good afternoon'],
        weight: 0.5,
        a: "Hi. I am the assistant for this portfolio — I answer questions about Aung Kaung Myat, a robotics software engineer working on ROS2 autonomy and moving toward physical AI.\n\n" +
           "Good places to start:\n" +
           "- His background and experience\n" +
           "- His stack — navigation, perception, manipulation, ML\n" +
           "- Any of the four projects, individually or all at once\n" +
           "- How to reach him\n\n" +
           "Ask \"what can I ask you?\" for the full list.",
        next: ['Who is he?', 'What is his experience?', 'Explain each project', 'How do I contact him?'],
    },
    {
        id: 'who',
        label: 'Who is he?',
        ask: 'Who is Aung Kaung Myat?',
        k: ['who', 'about him', '!about aung', 'background', 'yourself', 'introduce', 'bio', 'summary', 'profile', 'himself'],
        a: "Aung Kaung Myat is a robotics software engineer with a mechanical engineering background — he came to software from the hardware side, and it shows in how he works: kinematics, sensors and real robot behaviour first, code second.\n\n" +
           "He builds autonomous mobile robots and manipulation systems on ROS2, covering navigation, localization, sensor integration and deployment on real hardware rather than simulation alone.\n\n" +
           "His direction is physical AI: sim-to-real transfer, legged robotics, and perception for robots operating in unstructured environments.",
        deep: "## Short version\n" +
           "Robotics software engineer. Mechanical engineering background. ROS2 autonomy — navigation, perception, manipulation — with real hardware deployment, moving toward physical AI.\n\n" +
           "## The route in\n" +
           "He started in mechanical engineering, not computer science. That order matters: he understands the machine — kinematics, sensors, actuation, how things actually fail — before he writes the node that drives it. Robotics people who arrive purely from software usually learn that part last, if at all.\n\n" +
           "## What he builds\n" +
           "Autonomous mobile robots and manipulation systems on ROS2. Navigation and localization, sensor integration, LiDAR perception, motion planning — and the deployment step onto physical hardware, which is where most simulation-only work falls over.\n\n" +
           "## Where he is going\n" +
           "Physical AI: sim-to-real transfer, legged robotics, and perception that survives unstructured environments instead of clean test setups. The four projects on this page are deliberately spread across the stack to build toward that.",
        next: ['What is his experience?', 'What is he aiming for?', 'What is his stack?', 'Explain each project'],
    },
    {
        id: 'experience',
        label: 'Experience',
        ask: 'What is his experience?',
        k: ['experience', 'exp', 'years', 'career', 'worked', 'work history', 'job', 'jobs', 'role', 'roles', 'seniority', 'senior', 'junior', 'employment', 'history', 'professional'],
        a: "Early-career robotics software engineer, working professionally on ROS2 systems — autonomous mobile robots, perception, and deployment onto real hardware.\n\n" +
           "The mechanical engineering degree is the foundation; the software was built around real robots rather than coursework. Day to day that means ROS2 in C++ and Python on Linux, with Nav2, SLAM, PCL and MoveIt2.\n\n" +
           "The four projects on this page are self-directed engineering work, not tutorial follow-alongs — each one exists to prove out a specific competency end to end.\n\n" +
           "For dates, employers and role specifics, email him: " + EMAIL,
        deep: "## Level\n" +
           "Early career, and honest about it. What he has is depth in a narrow band rather than a long list of years.\n\n" +
           "## What the day job looks like\n" +
           "ROS2 systems work: autonomous mobile robots, perception pipelines, and getting software onto physical machines. C++ and Python on Linux, with Nav2, SLAM, PCL and MoveIt2 as the working toolset.\n\n" +
           "## Why the mechanical background counts\n" +
           "He debugs from the hardware end. When a robot misbehaves the question is not only \"which node is wrong\" but \"is this a sensor mount, a frame definition, a controller limit, or genuinely the code\" — and that instinct is difficult to teach.\n\n" +
           "## What the projects prove\n" +
           "- Go2 Perception Pipeline — C++ point-cloud processing at the sensor layer\n" +
           "- MoveIt2 Pick & Place — planning and recovery under failure, with numbers attached\n" +
           "- TF Transform Explorer — the ROS2 internals most people avoid: TF trees, custom messages, Nav2 plugins\n" +
           "- Fleet Monitoring — the infrastructure layer: Kafka, time-series storage, Docker\n\n" +
           "Together they cover sensor → perception → planning → control → fleet infrastructure. That spread is the point.\n\n" +
           "## What is not on this page\n" +
           "Employers, dates, and specific role scope. Email " + EMAIL + " for the CV.",
        next: ['Explain each project in detail', 'What is his strongest project?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'goal',
        label: 'Career direction',
        ask: 'What is he aiming for?',
        k: ['goal', 'goals', 'focus', 'future', 'direction', '!physical ai', '!sim-to-real', '!sim to real', 'aiming', 'aim', 'next', 'looking for', 'interested', 'ambition', 'want', '!legged'],
        a: "Current focus is the ROS2 autonomy stack: Nav2 and localization, LiDAR perception with PCL, manipulation with MoveIt2, and simulation in Gazebo.\n\n" +
           "The target is physical AI — shipping learned behaviour onto real machines. Concretely: sim-to-real transfer, legged robotics, and perception that holds up in unstructured environments rather than clean test setups.\n\n" +
           "That is why the projects lean toward complete pipelines on real or simulated hardware instead of isolated algorithms.",
        deep: "## Now\n" +
           "The ROS2 autonomy stack, end to end:\n" +
           "- Navigation and localization — Nav2, SLAM, AMCL, Cartographer\n" +
           "- LiDAR perception and PCL\n" +
           "- Robot manipulation with MoveIt2\n" +
           "- Simulation in Gazebo\n\n" +
           "## Next\n" +
           "Physical AI — getting learned behaviour to run on real machines rather than in a notebook. The three pieces he is aiming at:\n" +
           "- Sim-to-real transfer: closing the gap between a policy that works in simulation and one that works on hardware\n" +
           "- Legged robotics: the Go2 perception work is the first step in that direction\n" +
           "- Perception in unstructured environments, where the scene is not staged and the sensor data is not clean\n\n" +
           "## Why the portfolio looks the way it does\n" +
           "Each project is a full pipeline rather than one clever algorithm, because sim-to-real is a systems problem. The failure usually lives in the seams — frames, timing, sensor noise, recovery behaviour — not in the model.",
        next: ['What is his stack?', 'Tell me about the Go2 perception project', 'What is his experience?', 'How do I contact him?'],
    },
    {
        id: 'languages',
        label: 'C++ or Python?',
        ask: 'C++ or Python — which does he use?',
        k: ['language', 'languages', '!c++', '!cpp', '!python', 'coding', 'programming', 'code', 'linux', 'os'],
        a: "Both, on ROS2 under Linux, and the split is deliberate.\n\n" +
           "C++ is the default for production nodes and anything performance-critical — the Go2 LiDAR perception pipeline and the TF2/Nav2 plugin work are both C++.\n\n" +
           "Python is for perception experiments, ML and prototyping — the MoveIt2 pick-and-place demo and the fleet telemetry pipeline sit there.\n\n" +
           "Rule of thumb he works to: real-time and edge code in C++, research and glue in Python.",
        deep: "## The split\n" +
           "- C++ — production nodes, real-time paths, anything performance-critical or destined for an edge device\n" +
           "- Python — perception research, ML, orchestration, prototyping\n" +
           "- Linux throughout; ROS2 as the runtime for both\n\n" +
           "## Where that shows in the projects\n" +
           "- Go2 Perception Pipeline — C++. Point-cloud filtering runs per LiDAR frame, so it belongs in C++ with PCL.\n" +
           "- TF Transform Explorer — C++. TF2 broadcasters, a custom message type, and a Nav2 costmap plugin loaded through pluginlib; plugin interfaces are C++ territory.\n" +
           "- MoveIt2 Pick & Place — Python. The value is in planning strategy and the recovery state machine, not in per-frame throughput.\n" +
           "- Fleet Monitoring — Python. Glue between ROS2, Kafka and QuestDB, where iteration speed beats microseconds.\n\n" +
           "## Beyond the two\n" +
           "PyTorch and TensorFlow for ML/DL, OpenCV and PCL for vision and point clouds, Docker for packaging.",
        next: ['What is his stack?', 'Tell me about the TF Transform Explorer project', 'Does he do ML?', 'What is his experience?'],
    },
    {
        id: 'stack',
        label: 'Full technical stack',
        ask: 'What is his full technical stack?',
        k: ['stack', 'skill', 'skills', 'tech', 'technology', 'technologies', 'tools', 'toolset', 'know', 'knows', 'good at', 'expertise', 'competencies', 'capable'],
        a: "## Core\n" +
           "ROS2 (Humble) · C++ · Python · Linux\n" +
           "## Navigation\n" +
           "Nav2 · SLAM · AMCL · GMapping · Cartographer\n" +
           "## Perception\n" +
           "LiDAR · IMU · Camera · OpenCV · PCL · Sensor fusion\n" +
           "## Manipulation\n" +
           "MoveIt · Trajectory planning · Motion control\n" +
           "## ML / DL\n" +
           "PyTorch · TensorFlow · CNN · YOLO · Object detection\n" +
           "## Control\n" +
           "PID controllers · Path planning · State machines\n\n" +
           "The through-line is the whole autonomy loop — sensor in, perception, planning, control, motion out — plus the infrastructure to run it: Docker, Kafka, time-series storage.",
        deep: "## Core\n" +
           "ROS2 Humble, C++, Python, Linux. ROS2 is the runtime for everything below.\n" +
           "## Navigation\n" +
           "Nav2 for the planning and control stack; SLAM with GMapping and Cartographer for mapping; AMCL for localization against a known map. He has also written a Nav2 costmap plugin, which means working inside Nav2's interfaces rather than only configuring it.\n" +
           "## Perception\n" +
           "LiDAR, IMU and camera, fused. OpenCV for image work, PCL for point clouds — filtering, ground removal, obstacle extraction.\n" +
           "## Manipulation\n" +
           "MoveIt for motion planning, trajectory generation and execution, including constraint-based planning and velocity scaling on a 7-DOF arm.\n" +
           "## ML / DL\n" +
           "PyTorch and TensorFlow, CNNs, YOLO for object detection. This is the bridge toward the physical AI direction.\n" +
           "## Control\n" +
           "PID, path planning, and state machines — the last one matters more than it sounds, because robust robot behaviour is mostly a well-designed FSM with real recovery states.\n" +
           "## Infrastructure\n" +
           "Docker, Kafka, QuestDB, Gazebo. Enough to stand up a fleet, not only a single robot.",
        next: ['Explain each project in detail', 'What about navigation and SLAM?', 'What about perception?', 'C++ or Python?'],
    },
    {
        id: 'navigation',
        label: 'Navigation & SLAM',
        ask: 'What is his navigation and SLAM experience?',
        k: ['navigation', 'navigate', '!nav2', '!slam', '!amcl', '!gmapping', '!cartographer', '!localization', '!localisation', 'mapping', '!costmap', 'path planning', 'planner', '!keepout', 'patrol', 'autonomous mobile'],
        a: "Navigation is one of his core areas: Nav2 for the planning and control stack, SLAM with GMapping and Cartographer for mapping, and AMCL for localization against a known map.\n\n" +
           "He does not only configure Nav2 — the TF Transform Explorer project ships a custom costmap plugin loaded through pluginlib that implements keepout zones the planner must respect, plus an autonomous patrol behaviour with random goal generation and recovery when navigation fails.\n\n" +
           "Underneath that sits TF2: dynamic and static broadcasters, and a custom TFDiagnostics message so transform health is a monitorable topic rather than something you debug by eye.",
        deep: "## The stack he uses\n" +
           "- Nav2 — the planning and control stack: global and local planners, behaviour trees, recovery behaviours\n" +
           "- SLAM — GMapping and Cartographer for building maps\n" +
           "- AMCL — particle-filter localization against a known map\n" +
           "- TF2 underneath all of it, because navigation is a frame problem before it is a planning problem\n" +
           "## Beyond configuration\n" +
           "Most people list Nav2 because they have tuned a YAML file. The TF Transform Explorer project goes further: it ships a costmap plugin loaded through pluginlib that implements keepout zones the planner must respect. Writing a costmap layer means working inside Nav2's C++ interfaces, not around them.\n" +
           "## Behaviour, not just paths\n" +
           "The same project adds autonomous patrol with random goal generation and recovery when navigation fails. Recovery is the part that separates a demo from something that runs unattended — a robot that cannot recover is a robot someone has to babysit.\n" +
           "## Diagnostics\n" +
           "A custom TFDiagnostics message publishes transform health as a topic. When a navigation stack misbehaves, the cause is very often a stale or missing transform, and this makes that visible instead of guesswork.",
        next: ['Tell me about the TF Transform Explorer project', 'What about perception?', 'What is his stack?', 'What is his experience?'],
    },
    {
        id: 'perception',
        label: 'Go2 Perception Pipeline',
        ask: 'Tell me about the Go2 perception project',
        k: ['perception', '!lidar', '!pcl', '!point cloud', '!pointcloud', 'obstacle', '!quadruped', 'sensing', 'sensor', 'sensors', '!go2', '!unitree', '!passthrough', '!ground plane', 'rviz', '!opencv', 'camera', 'imu', 'fusion'],
        a: "## Go2 Perception Pipeline — C++, ROS2, PCL, Unitree Go2\n" +
           "A custom LiDAR perception pipeline for the Unitree Go2 quadruped in Gazebo.\n\n" +
           "- Raw LiDAR scans are ground-plane filtered with a PCL PassThrough filter, so only genuine obstacle returns survive\n" +
           "- The cleaned obstacle cloud is republished for downstream planning\n" +
           "- RViz shows raw and filtered clouds side by side, which makes the filter's effect measurable rather than assumed\n" +
           "- Teleop-ready in a custom world, so the robot can be driven through obstacles while the pipeline runs\n\n" +
           "Demonstrates: C++ point-cloud processing, PCL filter chains, and ROS2 topic design for perception.\n\n" +
           "Broader perception stack: LiDAR, IMU and camera with sensor fusion, OpenCV for images, PCL for clouds.",
        deep: "## Go2 Perception Pipeline — C++, ROS2, PCL, Unitree Go2\n" +
           "A custom LiDAR perception pipeline for the Unitree Go2 quadruped, running in Gazebo.\n" +
           "## The pipeline\n" +
           "- Raw LiDAR scans arrive as point clouds on a ROS2 topic\n" +
           "- A PCL PassThrough filter removes the ground plane, so the floor stops being reported as an obstacle\n" +
           "- The remaining cloud — genuine obstacle returns only — is republished for downstream planning\n" +
           "- RViz displays raw and filtered clouds side by side, so the filter's effect is measurable rather than assumed\n" +
           "- A custom Gazebo world and teleop support mean the robot can be driven through obstacles while the pipeline runs\n" +
           "## Why it is written in C++\n" +
           "Point-cloud filtering runs on every LiDAR frame. That is a per-frame budget, not a background task, so it belongs in C++ with PCL rather than in Python.\n" +
           "## The wider perception stack\n" +
           "- Sensors: LiDAR, IMU, camera, with sensor fusion across them\n" +
           "- Libraries: PCL for point clouds, OpenCV for images\n" +
           "- ML side: CNNs and YOLO for object detection\n" +
           "## Why this project in particular\n" +
           "A quadruped is the natural first step toward the legged robotics and physical AI direction he is aiming at.",
        next: ['What about navigation and SLAM?', 'Explain each project in detail', 'C++ or Python?', 'What is he aiming for?'],
    },
    {
        id: 'manipulation',
        label: 'MoveIt2 Pick & Place',
        ask: 'Tell me about the MoveIt2 pick and place project',
        k: ['!moveit', '!moveit2', '!manipulation', 'manipulator', 'arm', 'pick', 'place', '!panda', '!franka', '!grasp', '!gripper', '!ompl', 'trajectory', 'dof', 'kinematics', '7-dof'],
        a: "## MoveIt2 Pick & Place Demo — Python, MoveIt2, ROS2, Franka Panda\n" +
           "A 7-DOF Franka Panda arm running full pick-and-place with OMPL motion planning and constraint-based execution.\n\n" +
           "- ±1 cm positioning accuracy\n" +
           "- Above 95% success rate, achieved through multi-attempt fallback rather than one optimistic plan\n" +
           "- Production-grade safety: action-server verification before execution, velocity and acceleration scaling, graceful recovery\n\n" +
           "The part worth noticing is the failure handling. A failed grasp recovers and resumes instead of ending the run — that is the difference between a demo and something you would let near real hardware.\n\n" +
           "Demonstrates: MoveIt2 planning pipelines, robust FSM design, and treating failure paths as first-class.",
        deep: "## MoveIt2 Pick & Place Demo — Python, MoveIt2, ROS2, Franka Panda\n" +
           "A 7-DOF Franka Panda arm executing complete pick-and-place cycles.\n" +
           "## Planning\n" +
           "- OMPL as the motion planner\n" +
           "- Constraint-based execution, so the plan respects pose and path constraints rather than only reaching the goal\n" +
           "- Velocity and acceleration scaling, which is what keeps a 7-DOF arm from moving faster than its situation allows\n" +
           "## The numbers\n" +
           "- ±1 cm positioning accuracy\n" +
           "- Above 95% success rate\n" +
           "The success rate is the interesting one. It does not come from a better planner; it comes from multi-attempt fallback — when a plan or an execution fails, the system tries again with a different strategy instead of aborting.\n" +
           "## Production hardening\n" +
           "- Action-server verification before anything is commanded, so the node fails loudly at startup rather than silently at runtime\n" +
           "- Graceful recovery: a failed grasp returns the arm to a known state and the run resumes\n" +
           "- Failure paths designed first, not bolted on\n" +
           "## What it says about him\n" +
           "Most pick-and-place demos work once, on video. This one is built around the assumption that things fail — which is the only assumption that survives contact with real hardware.",
        next: ['Explain each project in detail', 'What about navigation and SLAM?', 'What is his experience?', 'How do I contact him?'],
    },
    {
        id: 'tf',
        label: 'TF Transform Explorer',
        ask: 'Tell me about the TF Transform Explorer project',
        k: ['!tf', '!tf2', '!transform', '!transforms', '!pluginlib', 'frame', 'frames', '!tfdiagnostics', 'diagnostics', '!broadcaster', '!broadcasters'],
        a: "## TF Transform Explorer — C++, TF2, Nav2, pluginlib\n" +
           "A TF2 frame transformation system with both dynamic and static broadcasters.\n\n" +
           "- Custom TFDiagnostics message type, so transform health is published as a topic and can be monitored instead of eyeballed\n" +
           "- Nav2 costmap plugin loaded through pluginlib, implementing keepout zones the planner has to respect\n" +
           "- Autonomous patrol behaviour with random goal generation and recovery when navigation fails\n\n" +
           "Demonstrates: real depth in the TF tree, writing custom ROS2 message types, and extending Nav2 through its plugin interfaces rather than working around them.\n\n" +
           "This is the least glamorous project on the page and probably the most telling one — TF bugs are where most ROS2 systems quietly break.",
        deep: "## TF Transform Explorer — C++, TF2, Nav2, pluginlib\n" +
           "The parts of ROS2 that most portfolios skip.\n" +
           "## Transforms\n" +
           "- Both dynamic and static TF2 broadcasters, so the frame tree covers moving joints and fixed mounts correctly\n" +
           "- A custom TFDiagnostics message type, publishing transform health as a topic\n" +
           "That second point matters more than it sounds. TF failures are usually silent: a stale transform, a missing frame, a clock skew. Turning that into a monitored topic converts a debugging session into an alert.\n" +
           "## Nav2 extension\n" +
           "- A costmap plugin loaded through pluginlib, implementing keepout zones the planner is required to respect\n" +
           "- Written against Nav2's C++ plugin interface, which is a different skill from tuning Nav2 parameters\n" +
           "## Autonomous behaviour\n" +
           "- Patrol behaviour with random goal generation\n" +
           "- Recovery behaviour when navigation fails, so the robot keeps operating instead of stopping\n" +
           "## Why it is worth attention\n" +
           "This is the least visually impressive project on the page and probably the most diagnostic one. Writing a custom message type and a pluginlib plugin means he has read ROS2's interfaces rather than only its tutorials.",
        next: ['What about navigation and SLAM?', 'Explain each project in detail', 'C++ or Python?', 'What is his experience?'],
    },
    {
        id: 'fleet',
        label: 'Fleet Monitoring System',
        ask: 'Tell me about the fleet monitoring project',
        k: ['fleet', '!kafka', '!docker', 'container', 'containerized', 'containerised', '!telemetry', 'database', '!questdb', 'postgres', '!postgresql', 'infra', 'infrastructure', 'monitoring', 'dashboard', 'multi-robot', 'multi robot', '!turtlebot', '!turtlebot3', 'devops', 'time-series', 'time series', 'scale'],
        a: "## Fleet Monitoring System — Python, ROS2, Kafka, Docker, QuestDB\n" +
           "A distributed multi-robot telemetry pipeline: ROS2 topics feed Kafka, Kafka feeds QuestDB as a time-series store.\n\n" +
           "- Simulates production fleet infrastructure with multiple TurtleBot3 robots running at once in Gazebo\n" +
           "- Fully containerised with Docker\n" +
           "- Real-time dashboard reading from QuestDB over the PostgreSQL wire protocol\n\n" +
           "Demonstrates: he can build the layer around the robots — message brokers, time-series storage, containerised deployment — not just the robot software. That is the difference between one working robot and a fleet you can actually operate.",
        deep: "## Fleet Monitoring System — Python, ROS2, Kafka, Docker, QuestDB\n" +
           "A distributed multi-robot telemetry pipeline — the infrastructure a fleet needs, rather than the software on one robot.\n" +
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
           "The whole stack is containerised with Docker — brokers, database, dashboard and ROS2 nodes — which makes it reproducible instead of a machine-specific setup.\n" +
           "## What it demonstrates\n" +
           "That he can build the layer around the robots. One working robot is a project; a fleet you can observe and operate is a product.",
        next: ['Explain each project in detail', 'What is his stack?', 'What is his experience?', 'How do I contact him?'],
    },
    {
        id: 'ml',
        label: 'ML / deep learning',
        ask: 'Does he do machine learning?',
        k: ['ml', '!machine learning', '!deep learning', 'dl', 'neural', '!pytorch', '!tensorflow', '!cnn', '!yolo', '!object detection', 'detection', 'ai', 'model', 'training', 'inference', 'vision'],
        a: "Yes, and it is pointed at robotics rather than at benchmarks.\n\n" +
           "- PyTorch and TensorFlow\n" +
           "- CNNs and YOLO for object detection\n" +
           "- Classical vision alongside it: OpenCV, PCL, sensor fusion\n\n" +
           "This is the bridge to his stated direction — physical AI, meaning learned behaviour running on real machines: sim-to-real transfer, legged robotics, and perception in unstructured environments.\n\n" +
           "The projects on this page are currently classical robotics rather than learned policies; the ML sits in the skill stack and in where he is heading.",
        deep: "## What he has\n" +
           "- PyTorch and TensorFlow\n" +
           "- CNNs and YOLO for object detection\n" +
           "- Classical vision alongside the learned side: OpenCV, PCL, sensor fusion\n" +
           "## How it fits the robotics work\n" +
           "The four projects on this page are classical robotics — filters, planners, state machines, infrastructure. The ML sits in the skill stack and in the direction he is heading, rather than in a shipped learned policy.\n" +
           "That is worth stating plainly instead of overselling: he has the ML toolset, and the robotics systems experience to know where a model actually goes in a pipeline.\n" +
           "## Where it is going\n" +
           "His stated direction is physical AI — learned behaviour running on real machines:\n" +
           "- Sim-to-real transfer: closing the gap between a policy that works in simulation and one that survives hardware\n" +
           "- Legged robotics, which the Go2 perception work already touches\n" +
           "- Perception in unstructured environments, where the data is not clean and the scene is not staged\n" +
           "## The honest framing\n" +
           "Strong classical robotics foundation, ML tooling in place, moving deliberately toward learned control. Not a research ML engineer, and not claiming to be.",
        next: ['What is he aiming for?', 'What about perception?', 'What is his stack?', 'How do I contact him?'],
    },
    {
        id: 'control',
        label: 'Control & simulation',
        ask: 'What control and simulation experience does he have?',
        k: ['control', 'controller', '!pid', '!state machine', 'fsm', '!gazebo', 'simulation', 'simulator', 'sim', '!rviz', 'motion control'],
        a: "## Control\n" +
           "PID controllers, path planning, and state machines. The FSM part is underrated — the MoveIt2 project's above-95% success rate comes from a state machine with real recovery states, not from a better planner.\n\n" +
           "## Simulation\n" +
           "Gazebo is the main environment: the Go2 perception pipeline runs there with a custom world, and the fleet project simulates multiple TurtleBot3 robots simultaneously. RViz is used throughout for visualising raw versus processed data.\n\n" +
           "Simulation is treated as a step toward hardware, not a destination — the stated goal is sim-to-real transfer.",
        next: ['Tell me about the MoveIt2 pick and place project', 'What is he aiming for?', 'What is his stack?', 'Explain each project'],
    },
    {
        id: 'projects',
        label: 'All four projects',
        ask: 'Explain each project in detail',
        k: ['project', 'projects', 'portfolio', 'built', 'build', 'repo', 'repos', 'repository', 'github', 'work on', 'works on', 'showcase', 'made', 'demos'],
        weight: 0.9,
        a: "Four projects, each aimed at a different layer of the robotics stack:\n\n" +
           "1. Go2 Perception Pipeline — C++, PCL. Ground-plane removal producing clean obstacle clouds for a quadruped.\n" +
           "2. MoveIt2 Pick & Place — Python, Franka Panda. OMPL planning, ±1 cm, >95% success with fallback.\n" +
           "3. TF Transform Explorer — C++, TF2, Nav2. Custom diagnostics message and a costmap keepout plugin.\n" +
           "4. Fleet Monitoring System — ROS2 → Kafka → QuestDB, containerised, live dashboard.\n\n" +
           "Ask about any one by name, or say \"explain each project in detail\" for the full breakdown. Every card above links to its repository.",
        deep: "Four projects, each aimed at a different layer of the robotics stack.\n\n" +
           "## 1 · Go2 Perception Pipeline — C++, ROS2, PCL, Unitree Go2\n" +
           "Custom LiDAR perception for a quadruped in Gazebo.\n" +
           "- Ground-plane removal with a PCL PassThrough filter, so only genuine obstacle returns survive\n" +
           "- Clean obstacle clouds republished for downstream planning\n" +
           "- RViz shows raw versus filtered side by side, making the filter's effect measurable\n" +
           "- Teleop-ready in a custom world\n" +
           "Demonstrates: C++ point-cloud processing, PCL filter chains, perception topic design.\n\n" +
           "## 2 · MoveIt2 Pick & Place — Python, MoveIt2, Franka Panda\n" +
           "A 7-DOF arm doing full pick-and-place.\n" +
           "- OMPL motion planning with constraint-based execution\n" +
           "- ±1 cm positioning accuracy, >95% success via multi-attempt fallback\n" +
           "- Action-server verification, velocity and acceleration scaling, graceful recovery\n" +
           "Demonstrates: MoveIt2 pipelines, robust FSM design, failure paths treated as first-class.\n\n" +
           "## 3 · TF Transform Explorer — C++, TF2, Nav2, pluginlib\n" +
           "The ROS2 internals most people avoid.\n" +
           "- Dynamic and static TF2 broadcasters\n" +
           "- Custom TFDiagnostics message type, making transform health a monitorable topic\n" +
           "- Nav2 costmap plugin via pluginlib implementing keepout zones\n" +
           "- Autonomous patrol with random goal generation and recovery behaviour\n" +
           "Demonstrates: TF tree depth, custom ROS2 messages, extending Nav2 through its plugin API.\n\n" +
           "## 4 · Fleet Monitoring System — Python, ROS2, Kafka, Docker, QuestDB\n" +
           "The infrastructure layer around a fleet.\n" +
           "- ROS2 → Kafka → QuestDB time-series pipeline\n" +
           "- Multiple TurtleBot3 robots simulated at once in Gazebo\n" +
           "- Fully containerised; real-time dashboard over the PostgreSQL wire protocol\n" +
           "Demonstrates: message brokers, time-series storage, containerised deployment.\n\n" +
           "## Why these four\n" +
           "Sensor → perception → planning → control → fleet infrastructure. Deliberately spread across the stack rather than four variations on one idea. Every card above links to its repository.",
        next: ['What is his strongest project?', 'Tell me about the MoveIt2 pick and place project', 'What is his stack?', 'How do I contact him?'],
    },
    {
        id: 'strongest',
        label: 'Strongest work',
        ask: 'What is his strongest project?',
        k: ['!strongest', 'best', 'favourite', 'favorite', 'impressive', 'highlight', 'proudest', 'standout', 'stand out', '!why hire', '!why him', '!hire him', '!should we hire', '!worth hiring', '!good fit', 'differentiator', 'unique'],
        weight: 1.2,
        a: "Depends what you are hiring for, and the honest read is this:\n\n" +
           "- Hardest engineering — MoveIt2 Pick & Place. It has real numbers attached (±1 cm, >95% success) and the success rate comes from failure handling, not from a lucky planner.\n" +
           "- Most telling about ROS2 depth — TF Transform Explorer. Custom messages, a Nav2 costmap plugin through pluginlib, and TF diagnostics. Unglamorous, and exactly where most ROS2 systems quietly break.\n" +
           "- Widest scope — Fleet Monitoring System. Kafka, QuestDB and Docker around a multi-robot simulation; it shows he can build the layer around the robots.\n" +
           "- Closest to where he is heading — Go2 Perception Pipeline. C++ point-cloud work on a quadruped, which is the first step toward legged robotics and physical AI.\n\n" +
           "The common thread: a mechanical engineering background plus full-pipeline thinking, rather than one isolated algorithm.",
        next: ['Explain each project in detail', 'What is his experience?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'contact',
        label: 'Contact',
        ask: 'How do I contact him?',
        k: ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'recruit', 'recruiter', '!linkedin', 'cv', '!resume', 'talk', '!get in touch', 'available', 'availability', 'opportunity', 'opportunities', 'interview', 'apply'],
        a: "## Email — fastest route\n" + EMAIL + "\n" +
           "## GitHub\n" +
           "github.com/AungKaung1928 — all four projects are public\n" +
           "## LinkedIn\n" +
           "Linked in the Contact section above\n\n" +
           "For a CV, role details, availability, or anything this page does not cover, email is the right channel.",
        next: ['What is his experience?', 'Explain each project in detail', 'What is his stack?', 'Who is he?'],
    },
    {
        id: 'ros2',
        label: 'ROS2 depth',
        ask: 'How deep is his ROS2 knowledge?',
        k: ['!ros2', '!ros', '!humble', '!pluginlib', '!rclcpp', '!rclpy', 'node', 'nodes', 'topics', '!colcon', '!launch file', '!custom message', '!message type', 'interface', 'interfaces', '!action server', '!action servers', 'middleware', '!dds', '!workspace', '!package', '!packages'],
        a: "## ROS2 — Humble, in C++ and Python\n" +
           "He works inside ROS2's interfaces rather than only on top of them. Three concrete markers on this page:\n\n" +
           "- A custom message type, TFDiagnostics, defined and published as a topic so transform health is monitorable\n" +
           "- A Nav2 costmap plugin loaded through pluginlib, implementing keepout zones the planner has to respect\n" +
           "- Action-server verification before execution in the MoveIt2 project, so a missing controller fails at startup instead of mid-motion\n\n" +
           "Defining a message type and writing a pluginlib plugin is a different level from editing a YAML file — both require reading ROS2's own interfaces.\n\n" +
           "Also on the page: TF2 dynamic and static broadcasters, perception topic design (raw cloud in, filtered obstacle cloud out), and Gazebo integration with a custom world.",
        deep: "## The version and the languages\n" +
           "ROS2 Humble, written in both C++ and Python, on Linux. C++ for the nodes that run per sensor frame or plug into someone else's C++ interface; Python where iteration speed matters more.\n" +
           "## Where the depth actually shows\n" +
           "- Custom interfaces — a TFDiagnostics message type, generated and published as a topic. Most people consume standard messages; defining one means dealing with interface packages, build dependencies and the code generation step.\n" +
           "- pluginlib — a Nav2 costmap layer loaded as a plugin, implementing keepout zones. This is written against Nav2's C++ plugin API: you inherit from its layer class, respect its lifecycle, and get loaded by name at runtime.\n" +
           "- TF2 — dynamic and static broadcasters, so moving joints and fixed mounts are both represented correctly in the frame tree.\n" +
           "- Actions — the MoveIt2 project verifies its action server is up before commanding anything, which is the difference between a loud startup failure and a silent runtime one.\n" +
           "- Topic design — the Go2 pipeline subscribes to a raw cloud and republishes a filtered obstacle cloud, keeping the perception boundary clean for downstream planners.\n" +
           "## Where most portfolios stop\n" +
           "Launch files, parameter YAML, and a tutorial-shaped node. Those are present here too, but they are not the interesting part. The interesting part is that two of the four projects extend ROS2 through its extension points instead of working around them.\n" +
           "## What is not claimed\n" +
           "This page does not show real-time executors, DDS QoS tuning, or micro-ROS work. Ask by email if that is what the role needs.",
        next: ['Tell me about the TF Transform Explorer project', 'C++ or Python?', 'What is his stack?', 'How does he debug robot problems?'],
    },
    {
        id: 'simtoreal',
        label: 'Sim-to-real',
        ask: 'What about sim-to-real transfer?',
        k: ['!sim-to-real', '!sim to real', '!sim2real', '!reality gap', '!domain gap', '!simulation to reality', '!real world', '!transfer', '!does it work on real hardware'],
        weight: 1.3,
        a: "This is the direction he is aiming at, and the honest version matters more than the enthusiastic one.\n\n" +
           "## What is on this page\n" +
           "- Heavy simulation work: a custom Gazebo world for the Go2 perception pipeline, multiple TurtleBot3 robots running at once for the fleet project\n" +
           "- Professional work that includes deployment onto real hardware, not simulation alone\n" +
           "- A mechanical engineering background, which is where sim-to-real problems actually live: sensor mounting, actuator limits, friction, timing\n\n" +
           "## What is not on this page\n" +
           "A shipped sim-to-real result — a policy trained in simulation and measured on hardware. That is the stated goal, not a finished credential.\n\n" +
           "If a role turns on that specifically, email him: " + EMAIL,
        deep: "## Why he is pointed here\n" +
           "His stated career direction is physical AI: learned behaviour running on real machines. Sim-to-real transfer is the gate every one of those systems has to pass, and it is a systems problem rather than a model problem — the failure is usually in the seams: frames, latency, sensor noise, actuator saturation, contact.\n" +
           "## What the page supports today\n" +
           "- Simulation depth — a custom Gazebo world with teleop for the Go2 perception pipeline; several TurtleBot3 robots simulated concurrently in the fleet project. He builds environments, not just runs stock ones.\n" +
           "- Hardware exposure — the professional side of his work involves deployment onto real robots, which is where simulation-only engineers get caught out.\n" +
           "- The measurement habit — RViz raw versus filtered side by side, positioning accuracy in centimetres, success rate as a percentage. Sim-to-real without measurement is guesswork.\n" +
           "- A mechanical background — kinematics, sensors and failure modes of physical machines. The reality gap is mostly physics, and he read the physics first.\n" +
           "## What is honestly missing\n" +
           "- No trained policy on this page, in simulation or on hardware\n" +
           "- No domain randomisation, system identification or residual-policy work published here\n" +
           "- The four projects are classical robotics: filters, planners, state machines, infrastructure\n" +
           "So the accurate read is: strong classical foundation plus the hardware instinct sim-to-real needs, aimed deliberately at learned control, without a shipped learned result yet.\n" +
           "## The next step that would prove it\n" +
           "A policy trained in Gazebo and measured on a real machine, with the gap quantified rather than described. That is the missing artefact, and he would tell you the same.",
        next: ['What is he aiming for?', 'What legged robotics experience does he have?', 'Does he do machine learning?', 'What are the gaps in his experience?'],
    },
    {
        id: 'legged',
        label: 'Legged robotics',
        ask: 'What legged robotics experience does he have?',
        k: ['!legged', '!legged robotics', '!quadrupedal', '!four-legged', '!four legged', '!walking robot', '!gait', '!locomotion', '!dog robot'],
        a: "## What exists\n" +
           "The Go2 Perception Pipeline — a custom LiDAR perception pipeline for the Unitree Go2 quadruped, running in Gazebo. Ground-plane removal with a PCL PassThrough filter, clean obstacle clouds republished for planning, RViz showing raw versus filtered, teleop in a custom world.\n\n" +
           "## What that is and is not\n" +
           "It is perception for a legged platform: the sensing layer a walking robot needs before anything else works. It is not gait control, whole-body control, or a learned locomotion policy — none of that is on this page.\n\n" +
           "Legged robotics is one of the three things he names as his direction, and the Go2 work is the first deliberate step toward it rather than the finished article.",
        deep: "## The project\n" +
           "Go2 Perception Pipeline — C++, ROS2, PCL, Unitree Go2 in Gazebo.\n" +
           "- Raw LiDAR scans ground-plane filtered with a PCL PassThrough filter, so the floor stops being reported as an obstacle\n" +
           "- The surviving obstacle cloud republished on its own topic for downstream planning\n" +
           "- RViz displaying raw and filtered clouds side by side, which makes the filter's effect measurable rather than asserted\n" +
           "- A custom world with teleop, so the robot can be driven through obstacles while the pipeline runs\n" +
           "## Why perception first on a quadruped\n" +
           "A legged robot's hardest problem is knowing what is under and in front of it. Ground-plane removal is not a toy step for a walking platform: the floor is exactly what a wheeled-robot filter would treat as an obstacle, and exactly what a quadruped has to walk on. Getting the obstacle definition right is a prerequisite for anything above it.\n" +
           "## The honest boundary\n" +
           "- No gait or whole-body control on this page\n" +
           "- No reinforcement-learning locomotion policy\n" +
           "- The Go2 work is in simulation, not on the physical dog\n" +
           "## Why it is still the right first step\n" +
           "The stated direction is physical AI with legged robotics as one of three pillars. Starting at the sensing layer of a real quadruped platform, in C++, with a measurable result, is a more defensible entry than a rebuilt tutorial policy.",
        next: ['Tell me about the Go2 perception project', 'What about sim-to-real transfer?', 'What is he aiming for?', 'What are the gaps in his experience?'],
    },
    {
        id: 'hardware',
        label: 'Robots & sensors',
        ask: 'Which robots and sensors has he worked with?',
        k: ['!hardware', '!real robot', '!real robots', '!physical robot', '!physical hardware', '!which robots', '!what robots', '!robot platforms', '!platforms', '!actuator', '!actuators', '!motor', '!motors', '!sensor suite', '!sensors used', '!sensor stack', '!on real hardware'],
        a: "## Platforms named on this page\n" +
           "- Unitree Go2 quadruped — LiDAR perception pipeline, in Gazebo\n" +
           "- Franka Panda, 7-DOF arm — full pick-and-place with MoveIt2\n" +
           "- TurtleBot3, several at once — the fleet telemetry project, in Gazebo\n\n" +
           "## Sensors\n" +
           "LiDAR, IMU and camera, with sensor fusion across them. PCL for point clouds, OpenCV for images.\n\n" +
           "## The honest split\n" +
           "The four portfolio projects run in simulation. His professional work includes deployment onto real hardware — that is stated on the page, but the specific machines are not.\n\n" +
           "For the real-hardware detail, employers and dates, email him: " + EMAIL,
        deep: "## Platforms\n" +
           "- Unitree Go2 — a quadruped, used for the C++ LiDAR perception pipeline in a custom Gazebo world with teleop\n" +
           "- Franka Panda — a 7-DOF arm, used for OMPL-planned pick-and-place with constraint-based execution, velocity and acceleration scaling\n" +
           "- TurtleBot3 — multiple units simulated simultaneously, producing concurrent telemetry for the Kafka and QuestDB pipeline\n" +
           "## Sensors and the libraries around them\n" +
           "- LiDAR — point-cloud filtering, ground-plane removal, obstacle extraction with PCL\n" +
           "- IMU and camera, fused with the LiDAR data\n" +
           "- OpenCV for image work; CNNs and YOLO on the learned side of detection\n" +
           "## Simulation versus hardware, stated plainly\n" +
           "The projects on this page are simulated. That is a deliberate choice for a public portfolio — a simulated stack is reproducible by whoever is reading it, and every claim can be re-run.\n" +
           "The About section states that his professional work covers deployment on real hardware rather than simulation alone. The page does not name those robots, so neither will I.\n" +
           "## Why the mechanical background matters here\n" +
           "He came from mechanical engineering, so hardware is not an abstraction to him: mounting, alignment, actuator limits and mechanical failure modes are things he has designed around, not only read about. That is the part that decides whether working code survives contact with a real machine.\n" +
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
        a: "This is the strongest single thread through the portfolio: failure paths are designed, not bolted on.\n\n" +
           "- MoveIt2 pick & place — multi-attempt fallback rather than one optimistic plan, which is where the >95% success rate comes from. Action-server verification before execution, velocity and acceleration scaling, and a failed grasp that returns to a known state and resumes\n" +
           "- TF Transform Explorer — recovery behaviour when navigation fails, so an autonomous patrol keeps operating instead of stopping; plus TFDiagnostics, which turns silent transform failures into a monitorable topic\n" +
           "- Fleet Monitoring — Kafka between producers and consumers, so a slow or dead consumer does not take telemetry down with it\n\n" +
           "The pattern: assume it breaks, decide what happens next, and make the breakage visible.",
        deep: "## Why this is the thread worth following\n" +
           "Any demo works once. The difference between a demo and something that runs unattended is entirely in what happens when a step fails — and three of the four projects address that explicitly.\n" +
           "## MoveIt2 pick & place\n" +
           "- Multi-attempt fallback: when a plan or an execution fails, the system retries with a different strategy instead of aborting. The >95% success rate is a consequence of this, not of a better planner\n" +
           "- Action-server verification before anything is commanded, so a missing or unready controller fails loudly at startup rather than silently at runtime\n" +
           "- Velocity and acceleration scaling, keeping a 7-DOF arm inside limits its situation allows\n" +
           "- Graceful recovery: a failed grasp returns the arm to a known state and the run continues\n" +
           "## TF Transform Explorer\n" +
           "- Recovery behaviour when navigation fails, inside an autonomous patrol that generates its own goals — a robot that cannot recover is a robot someone has to babysit\n" +
           "- A custom TFDiagnostics message publishing transform health as a topic. TF failures are usually silent: a stale transform, a missing frame, clock skew. This converts a debugging session into an alert\n" +
           "- Keepout zones enforced in a costmap plugin, so a forbidden region is a planner constraint rather than an operator instruction\n" +
           "## Fleet Monitoring\n" +
           "- Kafka decouples producers from consumers, so a slow or failed consumer buffers instead of dropping telemetry\n" +
           "- Containerised deployment, which removes the whole class of failures that begin with \"it worked on my machine\"\n" +
           "## The underlying habit\n" +
           "Design the failure path first, make the failure observable, and give the system a defined next move. That habit transfers directly to hardware, where failure is not hypothetical.",
        next: ['Tell me about the MoveIt2 pick and place project', 'How does he debug robot problems?', 'What numbers can he back up?', 'How does he work?'],
    },
    {
        id: 'metrics',
        label: 'The numbers',
        ask: 'What numbers can he back up?',
        k: ['!metric', '!metrics', '!accuracy', '!success rate', '!numbers', '!measured', '!measurable', '!benchmark', '!benchmarks', '!precision', '!latency', '!throughput', '!fps', '!proof', '!evidence', '!quantify', '!quantified', '!results'],
        a: "## Published on this page\n" +
           "- ±1 cm positioning accuracy — MoveIt2 pick & place, 7-DOF Franka Panda\n" +
           "- Above 95% success rate — same project, achieved through multi-attempt fallback\n" +
           "- Multiple TurtleBot3 robots streaming telemetry concurrently — fleet project, so the pipeline is exercised with real concurrency rather than one stream\n" +
           "- Raw versus filtered point clouds shown side by side in RViz — the Go2 filter's effect is observable, not asserted\n\n" +
           "## Not published\n" +
           "Per-frame latency, CPU and memory budgets, throughput figures, and localisation error over a run. Those numbers are not on this page, so I will not invent them.\n\n" +
           "Every project links to its repository, and the code is the primary source. For measurements beyond the above, email " + EMAIL,
        deep: "## The numbers that exist\n" +
           "- ±1 cm positioning accuracy on the 7-DOF Franka Panda pick-and-place\n" +
           "- Above 95% success rate on the same task, with the mechanism named: multi-attempt fallback, not a luckier planner\n" +
           "- Concurrent multi-robot telemetry — several TurtleBot3 robots simulated at once through ROS2, Kafka and QuestDB\n" +
           "- A measurable perception result: RViz displays the raw and the ground-plane-filtered cloud together, so the filter's effect can be inspected rather than trusted\n" +
           "## Why those two numbers are the interesting ones\n" +
           "A success rate is only meaningful with its mechanism attached. \">95% via multi-attempt fallback\" tells you the system was built around failure; \">95%\" alone tells you nothing. Same for ±1 cm: it is a claim you can re-run from the linked repository.\n" +
           "## What is deliberately absent\n" +
           "- No per-frame latency or CPU budget for the C++ perception pipeline\n" +
           "- No localisation error figures for the navigation work\n" +
           "- No end-to-end throughput number for the telemetry pipeline\n" +
           "- No hardware-versus-simulation comparison\n" +
           "That is a real gap for a performance-critical role, and the right answer is to ask him rather than to read an implied number into the page.\n" +
           "## How to verify what is here\n" +
           "All four projects are public on github.com/AungKaung1928. The claims above are reproducible from the code and the launch setup.",
        next: ['Tell me about the MoveIt2 pick and place project', 'What are the gaps in his experience?', 'How does he handle failure and recovery?', 'How do I contact him?'],
    },
    {
        id: 'deployment',
        label: 'Deployment & packaging',
        ask: 'How does he deploy and package his work?',
        k: ['!deploy', '!deployment', '!deploying', '!packaging', '!containerised', '!containerized', '!reproducible', '!ship', '!shipping', '!ci', '!cd', '!build system', '!setup', '!install', '!run it', '!devops'],
        a: "## Packaging\n" +
           "The fleet monitoring stack is fully containerised with Docker — brokers, the time-series database, the dashboard and the ROS2 nodes. The whole system comes up as a unit rather than as a machine-specific ritual.\n\n" +
           "## Why that matters\n" +
           "A multi-robot telemetry stack has four or five moving services. Containerising it is the difference between a system somebody else can start and a system only its author can start.\n\n" +
           "## Around it\n" +
           "Linux throughout, ROS2 Humble as the runtime, Gazebo for simulation, and a real-time dashboard reading QuestDB over the PostgreSQL wire protocol — a deliberate choice to reuse standard tooling instead of writing a bespoke client.\n\n" +
           "Not on this page: CI pipelines, cross-compilation, or edge-device images. Ask by email if the role needs those.",
        deep: "## What is containerised\n" +
           "The Fleet Monitoring System runs as a Docker stack: Kafka as the broker, QuestDB as the time-series store, the dashboard, and the ROS2 nodes producing telemetry. Bringing the stack up is one operation, and it comes up the same way on someone else's machine.\n" +
           "## Why a portfolio project is the right place to prove this\n" +
           "Anyone reading the repository can run it. That is the actual test of reproducibility, and it is the reason the fleet project is containerised rather than documented with a list of manual steps.\n" +
           "## Interface choices worth noticing\n" +
           "- QuestDB spoken over the PostgreSQL wire protocol, so the dashboard uses a standard client instead of a custom one\n" +
           "- Kafka as the boundary between the robot network and everything downstream — ROS2's DDS transport is designed for a robot, not for a datacentre\n" +
           "- ROS2 packages and launch setups for the robot-side work, with Gazebo worlds committed alongside the code\n" +
           "## The runtime environment\n" +
           "Linux throughout, ROS2 Humble, C++ and Python. Nothing exotic, which is the point: the stack is standard enough that a team could adopt it.\n" +
           "## What is not claimed\n" +
           "- No CI/CD pipeline shown on this page\n" +
           "- No cross-compilation or edge-device image building\n" +
           "- No orchestration beyond Docker\n" +
           "Email " + EMAIL + " if a role depends on any of those.",
        next: ['Tell me about the fleet monitoring project', 'What is his stack?', 'How does he work?', 'What are the gaps in his experience?'],
    },
    {
        id: 'debug',
        label: 'How he debugs',
        ask: 'How does he debug robot problems?',
        k: ['!debug', '!debugging', '!troubleshoot', '!troubleshooting', '!diagnose', '!root cause', '!failure analysis', '!goes wrong', '!something breaks', '!find bugs', '!fix bugs', '!observability', '!monitoring health'],
        a: "Two habits show up repeatedly in the projects.\n\n" +
           "## Start at the hardware end\n" +
           "With a mechanical engineering background, the first question is not \"which node is wrong\" but \"is this a sensor mount, a frame definition, a controller limit — or genuinely the code\". That ordering saves the days most people lose.\n\n" +
           "## Make the invisible observable\n" +
           "- TFDiagnostics publishes transform health as a topic, because TF failures are silent by default\n" +
           "- RViz shows raw and filtered clouds side by side, so a filter's effect is inspected rather than assumed\n" +
           "- Action-server verification fails loudly at startup instead of silently at runtime\n\n" +
           "The theme: turn a debugging session into a signal you can watch.",
        deep: "## First principle — suspect the machine before the code\n" +
           "He came into software from mechanical engineering, and it shapes the debugging order. When a robot misbehaves the candidate list starts with sensor mounting, frame definitions, controller limits and timing — then the algorithm. Engineers who arrive purely from software usually work that list in the opposite order and lose days to it.\n" +
           "## Second principle — instrument the silent failures\n" +
           "- TF: a custom TFDiagnostics message publishes transform health as a topic. Stale transforms, missing frames and clock skew produce no error by themselves; a navigation stack simply behaves strangely. Publishing health converts that into something monitorable\n" +
           "- Perception: RViz renders the raw cloud and the ground-plane-filtered cloud together. The filter is then evaluated by looking at it, not by trusting the parameter\n" +
           "- Manipulation: the action server is verified before execution, so an unready controller is a startup failure rather than a mysterious mid-motion stop\n" +
           "- Fleet: telemetry from several robots lands in a time-series database with a live dashboard, which is what makes intermittent problems visible at all\n" +
           "## Third principle — a defined next move\n" +
           "Recovery behaviour after failed navigation, multi-attempt fallback after a failed grasp, and a return to a known state. Debugging is easier when the system's response to failure is deterministic instead of improvised.\n" +
           "## What that adds up to\n" +
           "Diagnostics as a first-class topic, comparisons rendered rather than argued, loud startup failures, and deterministic recovery. It is an unglamorous set of habits and it is exactly what separates a system that can be operated from one that has to be supervised.",
        next: ['How does he handle failure and recovery?', 'Tell me about the TF Transform Explorer project', 'How does he work?', 'What is his experience?'],
    },
    {
        id: 'kinematics',
        label: 'Kinematics & maths',
        ask: 'What is his kinematics and maths background?',
        k: ['!kinematics', '!inverse kinematics', '!forward kinematics', '!dynamics', '!maths', '!mathematics', '!math background', '!linear algebra', '!transform math', '!mechanical engineering', '!mech eng', '!mechanical background', '!rotation', '!quaternion', '!quaternions', '!frames math'],
        a: "## Where it comes from\n" +
           "A mechanical engineering degree first, software afterwards. Kinematics, statics and machine behaviour were the original subject — not a library he picked up later.\n\n" +
           "## Where it is applied on this page\n" +
           "- A 7-DOF Franka Panda arm: OMPL motion planning, constraint-based execution, trajectory planning, velocity and acceleration scaling\n" +
           "- TF2 frame trees with dynamic and static broadcasters — rigid-body transforms as a working tool rather than a diagram\n" +
           "- PCL point-cloud geometry: ground-plane filtering, obstacle extraction\n" +
           "- PID control and path planning\n\n" +
           "The practical value: when a robot's pose is wrong, he can tell a frame error from a planner error from a mechanical one.",
        deep: "## The origin\n" +
           "Mechanical engineering was the degree; robotics software came after. So kinematics, rigid-body motion and the physical limits of machines are foundational for him rather than borrowed vocabulary.\n" +
           "## Applied — manipulation\n" +
           "A 7-DOF arm is a genuine kinematics problem: redundant degrees of freedom, joint limits, and a planner that has to respect both. The MoveIt2 project uses OMPL with constraint-based execution and scales velocity and acceleration, which means working with the arm's dynamic limits and not only its geometry.\n" +
           "## Applied — transforms\n" +
           "TF2 broadcasters, dynamic and static, with a diagnostics message for transform health. Every robotics pose bug is ultimately a transform composition problem; treating the frame tree as a first-class artefact is what makes those bugs findable.\n" +
           "## Applied — geometry on sensor data\n" +
           "Ground-plane removal with a PCL PassThrough filter, obstacle extraction from raw LiDAR returns. Point-cloud work is applied geometry with noise attached.\n" +
           "## Applied — control\n" +
           "PID controllers, path planning, and state machines to sequence them.\n" +
           "## Why this matters more than a maths module\n" +
           "The maths gets used where robots fail: a pose that is 16 cm off, a plan that clips a joint limit, a filter that removes the wrong plane. Coming from the mechanical side means the physical explanation is always a live hypothesis, not an afterthought.\n" +
           "## Not on this page\n" +
           "University, degree specifics and coursework. Email " + EMAIL + " for that.",
        next: ['Tell me about the MoveIt2 pick and place project', 'Who is he?', 'What about navigation and SLAM?', 'How does he debug robot problems?'],
    },
    {
        id: 'gaps',
        label: 'Limits & gaps',
        ask: 'What are the gaps in his experience?',
        k: ['!weakness', '!weaknesses', '!gap', '!gaps', '!limitation', '!limitations', '!missing', '!concern', '!concerns', '!red flag', '!red flags', '!downside', '!risk', '!risks', '!not done', '!blind spot', '!what he cannot', '!honest assessment'],
        weight: 1.2,
        a: "Straight answer, because a recruiter asking this deserves one.\n\n" +
           "- Early career. Depth in a narrow band, not a long track record\n" +
           "- The four portfolio projects run in simulation. His professional work involves real hardware, but that work is not documented on this page\n" +
           "- No shipped learned policy. Physical AI is the stated direction; the projects are classical robotics — filters, planners, state machines, infrastructure\n" +
           "- No published performance numbers: no latency, CPU or throughput figures\n" +
           "- Employers, dates and role scope are not on the page at all\n\n" +
           "What is genuinely strong: ROS2 internals — a custom message type and a pluginlib plugin — plus failure handling with numbers attached, and a mechanical background that makes hardware debugging natural.\n\n" +
           "For anything in the first list, email " + EMAIL,
        deep: "## The gaps, plainly\n" +
           "- Early career. The claim is depth in a narrow band, not seniority. He would say the same\n" +
           "- Simulation-weighted portfolio. Go2, Franka Panda and TurtleBot3 all appear in Gazebo. Real-hardware deployment is stated as part of his professional work but is not shown here\n" +
           "- No learned policy shipped. The direction is physical AI and sim-to-real, and the ML toolset is listed — PyTorch, TensorFlow, CNNs, YOLO — but no trained model appears in the four projects\n" +
           "- No performance figures. No per-frame latency for the C++ perception pipeline, no CPU or memory budget, no throughput number for the telemetry stack\n" +
           "- No employment detail on the page: no employers, no dates, no team size, no role scope\n" +
           "- Nothing published here on CI/CD, cross-compilation or edge-device deployment\n" +
           "## What that leaves genuinely strong\n" +
           "- ROS2 internals: a custom message type and a Nav2 costmap plugin through pluginlib — extension points, not configuration\n" +
           "- Failure handling as a design habit, with ±1 cm and >95% attached to it\n" +
           "- Breadth across the stack: sensor, perception, planning, control, fleet infrastructure\n" +
           "- A mechanical engineering foundation, which is the part that makes hardware debugging instinctive\n" +
           "## How to read the combination\n" +
           "Strong classical robotics engineer, early in the career, deliberately pointed at physical AI, with the systems instincts that direction needs and without the learned-control credential yet.\n" +
           "## What to ask him\n" +
           "Real-hardware scope, employers and dates, and any measurements beyond the two published numbers: " + EMAIL,
        next: ['What is his strongest project?', 'What about sim-to-real transfer?', 'What roles is he a fit for?', 'How do I contact him?'],
    },
    {
        id: 'fit',
        label: 'Role fit',
        ask: 'What roles is he a fit for?',
        k: ['!role fit', '!fit for', '!which role', '!what role', '!what kind of role', '!suited', '!suitable for', '!right role', '!job type', '!position', '!positions', '!team fit', '!where would he fit'],
        a: "## Direct fits\n" +
           "- Robotics software engineer on a ROS2 autonomy stack — navigation, localization, perception, manipulation\n" +
           "- Perception engineering at the sensor layer: LiDAR and point-cloud processing in C++\n" +
           "- Physical-AI-track roles where the team wants systems instincts now and learned control grown into\n" +
           "- Robot infrastructure adjacent work: telemetry, fleet observability, containerised deployment\n\n" +
           "## Poor fits\n" +
           "- ML research positions — the ML is a toolset here, not a publication record\n" +
           "- Pure cloud or web engineering\n" +
           "- Roles needing a long track record; he is early career and does not pretend otherwise\n\n" +
           "For scope, availability and the CV: " + EMAIL,
        deep: "## Where he lines up well\n" +
           "- ROS2 autonomy — Nav2, SLAM, AMCL, TF2, with plugin-level work rather than parameter tuning. He has written a costmap layer and a custom message type\n" +
           "- LiDAR and point-cloud perception in C++ — the Go2 pipeline is exactly this, per-frame filtering with PCL\n" +
           "- Manipulation with MoveIt2 — a 7-DOF arm, OMPL, constraints, velocity scaling, and a recovery-first state machine\n" +
           "- Physical AI as a growth track — the classical foundation and hardware instinct are in place; the learned-control experience is the part a team would be growing\n" +
           "- Robot-adjacent infrastructure — Kafka, QuestDB, Docker, live dashboards. Useful on a team that has robots but no telemetry layer\n" +
           "## Where he would be the wrong hire\n" +
           "- ML research or applied-science roles measured in publications and benchmark results\n" +
           "- Pure cloud, backend or web engineering — not what the page is about\n" +
           "- A senior or lead position requiring years of shipped hardware programmes\n" +
           "- A role needing an existing sim-to-real portfolio today rather than in a year\n" +
           "## The one-line version\n" +
           "Early-career robotics software engineer with unusual depth in ROS2 internals and failure design, a mechanical engineering foundation, and a deliberate trajectory toward physical AI.\n" +
           "## Next step\n" +
           "Email " + EMAIL + " for the CV, availability and role scope — none of that is published here.",
        next: ['What are the gaps in his experience?', 'What is his strongest project?', 'What is he aiming for?', 'How do I contact him?'],
    },
    {
        id: 'workstyle',
        label: 'How he works',
        ask: 'How does he work?',
        k: ['!how does he work', '!work style', '!workstyle', '!approach', '!process', '!methodology', '!philosophy', '!principles', '!way of working', '!engineering approach', '!habits', '!standards', '!code quality'],
        a: "Four habits are visible across the four projects.\n\n" +
           "- Full pipelines, not isolated algorithms. Every project runs end to end — sensor in, result out — because the interesting failures live in the seams\n" +
           "- Failure paths designed first. Multi-attempt fallback, recovery behaviours, action-server verification, graceful returns to a known state\n" +
           "- Make the effect measurable. Raw versus filtered clouds in RViz, ±1 cm, >95% success, telemetry into a time-series database\n" +
           "- Right language for the job. C++ for per-frame and plugin work, Python for research, ML and glue\n\n" +
           "And one structural choice: the four projects deliberately spread across the stack — perception, manipulation, ROS2 internals, fleet infrastructure — rather than repeating one idea four times.",
        deep: "## Full pipelines over isolated pieces\n" +
           "Each project runs end to end. The Go2 work goes from raw LiDAR to a republished obstacle cloud with visualisation; the fleet project goes from ROS2 topics through Kafka and QuestDB to a live dashboard. This is deliberate — in robotics the failure is usually in the seams: frames, timing, sensor noise, recovery. A clever algorithm in isolation does not expose any of that.\n" +
           "## Failure first\n" +
           "Multi-attempt fallback, recovery behaviour after failed navigation, action-server verification before commanding motion, velocity and acceleration scaling, graceful return to a known state. The >95% success rate is the visible result of this habit, not of planner tuning.\n" +
           "## Measure the effect, do not assert it\n" +
           "RViz renders raw and filtered clouds together. Positioning accuracy is quoted in centimetres. Telemetry lands in a time-series store with a dashboard on top. Where a number is not available, the page does not imply one.\n" +
           "## Language discipline\n" +
           "C++ for anything running per sensor frame or plugging into a C++ interface — the perception pipeline, the TF2 and Nav2 plugin work. Python where iteration speed dominates — the MoveIt2 demo, the telemetry glue. That split is a decision he can defend project by project.\n" +
           "## Hardware-first debugging\n" +
           "From the mechanical engineering background: suspect mounting, frames, limits and timing before suspecting the algorithm.\n" +
           "## Portfolio as an argument\n" +
           "Four projects across sensor, perception, planning, control and fleet infrastructure — chosen to demonstrate spread, with every repository public so the claims can be checked.",
        next: ['How does he handle failure and recovery?', 'How does he debug robot problems?', 'What is his strongest project?', 'Explain each project in detail'],
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
        "- Who he is, and the mechanical engineering route into robotics software\n" +
        "- Experience level, stated honestly, and how he works day to day\n" +
        "- Where he is heading: physical AI, sim-to-real transfer, legged robotics\n" +
        "- Kinematics and the maths that actually gets used\n" +
        "## Skills\n" +
        "- The full stack, or any layer of it\n" +
        "- C++ versus Python and the rule he applies\n" +
        "- ROS2 depth — custom message types, pluginlib plugins, TF2, actions\n" +
        "- Navigation: Nav2, SLAM, AMCL, GMapping, Cartographer\n" +
        "- Perception: LiDAR, PCL, OpenCV, IMU, camera, sensor fusion\n" +
        "- Manipulation, control, ML/DL, Docker and deployment\n" +
        "## Projects\n" +
        "- All four together, or any one by name\n" +
        "- Go2 perception pipeline · MoveIt2 pick & place · TF Transform Explorer · Fleet monitoring\n" +
        "- The numbers behind them, and which numbers do not exist\n" +
        "## How he works\n" +
        "- Failure handling and recovery design\n" +
        "- How he debugs a misbehaving robot\n" +
        "- Which robots and sensors appear on the page\n" +
        "## Hiring\n" +
        "- Which roles fit and which do not\n" +
        "- The honest gaps in his experience\n" +
        "- Email, GitHub, LinkedIn\n" +
        "## Two things I will not do\n" +
        "Invent facts that are not on this page, and pad an answer when the honest reply is \"that is not published, email him\".",
    control:
        "## Control\n" +
        "- PID controllers\n" +
        "- Path planning, with Nav2's planners on the navigation side\n" +
        "- State machines to sequence behaviour\n" +
        "The state-machine part is the underrated one. The MoveIt2 project's above-95% success rate comes from an FSM with real recovery states — a failed grasp returns to a known state and the run resumes — rather than from a better planner. Velocity and acceleration scaling sit alongside it, keeping a 7-DOF arm inside sane limits.\n" +
        "## Simulation — Gazebo\n" +
        "- A custom Gazebo world for the Go2 perception pipeline, teleop-ready so the robot can be driven through obstacles while the pipeline runs\n" +
        "- Multiple TurtleBot3 robots simulated simultaneously for the fleet project, which exercises the telemetry pipeline with concurrent producers instead of one stream\n" +
        "He builds environments rather than only running stock ones — that is the difference between a simulation user and someone using simulation as a test rig.\n" +
        "## Visualisation — RViz\n" +
        "Used throughout, and used as a measurement tool: raw and ground-plane-filtered clouds displayed side by side so the filter's effect is inspected rather than assumed.\n" +
        "## How simulation is positioned\n" +
        "As a step toward hardware, not a destination. The stated goal is sim-to-real transfer, and the whole point of a custom world with teleop is to break the pipeline before a real machine does.",
    strongest:
        "Depends what you are hiring for. Four honest readings:\n\n" +
        "## Hardest engineering — MoveIt2 Pick & Place\n" +
        "A 7-DOF Franka Panda, OMPL planning with constraint-based execution, ±1 cm positioning and above 95% success. The success rate comes from multi-attempt fallback, action-server verification and graceful recovery — failure handling, not a luckier planner. It is the only project with numbers attached.\n" +
        "## Most telling about ROS2 depth — TF Transform Explorer\n" +
        "A custom TFDiagnostics message type, a Nav2 costmap plugin loaded through pluginlib for keepout zones, dynamic and static TF2 broadcasters, and autonomous patrol with recovery. Unglamorous, and exactly where most ROS2 systems quietly break. Defining a message type and writing a plugin means reading ROS2's interfaces rather than its tutorials.\n" +
        "## Widest scope — Fleet Monitoring System\n" +
        "ROS2 to Kafka to QuestDB, several TurtleBot3 robots at once, fully containerised, live dashboard over the PostgreSQL wire protocol. It shows he can build the layer around the robots — one working robot is a project, a fleet you can observe is a product.\n" +
        "## Closest to where he is heading — Go2 Perception Pipeline\n" +
        "C++ point-cloud processing on a quadruped: ground-plane removal with PCL, clean obstacle clouds republished, raw versus filtered rendered side by side. The first deliberate step toward legged robotics and physical AI.\n" +
        "## The common thread\n" +
        "A mechanical engineering background plus full-pipeline thinking. Each project runs end to end rather than demonstrating one isolated algorithm, because in robotics the failure lives in the seams.",
    contact:
        "## Email — the fastest route\n" +
        EMAIL + "\n" +
        "Right channel for the CV, availability, role scope, employers and dates, real-hardware detail, and anything else this page does not publish.\n" +
        "## GitHub\n" +
        "github.com/AungKaung1928 — all four projects are public, and every claim on this page is checkable against the code:\n" +
        "- go2-perception-pipeline\n" +
        "- moveit_pickplace_demo\n" +
        "- TF-Transform-Explorer\n" +
        "- fleet_monitoring_ws\n" +
        "## LinkedIn\n" +
        "Linked in the Contact section of this page.\n" +
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
    { name: 'Skills', ids: ['stack', 'languages', 'ros2', 'navigation', 'ml', 'control', 'deployment'] },
    { name: 'Projects', ids: ['projects', 'perception', 'manipulation', 'tf', 'fleet', 'metrics', 'hardware'] },
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
    'How deep is his ROS2 knowledge?',
    'C++ or Python — which does he use?',
    'What about navigation and SLAM?',
    'Tell me about the Go2 perception project',
    'Tell me about the MoveIt2 pick and place project',
    'Tell me about the TF Transform Explorer project',
    'Tell me about the fleet monitoring project',
    'What about sim-to-real transfer?',
    'What legged robotics experience does he have?',
    'Which robots and sensors has he worked with?',
    'How does he handle failure and recovery?',
    'How does he debug robot problems?',
    'What numbers can he back up?',
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
    "I did not catch that one. I cover Aung's robotics work only — background, experience, the technical stack, the four projects, how he works, and contact details.\n\n" +
    "Questions I answer well:\n" +
    "- \"what is his experience\"\n" +
    "- \"explain each project in detail\"\n" +
    "- \"how deep is his ROS2 knowledge\"\n" +
    "- \"what about navigation and SLAM\"\n" +
    "- \"how does he handle failure and recovery\"\n" +
    "- \"what numbers can he back up\"\n" +
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
