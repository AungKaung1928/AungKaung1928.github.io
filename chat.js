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

/* Words that mean "give me the long version". */
const DEPTH_RE = /\b(detail|details|detailed|explain|elaborate|each|all|every|more|deep|deeper|fully|in depth|breakdown|walk me|tell me about|overview)\b/;

/* ── Knowledge base ──────────────────────────────────────────────────
 * a     — standard answer
 * deep  — long answer, used when the question asks for detail
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
];

/* Questions the page genuinely cannot answer — say so instead of guessing. */
const NOT_COVERED = {
    k: ['salary', 'pay', 'rate', 'age', 'old', 'married', 'visa', 'sponsor', 'relocate', 'relocation', 'notice period', 'address', 'phone', 'live', 'lives', 'located', 'location', 'city', 'country', 'nationality', 'university', 'school', 'degree', 'graduated', 'gpa', 'certification', 'certificate'],
    a: "That is not on this page, and I do not guess about it.\n\n" +
       "Email him directly and he will answer: " + EMAIL,
    next: ['What is his experience?', 'What is his stack?', 'Explain each project', 'How do I contact him?'],
};

const FALLBACK_NEXT = ['What can I ask you?', 'Who is he?', 'Explain each project', 'How do I contact him?'];

const FALLBACK =
    "I did not catch that one. I only cover Aung's robotics work — background, experience, technical stack, the four projects, and contact details.\n\n" +
    "Try one of these:\n" +
    "- \"what is his experience\"\n" +
    "- \"explain each project in detail\"\n" +
    "- \"what about navigation and SLAM\"\n" +
    "- \"how do I contact him\"";

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
    const deep = DEPTH_RE.test(q);
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

    const parts = [deep && top.t.deep ? top.t.deep : top.t.a];

    // Multi-topic question ("stack and projects") — add a comparable runner-up.
    const second = picked[1];
    if (second && second.score >= top.score * 0.6 && second.t.id !== 'greeting') {
        parts.push(deep && second.t.deep ? second.t.deep : second.t.a);
    }

    // Follow-ups: the top topic's, minus anything it just answered.
    const answered = new Set(picked.slice(0, 2).map((s) => s.t.ask));
    const next = (top.t.next ?? FALLBACK_NEXT).filter((s) => !answered.has(s)).slice(0, 4);

    return { text: parts.join('\n\n'), next: next.length ? next : FALLBACK_NEXT };
}

/* ── Answer rendering ────────────────────────────────────────────── */
/* Plain text in, structured DOM out. Supports "## heading", "- bullet"
 * and "1. numbered". textContent everywhere, so nothing can inject HTML. */

function stripMd(s) {
    return s.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function renderAnswer(text) {
    const frag = document.createDocumentFragment();
    let list = null;

    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();

        if (!line) { list = null; continue; }

        const heading = line.match(/^#{1,3}\s+(.*)$/);
        if (heading) {
            list = null;
            const h = document.createElement('p');
            h.className = 'ans-h';
            h.textContent = stripMd(heading[1]);
            frag.appendChild(h);
            continue;
        }

        const bullet = line.match(/^[-•·]\s+(.*)$/);
        const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);

        if (bullet || numbered) {
            if (!list) {
                list = document.createElement('ul');
                list.className = 'ans-list';
                frag.appendChild(list);
            }
            const li = document.createElement('li');
            if (numbered) {
                const n = document.createElement('span');
                n.className = 'ans-num';
                n.textContent = numbered[1];
                li.appendChild(n);
                li.classList.add('numbered');
            }
            li.appendChild(document.createTextNode(stripMd(numbered ? numbered[2] : bullet[1])));
            list.appendChild(li);
            continue;
        }

        list = null;
        const p = document.createElement('p');
        p.textContent = stripMd(line);
        frag.appendChild(p);
    }

    return frag;
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
            <button id="chat-topics-btn" class="chat-icon-btn" aria-label="Show topics" title="Topics">
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
    <div id="chat-topics" hidden>
        <p class="chat-topics-title">Pick a topic</p>
        <div class="chat-topics-list"></div>
    </div>
    <div id="chat-log" role="log" aria-live="polite"></div>
    <div class="chat-suggestions"></div>
    <div class="chat-input-row">
        <textarea id="chat-input" rows="1" maxlength="500" placeholder="Ask about his stack, a project, experience…" aria-label="Your question"></textarea>
        <button id="chat-send" aria-label="Send">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        </button>
    </div>
    <p class="chat-foot">Answers cover only what is published on this page.</p>`;

document.body.append(fab, panel);

const log = panel.querySelector('#chat-log');
const input = panel.querySelector('#chat-input');
const sendBtn = panel.querySelector('#chat-send');
const suggestionBar = panel.querySelector('.chat-suggestions');
const topicsPane = panel.querySelector('#chat-topics');
const topicsList = panel.querySelector('.chat-topics-list');
const topicsBtn = panel.querySelector('#chat-topics-btn');

const history = [];   // {role, text} — sent only in endpoint mode
let busy = false;

function scrollLog() {
    log.scrollTop = log.scrollHeight;
}

function addMsg(text, cls) {
    const el = document.createElement('div');
    el.className = `chat-msg ${cls}`;
    if (cls === 'bot') el.appendChild(renderAnswer(text));
    else el.textContent = text;
    log.appendChild(el);
    scrollLog();
    return el;
}

function addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-msg bot chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(el);
    scrollLog();
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

function buildTopicsMenu() {
    topicsList.innerHTML = '';
    for (const t of TOPICS) {
        if (!t.label) continue;
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = t.label;
        b.addEventListener('click', () => {
            topicsPane.hidden = true;
            topicsBtn.setAttribute('aria-expanded', 'false');
            ask(t.ask);
        });
        topicsList.appendChild(b);
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

function ask(text) {
    input.value = text;
    send();
}

async function send() {
    const text = input.value.trim();
    if (!text || busy) return;

    input.value = '';
    input.style.height = 'auto';
    addMsg(text, 'user');
    renderSuggestions([]);

    busy = true;
    sendBtn.disabled = true;

    // Always compute the local match — in endpoint mode it still supplies
    // the follow-up chips, which the model does not produce.
    const local = localAnswer(text);

    const finish = () => { busy = false; sendBtn.disabled = false; input.focus(); };

    if (!CHAT_ENDPOINT) {
        const typing = addTyping();
        setTimeout(() => {
            typing.remove();
            addMsg(local.text, 'bot');
            renderSuggestions(local.next);
            finish();
        }, 340);
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
        addMsg(local.text, 'bot');
        addMsg('Live assistant unreachable — answered from the local profile instead.', 'error');
        console.warn('chat endpoint failed:', err);
    } finally {
        renderSuggestions(local.next);
        finish();
    }
}

const OPENING =
    "Hi — I answer questions about Aung Kaung Myat's robotics work.\n\n" +
    "I can cover:\n" +
    "- Background and experience, and where he is heading\n" +
    "- The technical stack: navigation, perception, manipulation, ML\n" +
    "- Any of the four projects, one at a time or all together\n" +
    "- How to reach him\n\n" +
    "Add the word \"detail\" to any question and I will go long. Tap the list icon above for every topic.";

function toggle(open) {
    const willOpen = open ?? !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    fab.classList.toggle('open', willOpen);
    fab.setAttribute('aria-expanded', String(willOpen));

    if (willOpen) {
        if (!log.children.length) {
            addMsg(OPENING, 'bot');
            renderSuggestions(['What is his experience?', 'Explain each project in detail', 'What is his stack?', 'How do I contact him?']);
        }
        input.focus();
    } else {
        fab.focus();
    }
}

buildTopicsMenu();

fab.addEventListener('click', () => toggle());
panel.querySelector('#chat-close').addEventListener('click', () => toggle(false));
sendBtn.addEventListener('click', send);

topicsBtn.addEventListener('click', () => {
    const show = topicsPane.hidden;
    topicsPane.hidden = !show;
    topicsBtn.setAttribute('aria-expanded', String(show));
});

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!topicsPane.hidden) {
        topicsPane.hidden = true;
        topicsBtn.setAttribute('aria-expanded', 'false');
    } else if (panel.classList.contains('open')) {
        toggle(false);
    }
});
