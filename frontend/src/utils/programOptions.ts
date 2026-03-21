// Predefined program and block options for Class Management
// These are used as suggestions when teachers add programs and blocks.

export interface Program {
  code: string;
  name: string;
  description: string;
}

export const PROGRAM_DETAILS: Program[] = [
  // BUSINESS / MANAGEMENT / FINANCE
  {
    code: "BSA",
    name: "BS Accountancy",
    description:
      "Focuses on financial reporting, auditing, and taxation systems.",
  },
  {
    code: "BSBA",
    name: "BS Business Administration",
    description:
      "A broad study of business operations, leadership, and management.",
  },
  {
    code: "BSBAFM",
    name: "BSBA Financial Management",
    description:
      "Specializes in investment, capital markets, and corporate finance.",
  },
  {
    code: "BSBAMM",
    name: "BSBA Marketing Management",
    description: "Focuses on branding, consumer behavior, and market research.",
  },
  {
    code: "BSBAHRDM",
    name: "BSBA Human Resource Development Management",
    description:
      "Covers employee relations, recruitment, and organizational behavior.",
  },
  {
    code: "BSBAMKT",
    name: "BSBA Marketing",
    description:
      "Deals with the promotion and distribution of goods and services.",
  },
  {
    code: "BSBABA",
    name: "BSBA Business Analytics",
    description:
      "Uses data and statistical methods to drive business decision-making.",
  },
  {
    code: "BSAIS",
    name: "BS Accounting Information Systems",
    description:
      "Combines accounting principles with information technology solutions.",
  },
  {
    code: "BSMA",
    name: "BS Management Accounting",
    description:
      "Focuses on internal reporting for management decision-making.",
  },
  {
    code: "BSECON",
    name: "BS Economics",
    description:
      "Studies the production, distribution, and consumption of goods.",
  },
  {
    code: "BSEntrep",
    name: "BS Entrepreneurship",
    description:
      "Prepares students to start, manage, and grow business ventures.",
  },
  {
    code: "BSHM",
    name: "BS Hospitality Management",
    description: "Covers hotel and restaurant operations and guest services.",
  },
  {
    code: "BSTM",
    name: "BS Tourism Management",
    description:
      "Focuses on travel agency operations, eco-tourism, and destination marketing.",
  },
  {
    code: "BSRE",
    name: "BS Real Estate Management",
    description: "Studies property valuation, sales, and real estate laws.",
  },
  {
    code: "BSCoEcon",
    name: "BS Cooperative Economics",
    description:
      "Focuses on the management and principles of cooperative organizations.",
  },

  // ENGINEERING / TECHNOLOGY
  {
    code: "BSCE",
    name: "BS Civil Engineering",
    description:
      "Design and construction of roads, bridges, and infrastructure.",
  },
  {
    code: "BSME",
    name: "BS Mechanical Engineering",
    description:
      "The design and manufacturing of machines and mechanical systems.",
  },
  {
    code: "BSEE",
    name: "BS Electrical Engineering",
    description: "Focuses on electricity, electronics, and electromagnetism.",
  },
  {
    code: "BSCoE",
    name: "BS Computer Engineering",
    description: "Integrates hardware design with software development.",
  },
  {
    code: "BSECE",
    name: "BS Electronics Engineering",
    description:
      "Deals with electronic circuits, devices, and communication systems.",
  },
  {
    code: "BSChE",
    name: "BS Chemical Engineering",
    description:
      "Applies chemistry and physics to industrial chemical processes.",
  },
  {
    code: "BSIE",
    name: "BS Industrial Engineering",
    description: "Optimizes complex processes, systems, and organizations.",
  },
  {
    code: "BSMatE",
    name: "BS Materials Engineering",
    description:
      "The study of the properties and applications of industrial materials.",
  },
  {
    code: "BSARE",
    name: "BS Aeronautical Engineering",
    description:
      "The design and maintenance of aircraft and propulsion systems.",
  },
  {
    code: "BSGE",
    name: "BS Geodetic Engineering",
    description: "Focuses on surveying, mapping, and land measurement.",
  },
  {
    code: "BSMetE",
    name: "BS Metallurgical Engineering",
    description: "Studies the extraction and processing of metals.",
  },
  {
    code: "BSEnE",
    name: "BS Environmental Engineering",
    description:
      "Applies engineering to protect the environment and public health.",
  },
  {
    code: "BSEM",
    name: "BS Mining Engineering",
    description:
      "The science and technology of extracting minerals from the earth.",
  },
  {
    code: "BSEnTech",
    name: "BS Engineering Technology",
    description:
      "Focuses on the practical application of engineering concepts.",
  },

  // COMPUTING / IT / DATA
  {
    code: "BSCS",
    name: "BS Computer Science",
    description: "Study of algorithms, theory, and complex software systems.",
  },
  {
    code: "BSCS-AI",
    name: "BSCS Artificial Intelligence",
    description: "Specialization in machine learning and cognitive computing.",
  },
  {
    code: "BSCS-ML",
    name: "BSCS Machine Learning",
    description: "Focuses on training data models and predictive algorithms.",
  },
  {
    code: "BSCS-DS",
    name: "BSCS Data Science",
    description: "Advanced study of data analysis and statistical modeling.",
  },
  {
    code: "BSCS-SE",
    name: "BSCS Software Engineering",
    description: "Focuses on systematic software development and architecture.",
  },
  {
    code: "BSCS-SD",
    name: "BSCS Software Development",
    description: "Practical application of programming to build applications.",
  },
  {
    code: "BSCS-GD",
    name: "BSCS Game Development",
    description: "Focuses on game design, graphics, and interactive mechanics.",
  },
  {
    code: "BSCS-CY",
    name: "BSCS Cybersecurity",
    description: "Protection of systems and networks from digital attacks.",
  },
  {
    code: "BSCS-NS",
    name: "BSCS Network Security",
    description: "Specializes in securing communication infrastructures.",
  },
  {
    code: "BSCS-NET",
    name: "BSCS Networking",
    description: "Study of local and wide area network design.",
  },
  {
    code: "BSCS-CC",
    name: "BSCS Cloud Computing",
    description: "Focuses on distributed systems and cloud infrastructure.",
  },
  {
    code: "BSCS-ROBO",
    name: "BSCS Robotics",
    description: "Integration of hardware and software for autonomous systems.",
  },
  {
    code: "BSCS-IOT",
    name: "BSCS Internet of Things",
    description: "Deals with interconnected devices and smart systems.",
  },
  {
    code: "BSCS-ARVR",
    name: "BSCS AR/VR",
    description: "Development of Augmented and Virtual Reality environments.",
  },
  {
    code: "BSCS-Graphics",
    name: "BSCS Graphics",
    description: "Advanced study of computer imaging and rendering.",
  },
  {
    code: "BSCS-CompEng",
    name: "BSCS Computational Engineering",
    description: "Using computing to solve complex engineering problems.",
  },
  {
    code: "BSCS-BDA",
    name: "BSCS Big Data Analytics",
    description: "Processing and analyzing massive datasets.",
  },
  {
    code: "BSCS-IS",
    name: "BSCS Information Systems",
    description: "Focuses on integrating IT solutions with business.",
  },
  {
    code: "BSCS-THEO",
    name: "BSCS Theory",
    description: "Theoretical foundations of computing and algorithms.",
  },
  {
    code: "BSIT",
    name: "BS Information Technology",
    description:
      "Focuses on the management and usage of technology for business.",
  },
  {
    code: "BSIT-NET",
    name: "BSIT Networking",
    description: "Infrastructure management and network administration.",
  },
  {
    code: "BSIT-NS",
    name: "BSIT Network Security",
    description: "Protecting business data within networks.",
  },
  {
    code: "BSIT-CY",
    name: "BSIT Cybersecurity",
    description: "Operational security for information technology systems.",
  },
  {
    code: "BSIT-WMAD",
    name: "BSIT Web and Mobile Application Development",
    description: "Building modern apps for web and mobile platforms.",
  },
  {
    code: "BSIT-SD",
    name: "BSIT Software Development",
    description: "Building and deploying business-level software.",
  },
  {
    code: "BSIT-SE",
    name: "BSIT Systems Engineering",
    description: "Focuses on large-scale IT systems management.",
  },
  {
    code: "BSIT-DB",
    name: "BSIT Database Management",
    description: "Designing and maintaining secure data storage systems.",
  },
  {
    code: "BSIT-DA",
    name: "BSIT Data Analytics",
    description:
      "Analyzing business data to improve organizational efficiency.",
  },
  {
    code: "BSIT-CC",
    name: "BSIT Cloud Computing",
    description: "Managing business operations in cloud environments.",
  },
  {
    code: "BSIT-IMA",
    name: "BSIT Interactive Media Arts",
    description: "Creation of digital media and interactive content.",
  },
  {
    code: "BSIT-MMA",
    name: "BSIT Multimedia Arts",
    description: "Integration of design, audio, and video for IT.",
  },
  {
    code: "BSIT-SYS",
    name: "BSIT Systems Administration",
    description: "Managing the daily operations of computer systems.",
  },
  {
    code: "BSIT-SA",
    name: "BSIT Systems Analysis",
    description: "Optimizing organizational efficiency through tech.",
  },
  {
    code: "BSIT-IOT",
    name: "BSIT Internet of Things",
    description: "Connecting smart devices within industrial contexts.",
  },
  {
    code: "BSIT-ERP",
    name: "BSIT Enterprise Resource Planning",
    description: "Managing business processes via platforms like SAP.",
  },
  {
    code: "BSIT-ITSM",
    name: "BSIT IT Service Management",
    description: "Delivery and management of IT services for users.",
  },
  {
    code: "BSIT-GD",
    name: "BSIT Game Development",
    description: "Technical implementation of video game logic.",
  },
  {
    code: "BSIS",
    name: "BS Information Systems",
    description: "Designing tech-based solutions for business problems.",
  },
  {
    code: "BSDA",
    name: "BS Data Analytics",
    description: "Interpreting data trends for decision support.",
  },
  {
    code: "BSDS",
    name: "BS Data Science",
    description: "Extracting insights from data using scientific methods.",
  },
  {
    code: "BSSE",
    name: "BS Software Engineering",
    description: "Applying engineering principles to software life cycles.",
  },
  {
    code: "BSAI",
    name: "BS Artificial Intelligence",
    description: "Creation of intelligent machines and programs.",
  },
  {
    code: "BSCpE",
    name: "BS Computer Engineering",
    description: "Hardware and software design for computer systems.",
  },
  {
    code: "BSIT-ML",
    name: "BSIT Machine Learning",
    description: "Implementation of ML models in IT environments.",
  },

  // HEALTH / MEDICAL-ALLIED
  {
    code: "BSN",
    name: "BS Nursing",
    description:
      "Professional training for patient care and healthcare services.",
  },
  {
    code: "BSMT",
    name: "BS Medical Technology",
    description: "Laboratory testing and analysis for clinical diagnosis.",
  },
  {
    code: "BSPharma",
    name: "BS Pharmacy",
    description: "The study of medication, drug therapy, and patient safety.",
  },
  {
    code: "BSRT",
    name: "BS Radiologic Technology",
    description: "Using X-rays and imaging for medical diagnosis.",
  },
  {
    code: "BSMedTech",
    name: "BS Medical Technology",
    description: "Scientific analysis of human samples for medicine.",
  },
  {
    code: "BSND",
    name: "BS Nutrition and Dietetics",
    description: "The study of food, health, and dietary planning.",
  },
  {
    code: "BSSW",
    name: "BS Social Work",
    description:
      "Supporting individuals and communities through social services.",
  },
  {
    code: "BSMLS",
    name: "BS Medical Laboratory Science",
    description: "Clinical lab procedures and diagnostic investigation.",
  },
  {
    code: "BSOT",
    name: "BS Occupational Therapy",
    description: "Helping patients regain daily life skills through therapy.",
  },
  {
    code: "BSPT",
    name: "BS Physical Therapy",
    description: "Rehabilitation through movement and physical exercise.",
  },

  // SCIENCE / NATURAL SCIENCE
  {
    code: "BSBio",
    name: "BS Biology",
    description: "The study of living organisms and life processes.",
  },
  {
    code: "BSCH",
    name: "BS Chemistry",
    description: "The study of substances, their properties, and reactions.",
  },
  {
    code: "BSPhy",
    name: "BS Physics",
    description: "The study of matter, energy, and the laws of the universe.",
  },
  {
    code: "BSStat",
    name: "BS Statistics",
    description: "Collection, analysis, and interpretation of numerical data.",
  },
  {
    code: "BSAMath",
    name: "BS Applied Mathematics",
    description: "Applying mathematical methods to physics and engineering.",
  },
  {
    code: "BSMath",
    name: "BS Mathematics",
    description: "The study of numbers, structures, and space.",
  },
  {
    code: "BSEnvSci",
    name: "BS Environmental Science",
    description: "The study of the environment and ecological balance.",
  },
  {
    code: "BSITech",
    name: "BS Industrial Technology",
    description: "Management of technical and industrial processes.",
  },
  {
    code: "BSFT",
    name: "BS Food Technology",
    description: "The science of food production and preservation.",
  },
  {
    code: "BSBiotech",
    name: "BS Biotechnology",
    description: "Using biological systems to develop new technologies.",
  },
  {
    code: "BSMicro",
    name: "BS Microbiology",
    description: "The study of microscopic organisms like bacteria.",
  },
  {
    code: "BSGeol",
    name: "BS Geology",
    description: "The study of the Earth’s physical structure and history.",
  },
  {
    code: "BSMarBio",
    name: "BS Marine Biology",
    description: "The study of marine life and ocean ecosystems.",
  },
  {
    code: "BSEnviEng",
    name: "BS Environmental Engineering",
    description: "Engineering solutions for environmental preservation.",
  },

  // ARTS / HUMANITIES
  {
    code: "ABEng",
    name: "AB English",
    description: "The study of English language, literature, and linguistics.",
  },
  {
    code: "ABFil",
    name: "AB Filipino",
    description: "Advanced study of Filipino language and culture.",
  },
  {
    code: "ABPolSci",
    name: "AB Political Science",
    description: "The study of government systems and political behavior.",
  },
  {
    code: "ABPsy",
    name: "AB Psychology",
    description: "Scientific study of the human mind and behavior.",
  },
  {
    code: "ABComm",
    name: "AB Communication",
    description: "Focuses on media production and public relations.",
  },
  {
    code: "ABMMA",
    name: "AB Multimedia Arts",
    description: "Combining design, digital media, and visual arts.",
  },
  {
    code: "ABHist",
    name: "AB History",
    description: "The systematic study of past events and civilizations.",
  },
  {
    code: "ABPhilo",
    name: "AB Philosophy",
    description: "The study of fundamental questions of existence and ethics.",
  },
  {
    code: "ABIS",
    name: "AB International Studies",
    description: "Global relations, politics, and international trade.",
  },
  {
    code: "BFA",
    name: "Bachelor of Fine Arts",
    description: "Specialized training in visual and creative arts.",
  },
  {
    code: "BFAID",
    name: "BFA Interior Design",
    description: "Creating functional and aesthetic interior spaces.",
  },
  {
    code: "BFAMC",
    name: "BFA Media Communications",
    description: "Visual storytelling through digital and traditional media.",
  },
  {
    code: "BFAPA",
    name: "BFA Performing Arts",
    description: "Specialization in dance, drama, or music performance.",
  },
  {
    code: "BFAMMA",
    name: "BFA Multimedia Arts",
    description: "Fine arts approach to digital media and design.",
  },

  // EDUCATION
  {
    code: "BEEd",
    name: "Bachelor of Elementary Education",
    description: "Prepares teachers for primary school education.",
  },
  {
    code: "BSEd",
    name: "Bachelor of Secondary Education",
    description: "Prepares teachers for high school subject areas.",
  },
  {
    code: "BSEdEng",
    name: "BSEd English",
    description: "Secondary teaching with a focus on English language.",
  },
  {
    code: "BSEdFil",
    name: "BSEd Filipino",
    description: "Secondary teaching with a focus on Filipino language.",
  },
  {
    code: "BSEdMath",
    name: "BSEd Mathematics",
    description: "Secondary teaching specializing in mathematics.",
  },
  {
    code: "BSEdSci",
    name: "BSEd Science",
    description: "Secondary teaching specializing in natural sciences.",
  },
  {
    code: "BPEd",
    name: "Bachelor of Physical Education",
    description: "Focuses on physical fitness and sports education.",
  },
  {
    code: "BTVTEd",
    name: "Bachelor of Technical-Vocational Teacher Education",
    description: "Teaching trade and technical vocational skills.",
  },
  {
    code: "BTTE",
    name: "Bachelor of Technical Teacher Education",
    description: "Prepares instructors for technical institutes.",
  },
  {
    code: "BCAEd",
    name: "Bachelor of Culture and Arts Education",
    description: "Teaching arts and cultural heritage.",
  },

  // SOCIAL SCIENCES
  {
    code: "ABSS",
    name: "AB Social Science",
    description: "Broad study of social structures and human society.",
  },
  {
    code: "ABDevStud",
    name: "AB Development Studies",
    description: "Focuses on societal development and community growth.",
  },
  {
    code: "ABAnthro",
    name: "AB Anthropology",
    description: "The study of human cultures and biological evolution.",
  },
  {
    code: "ABJourn",
    name: "AB Journalism",
    description: "The practice of gathering and reporting news.",
  },

  // MEDIA / COMMUNICATIONS / DESIGN
  {
    code: "BJourn",
    name: "Bachelor of Journalism",
    description: "Professional training for news and media reporting.",
  },
  {
    code: "BFAAD",
    name: "BFA Advertising Design",
    description: "Visual communication for brand marketing.",
  },
  {
    code: "BFAVC",
    name: "BFA Visual Communication",
    description: "Design principles for message-driven visuals.",
  },
  {
    code: "BSD",
    name: "Bachelor of Service Design",
    description: "Designing processes to improve user experiences.",
  },

  // LAW / PUBLIC AFFAIRS / GOVERNANCE
  {
    code: "BSPA",
    name: "BS Public Administration",
    description: "Government operations and public policy management.",
  },
  {
    code: "BSLGA",
    name: "BS Local Government Administration",
    description: "Managing community and local government units.",
  },
  {
    code: "ABPH",
    name: "AB Public Health",
    description: "Improving community health through policy and education.",
  },
  {
    code: "ABILS",
    name: "AB International Legal Studies",
    description: "Foundational study of global legal systems.",
  },

  // CRIMINOLOGY / SECURITY / PUBLIC SAFETY
  {
    code: "BSCrim",
    name: "BS Criminology",
    description: "The study of crime prevention and law enforcement.",
  },
  {
    code: "BSSec",
    name: "BS Security Management",
    description: "Protection of assets and personnel in various sectors.",
  },
  {
    code: "BSForenSci",
    name: "BS Forensic Science",
    description: "Applying scientific methods to criminal investigation.",
  },

  // AGRICULTURE / FORESTRY / ENVIRONMENT
  {
    code: "BSAgri",
    name: "BS Agriculture",
    description: "The science of crop production and livestock management.",
  },
  {
    code: "BSFor",
    name: "BS Forestry",
    description: "The management and conservation of forest resources.",
  },
  {
    code: "BSAB",
    name: "BS Agribusiness",
    description: "Focuses on the commercial aspects of farming.",
  },
  {
    code: "BSAT",
    name: "BS Agricultural Technology",
    description: "Applying modern technology to agricultural systems.",
  },

  // MARITIME
  {
    code: "BSMarE",
    name: "BS Marine Engineering",
    description: "Design and maintenance of ship propulsion systems.",
  },
  {
    code: "BSMarT",
    name: "BS Marine Transportation",
    description: "Navigation and management of commercial vessels.",
  },
  {
    code: "BSNav",
    name: "BS Naval Architecture",
    description: "Design and engineering of marine vessels and structures.",
  },
];

export const PROGRAM_SUGGESTIONS: string[] = [
  // Business / Management / Finance
  "BSA",
  "BSBA",
  "BSBAFM",
  "BSBAMM",
  "BSBAHRDM",
  "BSBAMKT",
  "BSBABA",
  "BSAIS",
  "BSMA",
  "BSECON",
  "BSEntrep",
  "BSHM",
  "BSTM",
  "BSRE",
  "BSCoEcon",

  // Engineering / Technology
  "BSCE",
  "BSME",
  "BSEE",
  "BSCoE",
  "BSECE",
  "BSChE",
  "BSIE",
  "BSMatE",
  "BSARE",
  "BSGE",
  "BSMetE",
  "BSEnE",
  "BSEM",
  "BSEnTech",

  // Computing / IT / Data
  "BSCS",
  "BSCS-AI",
  "BSCS-ML",
  "BSCS-DS",
  "BSCS-SE",
  "BSCS-SD",
  "BSCS-GD",
  "BSCS-CY",
  "BSCS-NS",
  "BSCS-NET",
  "BSCS-CC",
  "BSCS-ROBO",
  "BSCS-IOT",
  "BSCS-ARVR",
  "BSCS-Graphics",
  "BSCS-CompEng",
  "BSCS-BDA",
  "BSCS-IS",
  "BSCS-THEO",
  "BSIT",
  "BSIT-NET",
  "BSIT-NS",
  "BSIT-CY",
  "BSIT-WMAD",
  "BSIT-SD",
  "BSIT-SE",
  "BSIT-DB",
  "BSIT-DA",
  "BSIT-CC",
  "BSIT-IMA",
  "BSIT-MMA",
  "BSIT-SYS",
  "BSIT-SA",
  "BSIT-IOT",
  "BSIT-ERP",
  "BSIT-ITSM",
  "BSIT-GD",
  "BSIS",
  "BSDA",
  "BSDS",
  "BSSE",
  "BSAI",
  "BSCpE",
  "BSIT-ML",

  // Health / Medical-Allied
  "BSN",
  "BSMT",
  "BSPharma",
  "BSRT",
  "BSMedTech",
  "BSND",
  "BSSW",
  "BSMLS",
  "BSOT",
  "BSPT",

  // Science / Natural Science
  "BSBio",
  "BSCH",
  "BSPhy",
  "BSStat",
  "BSAMath",
  "BSMath",
  "BSEnvSci",
  "BSITech",
  "BSFT",
  "BSBiotech",
  "BSMicro",
  "BSGeol",
  "BSMarBio",
  "BSEnviEng",

  // Arts / Humanities
  "ABEng",
  "ABFil",
  "ABPolSci",
  "ABPsy",
  "ABComm",
  "ABMMA",
  "ABHist",
  "ABPhilo",
  "ABIS",
  "BFA",
  "BFAID",
  "BFAMC",
  "BFAPA",
  "BFAMMA",

  // Education
  "BEEd",
  "BSEd",
  "BSEdEng",
  "BSEdFil",
  "BSEdMath",
  "BSEdSci",
  "BPEd",
  "BTVTEd",
  "BTTE",
  "BCAEd",

  // Social Sciences
  "ABSS",
  "ABDevStud",
  "ABAnthro",
  "ABJourn",

  // Media / Communications / Design
  "BJourn",
  "BFAAD",
  "BFAVC",
  "BFAMMA",
  "BSD",

  // Law / Public Affairs / Governance
  "BSPA",
  "BSLGA",
  "ABPH",
  "ABILS",

  // Criminology / Security / Public Safety
  "BSCrim",
  "BSSec",
  "BSForenSci",

  // Agriculture / Forestry / Environment
  "BSAgri",
  "BSFor",
  "BSAB",
  "BSAT",

  // Maritime
  "BSMarE",
  "BSMarT",
  "BSNav",
];

// Block suggestions used in Class Management (e.g., 1A, 2B, 3C, 4D)
export const BLOCK_CODE_OPTIONS: string[] = [
  "1A",
  "1B",
  "1C",
  "1D",
  "2A",
  "2B",
  "2C",
  "2D",
  "3A",
  "3B",
  "3C",
  "3D",
  "4A",
  "4B",
  "4C",
  "4D",
];
