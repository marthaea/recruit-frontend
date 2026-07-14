import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Bookmark, BookmarkCheck, AlertCircle, Printer } from "lucide-react";
import { useApp } from "@/context/AppContext";
import logo from "@/assets/caa-logo.png";

export const Route = createFileRoute("/job")({
  validateSearch: z.object({ jobId: z.number() }),
  head: () => ({ meta: [{ title: "Job Details — CAA Uganda" }] }),
  component: JobDetailPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Accountability = { area: string; activities: string[] };

type JobDetail = {
  jobRef: string;
  reportsTo: string;
  vacancies: number;
  about: string;
  accountabilities: Accountability[];
  requirements: string[];
  desirable: string;
  specialSkills: string[];
};

// ─── Detail data ──────────────────────────────────────────────────────────────

const DETAILS: Record<number, JobDetail> = {
  1: {
    jobRef: "UCAA/ADV/EXT/01/2026",
    reportsTo: "Director, Air Traffic Management",
    vacancies: 1,
    about:
      "The Senior Air Traffic Controller will be responsible for managing and coordinating aircraft movements in Ugandan airspace, ensuring maximum safety and efficiency at Entebbe International Airport and surrounding approach zones. This is a senior technical role requiring ICAO-standard licensing and a strong safety culture.",
    accountabilities: [
      {
        area: "1. Air Traffic Control Operations",
        activities: [
          "Provide ATC service to aircraft operating in the Entebbe TMA and ACC sectors",
          "Ensure safe separation of IFR and VFR traffic in accordance with ICAO Doc 4444",
          "Issue clearances, traffic information and sequencing instructions in standard ICAO phraseology",
        ],
      },
      {
        area: "2. Safety, Coordination & Mentoring",
        activities: [
          "Coordinate with adjacent FIRs (Nairobi, Dar es Salaam) for traffic handoffs",
          "Complete mandatory shift occurrence logs and safety reports",
          "Mentor and evaluate junior controllers during on-the-job training exercises",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Aviation, Physics, Electronics or related field from a recognised university",
      "Valid ICAO ATC licence (ADC/APP/ACC rating) from a recognised ANSP",
      "Minimum 5 years post-rating experience in an operational ATC environment",
      "Current medical certificate (Class 3 or above) issued within 12 months",
      "English language proficiency at ICAO level 4 or above",
      "Age 25–45 years at the date of application",
    ],
    desirable:
      "Experience with EUROCAT or INDRA ATC automation systems. Familiarity with RVSM and PBCS airspace procedures within the Entebbe FIR.",
    specialSkills: [
      "Must be meticulous and capable of making sound, rapid decisions under time-critical conditions",
      "Must have excellent radiotelephony communication skills to ICAO standard phraseology",
      "Must be able to work rotating shifts including nights, weekends and public holidays",
      "Must demonstrate strong spatial awareness and ability to manage multiple traffic streams simultaneously",
    ],
  },

  2: {
    jobRef: "UCAA/ADV/EXT/02/2026",
    reportsTo: "Director, Aviation Safety",
    vacancies: 1,
    about:
      "The Principal Safety Inspector (Airworthiness) will oversee the continued airworthiness programmes of Ugandan-registered aircraft and Approved Maintenance Organisations (AMOs). The role sits within the Aviation Safety Directorate and reports to the Director of Aviation Safety.",
    accountabilities: [
      {
        area: "1. Airworthiness Oversight & Inspection",
        activities: [
          "Conduct ramp inspections of Ugandan-registered and foreign aircraft on oversight visits",
          "Approve, audit and surveil AMOs against UCAA Airworthiness Standards and ICAO Annex 8",
          "Review and approve Aircraft Maintenance Programmes (AMPs) and Engineering Orders",
        ],
      },
      {
        area: "2. Investigation, Certification & Standards",
        activities: [
          "Investigate airworthiness-related incidents and accidents in support of AIB Uganda",
          "Issue and renew Certificates of Airworthiness and noise certificates",
          "Draft airworthiness directives and safety bulletins for Ugandan operators",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Aeronautical or Mechanical Engineering or equivalent from a recognised university",
      "Valid EASA Part-66 or UCAA Aircraft Maintenance Engineer Licence (Category B1/B2 or C)",
      "At least 7 years airworthiness or AMO quality assurance experience",
      "Demonstrated knowledge of ICAO Annex 8 and ICAO Doc 9760",
      "Strong written English for regulatory correspondence",
      "Age 28–50 years at the date of application",
    ],
    desirable:
      "Experience with ECCAIRS aviation occurrence reporting software. Knowledge of ICAO DOC 9859 Safety Management System framework. EASA or FAA regulatory oversight experience.",
    specialSkills: [
      "Must possess strong analytical and investigative skills for airworthiness assessment",
      "Must be able to produce clear, accurate and timely regulatory correspondence",
      "Must demonstrate sound judgement in applying standards to complex technical situations",
      "Must be a self-starter with the ability to work independently across multiple AMOs",
    ],
  },

  3: {
    jobRef: "UCAA/ADV/EXT/03/2026",
    reportsTo: "Manager, ICT & Systems",
    vacancies: 1,
    about:
      "The Systems Administrator will maintain and secure CAA Uganda's IT infrastructure, including servers, network equipment, enterprise applications and end-user devices across all UCAA sites. The role is based at Kampala HQ with occasional travel to Entebbe Airport.",
    accountabilities: [
      {
        area: "1. Infrastructure Administration & Security",
        activities: [
          "Administer Windows Server, Linux and virtualisation environments (VMware/Hyper-V)",
          "Manage Active Directory, Group Policy, DNS, DHCP and Exchange/M365",
          "Monitor network performance, maintain firewalls and enforce access-control policies",
        ],
      },
      {
        area: "2. Continuity, Procurement & Support",
        activities: [
          "Implement and test disaster-recovery and business-continuity plans",
          "Manage IT procurement, vendor relationships and asset registers",
          "Provide Tier-2 and Tier-3 helpdesk escalation support to end users",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Computer Science, Information Technology or related field",
      "Minimum 3 years enterprise IT administration experience",
      "Certifications desirable: CompTIA Security+, CCNA, Microsoft MCSA or equivalent",
      "Solid understanding of TCP/IP networking and cybersecurity principles",
      "Experience with backup software (Veeam, Acronis) and monitoring tools",
      "Age 23–40 years at the date of application",
    ],
    desirable:
      "CISSP or CISM security certification. Experience with SIEM platforms and security incident response. Prior public-sector IT administration experience in Uganda.",
    specialSkills: [
      "Must have strong problem-solving skills and ability to diagnose complex infrastructure issues",
      "Must be willing to be on 24/7 on-call rotation for critical system incidents",
      "Must have excellent interpersonal skills for effective end-user support",
      "Must demonstrate high standards of confidentiality and data protection awareness",
    ],
  },

  4: {
    jobRef: "UCAA/ADV/EXT/04/2026",
    reportsTo: "Director, Finance & Administration",
    vacancies: 1,
    about:
      "The Finance Officer (Revenue Assurance) will safeguard UCAA's income streams from aeronautical charges, overflights, licensing fees and other statutory levies. The role sits in the Finance & Administration Directorate and works closely with the Director of Finance.",
    accountabilities: [
      {
        area: "1. Revenue Reconciliation & Reporting",
        activities: [
          "Reconcile IATA Billing Settlement Plan (BSP) invoices and airline debt statements",
          "Monitor and report on en-route and terminal navigation charge collections",
          "Prepare monthly revenue-assurance dashboards for senior management",
        ],
      },
      {
        area: "2. Compliance, Audit & Debt Recovery",
        activities: [
          "Identify and resolve revenue leakage across all UCAA fee categories",
          "Support external audits (OAG, Auditor General) with schedules and workings",
          "Liaise with legal counsel on debt recovery matters and defaulting operators",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Accounting, Finance or Business Administration from a recognised university",
      "Part-qualified or fully qualified CPA (U) / ACCA preferred",
      "At least 4 years experience in revenue assurance, audit or financial accounting",
      "Proficiency in Tally, QuickBooks or SAP Finance modules",
      "Strong Microsoft Excel and data-analysis skills",
      "Age 25–45 years at the date of application",
    ],
    desirable:
      "Experience with the IFMS (Integrated Financial Management System) used by Uganda Government agencies. Familiarity with IATA BSP reconciliation processes.",
    specialSkills: [
      "Must possess outstanding analytical skills and keen attention to financial detail",
      "Must be able to work to strict monthly deadlines without compromising accuracy",
      "Must demonstrate a high level of integrity and confidentiality in handling financial data",
      "Must have good interpersonal skills for effective liaison with airlines and external auditors",
    ],
  },

  5: {
    jobRef: "UCAA/ADV/EXT/05/2026",
    reportsTo: "Director General",
    vacancies: 1,
    about:
      "The Legal Counsel (Aviation Regulations) will provide specialist legal advice across UCAA's regulatory and enforcement functions, drafting aviation legislation, negotiating bilateral air services agreements, and representing the Authority in administrative proceedings.",
    accountabilities: [
      {
        area: "1. Regulatory Legal Advisory",
        activities: [
          "Draft, review and interpret aviation legislation, regulations and CAA orders",
          "Advise on bilateral air services agreements (BASAs) and ICAO obligations",
          "Monitor regional (CASSOA) and international (ICAO, IATA) legal developments",
        ],
      },
      {
        area: "2. Enforcement, Contracts & Training",
        activities: [
          "Represent UCAA in enforcement proceedings, appeals panels and mediation",
          "Review contracts with air operators, service providers and consultants",
          "Train technical staff on regulatory compliance and enforcement powers",
        ],
      },
    ],
    requirements: [
      "An LLB Degree from a recognised university; LLM in Air Law, International Law or equivalent is an advantage",
      "Enrolled Advocate of the High Court of Uganda",
      "At least 5 years post-admission legal experience, with aviation or regulatory law preferred",
      "Familiarity with the Chicago Convention, ICAO Standards and ECCAS/EAC frameworks",
      "Excellent drafting, research and advocacy skills in English",
      "Age 27–50 years at the date of application",
    ],
    desirable:
      "LLM specialisation in Air Law or International Law. Experience in CASSOA regulatory processes. Familiarity with Uganda Communications Commission or ERA regulatory practice.",
    specialSkills: [
      "Must possess outstanding legal drafting and interpretation skills",
      "Must have strong research abilities and the capacity to analyse complex international legal instruments",
      "Must be an effective communicator and advocate in both written and oral proceedings",
      "Must be a target achiever with demonstrated ability to manage multiple legal matters simultaneously",
    ],
  },

  6: {
    jobRef: "UCAA/ADV/EXT/06/2026",
    reportsTo: "Manager, Air Traffic Control",
    vacancies: 5,
    about:
      "The ATC Trainee (Graduate Entry) is a structured development programme designed to recruit and train the next generation of Ugandan air traffic controllers. Selected candidates will undergo an approved ATC training course before being assigned operational duties under supervision at Entebbe ACC.",
    accountabilities: [
      {
        area: "1. Training & Competency Development",
        activities: [
          "Successfully complete the UCAA-approved ATC Basic Training course (12 months)",
          "Attain and maintain medical fitness to ICAO Class 3 standard throughout training",
          "Demonstrate English language proficiency at ICAO level 4 or above",
        ],
      },
      {
        area: "2. Operational Readiness & Safety Culture",
        activities: [
          "Progress through on-the-job training (OJT) under a qualified OJTI until licence issue",
          "Meet all competency assessments within the prescribed training timelines",
          "Contribute positively to safety culture and shift team performance from day one",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree (minimum Second Class Lower) in Physics, Mathematics, Engineering, Aviation or related STEM field",
      "No prior ATC experience required — full ICAO ATC training is provided",
      "Excellent spatial awareness, multitasking ability and stress tolerance",
      "Normal colour vision; meets ICAO Class 3 medical fitness requirements",
      "Strong communication skills in English",
      "Age 21–30 years at the date of application",
    ],
    desirable:
      "A Private Pilot Licence (PPL) or any aviation-related voluntary experience. Demonstrated aptitude for mathematics and physics in degree studies.",
    specialSkills: [
      "Must demonstrate a strong aptitude for complex, multi-variable systems and quick situational assessment",
      "Must have excellent stress tolerance and composure when managing multiple competing priorities",
      "Must be adaptable and committed to continuous professional development throughout the training programme",
      "Must have a genuine passion for aviation safety and public service",
    ],
  },

  7: {
    jobRef: "UCAA/ADV/INT/01/2026",
    reportsTo: "Deputy Director General",
    vacancies: 1,
    about:
      "The Manager, Aerodrome Operations will lead all day-to-day operational activities at Entebbe International Airport, ensuring compliance with ICAO Annex 14 and UCAA Aerodrome Standards. This is an internal-only senior management role open exclusively to substantive UCAA staff.",
    accountabilities: [
      {
        area: "1. Aerodrome Operations Management",
        activities: [
          "Oversee airside and landside operations including movement areas, lighting and markings",
          "Manage a team of aerodrome operations officers and ground-handling liaison personnel",
          "Ensure the Aerodrome Manual is current, fully implemented and filed with UCAA",
        ],
      },
      {
        area: "2. Safety, Emergency & Budget",
        activities: [
          "Chair the Aerodrome Safety Committee and coordinate Wildlife Hazard Management",
          "Lead emergency response exercises in conjunction with Uganda Police and KCCA",
          "Prepare annual capital and operational budget proposals for Aerodrome Operations",
        ],
      },
    ],
    requirements: [
      "A Master's Degree in Airport Management, Aviation Operations or equivalent from a recognised university",
      "At least 8 years in aerodrome operations with a minimum of 3 years at supervisory level",
      "ICAO Aerodrome Operations certificate or equivalent (IATA/ACI-NA endorsed)",
      "Current substantive UCAA staff member at senior officer grade or above (internal applicants only)",
      "Demonstrated leadership, budget management and stakeholder engagement skills",
      "Age 30–55 years at the date of application",
    ],
    desirable:
      "ACI Airport Management Professional (AMP) accreditation. Experience in aerodrome master plan development and ICAO Universal Safety Oversight Audit Programme (USOAP) preparation.",
    specialSkills: [
      "Must be a seasoned leader with demonstrable experience in managing large, multidisciplinary aerodrome teams",
      "Must have outstanding stakeholder management skills across government agencies, airlines and ground handlers",
      "Must demonstrate excellent budget oversight and cost-control capabilities",
      "Must be decisive and effective in emergency coordination and crisis management",
    ],
  },

  8: {
    jobRef: "UCAA/ADV/EXT/07/2026",
    reportsTo: "Senior Air Traffic Controller",
    vacancies: 2,
    about:
      "The Approach Control Officer will provide approach and departure control service to IFR and VFR aircraft operating within the Entebbe Terminal Manoeuvring Area (TMA), ensuring safe and expeditious flow of traffic between the en-route and aerodrome environments.",
    accountabilities: [
      {
        area: "1. Approach & Departure Control Service",
        activities: [
          "Provide APP/DEP control service within the Entebbe TMA",
          "Issue clearances, traffic information and sequencing instructions to IFR arrivals and departures",
          "Manage holding stacks during periods of high traffic demand or adverse weather",
        ],
      },
      {
        area: "2. Coordination, Surveillance & Safety",
        activities: [
          "Coordinate traffic with Entebbe ADC and Entebbe ACC sectors",
          "Maintain radar surveillance and update flight progress strips",
          "Participate in contingency and emergency exercises as directed by the ATC Manager",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Aviation, Physics, Electronics or equivalent from a recognised university",
      "Valid ICAO ATC licence with APP rating (ADC rating is a strong additional advantage)",
      "Minimum 3 years post-rating operational ATC experience",
      "Current ICAO Class 3 medical certificate",
      "English Language Proficiency at ICAO level 4 or above",
      "Age 24–45 years at the date of application",
    ],
    desirable:
      "Experience with TMA automation or radar data processing systems. Familiarity with RVSM operations and reduced wake-turbulence spacing procedures.",
    specialSkills: [
      "Must demonstrate quick situational awareness and ability to sequence traffic efficiently",
      "Must be able to work rotating shifts including nights and weekends in an operational ATC environment",
      "Must have excellent team coordination skills for handoffs between ATC positions",
      "Must maintain composure and professionalism under high traffic volume conditions",
    ],
  },

  9: {
    jobRef: "UCAA/ADV/EXT/08/2026",
    reportsTo: "Principal Safety Inspector (Flight Operations)",
    vacancies: 1,
    about:
      "The Flight Operations Inspector will conduct oversight of Ugandan air operators' flight operations standards, including crew licensing, operations manuals, flight and duty time limitations, and operational control systems, in accordance with ICAO Annex 6 and UCAA Aviation Regulations.",
    accountabilities: [
      {
        area: "1. Flight Operations Oversight",
        activities: [
          "Inspect and audit Air Operator Certificate (AOC) holders' flight operations",
          "Review and approve Operations Manuals, Minimum Equipment Lists (MELs) and CDLs",
          "Monitor crew licensing currency and recurrency training programmes",
        ],
      },
      {
        area: "2. Investigation, Inspection & Standards",
        activities: [
          "Conduct en-route, line and simulator checks on commercial flight crew",
          "Investigate flight-operations-related incidents and accidents",
          "Develop and update Flight Operations Inspector guidance material and checklists",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Aeronautical Engineering, Aviation Science or equivalent from a recognised university",
      "Valid Airline Transport Pilot Licence (ATPL) or CPL with multi-engine instrument rating",
      "Minimum 6 years flight operations experience with a scheduled AOC holder",
      "Familiarity with ICAO Annex 6 and UCAA Part-OPS regulations",
      "Strong written English for regulatory correspondence and investigation reports",
      "Age 28–50 years at the date of application",
    ],
    desirable:
      "Experience with LOSA (Line Operations Safety Audit) methodology. Familiarity with flight deck automation (EFIS, FMS, ACARS) on jet transport aircraft.",
    specialSkills: [
      "Must possess hands-on flight expertise combined with strong regulatory audit competencies",
      "Must have excellent technical report-writing skills for investigation and oversight documentation",
      "Must demonstrate the ability to communicate complex regulatory requirements clearly to flight crew",
      "Must be a target achiever with demonstrable success in managing a structured oversight inspection programme",
    ],
  },

  10: {
    jobRef: "UCAA/ADV/EXT/09/2026",
    reportsTo: "Director, Aviation Safety",
    vacancies: 1,
    about:
      "The Dangerous Goods Inspector will enforce compliance with ICAO Technical Instructions for the Safe Transport of Dangerous Goods by Air (Doc 9284) and IATA Dangerous Goods Regulations across all operators, freight forwarders and ground handlers at Ugandan airports.",
    accountabilities: [
      {
        area: "1. Dangerous Goods Compliance & Inspection",
        activities: [
          "Inspect acceptance procedures for dangerous goods shipments at Entebbe International Airport",
          "Audit and approve Dangerous Goods training programmes for operators and ground handlers",
          "Liaise with Uganda Revenue Authority and IATA on cross-border DG compliance matters",
        ],
      },
      {
        area: "2. Investigation, Enforcement & Reporting",
        activities: [
          "Investigate dangerous goods incidents, occurrences and undeclared shipments",
          "Issue compliance notices and oversee corrective action plans for non-compliant entities",
          "Prepare quarterly DG compliance reports for the Director of Aviation Safety",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Chemistry, Engineering, Aviation or a related science from a recognised university",
      "IATA Dangerous Goods Regulations Category 8 or Category 10 certificate (current edition)",
      "Minimum 4 years experience in dangerous goods compliance, logistics or aviation safety oversight",
      "Knowledge of ICAO Doc 9284 and current IATA DGR edition",
      "Strong investigative and report-writing skills in English",
      "Age 25–48 years at the date of application",
    ],
    desirable:
      "Experience with IATA CEIV Pharma or IATA CEIV Fresh programmes. Knowledge of URA Customs procedures for regulated dangerous goods imports and exports.",
    specialSkills: [
      "Must possess outstanding knowledge of hazardous materials classification and segregation rules",
      "Must have strong investigative skills for identifying undeclared or misdeclared shipments",
      "Must be able to conduct inspections and audits independently with minimal supervision",
      "Must have good interpersonal and communication skills for effective engagement with freight forwarders",
    ],
  },

  11: {
    jobRef: "UCAA/ADV/EXT/10/2026",
    reportsTo: "Director, Aviation Safety",
    vacancies: 1,
    about:
      "The Aviation Security Inspector will conduct oversight of aviation security programmes at Ugandan airports and air carriers, ensuring compliance with ICAO Annex 17, the National Civil Aviation Security Programme (NCASP) and UCAA Aviation Security Regulations.",
    accountabilities: [
      {
        area: "1. Security Audit & Programme Oversight",
        activities: [
          "Conduct security audits and inspections of airports, airlines and regulated agents",
          "Review and approve Aviation Security Programmes (ASPs) of operators",
          "Represent UCAA at ICAO Universal Security Audit Programme (USAP) review meetings",
        ],
      },
      {
        area: "2. Testing, Investigation & Training",
        activities: [
          "Test passenger, baggage and cargo screening processes through covert testing",
          "Investigate aviation security incidents and security programme breaches",
          "Train UCAA security oversight inspectors and liaise with Uganda Police Air Wing",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Security Studies, Law Enforcement, Aviation or related field from a recognised university",
      "ICAO Aviation Security training (Category 3, 4, 5 or 6, or equivalent national programme)",
      "Minimum 4 years experience in aviation security operations or regulatory oversight",
      "Clean police record; must be able to obtain and maintain national security clearance",
      "Excellent observation, interviewing and report-writing skills in English",
      "Age 25–48 years at the date of application",
    ],
    desirable:
      "ICAO USAP audit experience. Training in behavioural detection techniques. Certification in security management or a recognised security professional designation.",
    specialSkills: [
      "Must possess outstanding observational skills and situational awareness for covert testing",
      "Must have strong interviewing and intelligence-gathering techniques",
      "Must demonstrate high levels of personal integrity and the ability to handle classified information",
      "Must be a seasoned professional with demonstrable experience in managing security audit programmes",
    ],
  },

  12: {
    jobRef: "UCAA/ADV/EXT/11/2026",
    reportsTo: "Director, Finance & Administration",
    vacancies: 1,
    about:
      "The Procurement Officer will manage UCAA's procurement processes in compliance with the Public Procurement and Disposal of Public Assets (PPDA) Act, ensuring value for money and transparency across all procurement categories. This is a contract role renewable subject to performance.",
    accountabilities: [
      {
        area: "1. Procurement Management & Compliance",
        activities: [
          "Prepare and publish procurement notices on the PPDA portal and UCAA website",
          "Manage tender evaluation committees and maintain complete procurement records",
          "Prepare PPDA compliance reports and respond to procurement audits",
        ],
      },
      {
        area: "2. Contracts, Suppliers & Performance",
        activities: [
          "Negotiate contracts and service-level agreements with approved suppliers",
          "Monitor contract performance and coordinate with end-user departments",
          "Maintain the approved supplier register and conduct due-diligence checks",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Procurement & Supply Chain Management, Commerce or related field from a recognised university",
      "Full or associate membership of the Chartered Institute of Procurement & Supply (CIPS) is preferred",
      "Minimum 2 years experience in public-sector procurement under the PPDA Act framework",
      "Proficiency in MS Office and procurement management information systems",
      "Strong professional ethics and high attention to detail",
      "Age 23–45 years at the date of application",
    ],
    desirable:
      "PPDA certification or formal training. Experience with the Government Procurement Portal (GPP). Knowledge of procurement in the transport or infrastructure sector.",
    specialSkills: [
      "Must possess outstanding negotiating skills and the ability to secure value for money for the Authority",
      "Must have good interpersonal and communication skills for managing supplier and internal stakeholder relationships",
      "Must be a seasoned professional in procurement ethics, with demonstrable adherence to public accountability standards",
      "Must be a target achiever with hands-on experience in managing end-to-end procurement processes",
    ],
  },

  13: {
    jobRef: "UCAA/ADV/EXT/12/2026",
    reportsTo: "Manager, ICT & Systems",
    vacancies: 1,
    about:
      "The Network Engineer will design, implement and maintain UCAA's wide-area and campus network infrastructure, ensuring high availability of mission-critical aviation systems including AIS/AIM, AMHS, AFTN and corporate IT networks across all UCAA sites.",
    accountabilities: [
      {
        area: "1. Network Design & Infrastructure Management",
        activities: [
          "Design and manage LAN, WAN, MPLS and VPN network topologies",
          "Configure and maintain Cisco/Juniper switches, routers and next-generation firewalls",
          "Monitor network performance with SNMP/NetFlow tools (SolarWinds, PRTG)",
        ],
      },
      {
        area: "2. Security, Availability & Vendor Management",
        activities: [
          "Ensure 99.9% uptime of aeronautical fixed service (AFS) and corporate IT networks",
          "Implement network security policies, VLANs and access control lists",
          "Liaise with MTN/Liquid Telecom on leased-line and VSAT connectivity issues",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Computer Networks, Telecommunications or Information Technology from a recognised university",
      "CCNP or equivalent network engineering certification (JNCIP, CompTIA Network+)",
      "Minimum 3 years enterprise network engineering experience",
      "Hands-on experience with routing protocols (OSPF, BGP, EIGRP)",
      "Knowledge of network security principles and next-generation firewall management",
      "Age 24–42 years at the date of application",
    ],
    desirable:
      "Experience with aeronautical fixed service (AFS) or AFTN/AMHS networks. ITIL Foundation certification. Experience with SD-WAN solutions.",
    specialSkills: [
      "Must have outstanding hands-on troubleshooting skills for diagnosing complex network issues",
      "Must be willing to provide 24/7 on-call support for critical aeronautical and corporate network incidents",
      "Must have good interpersonal skills for vendor management and cross-departmental coordination",
      "Must demonstrate a strong commitment to network security and protecting aviation-critical systems",
    ],
  },

  14: {
    jobRef: "UCAA/ADV/INT/02/2026",
    reportsTo: "Director, Air Navigation Services",
    vacancies: 1,
    about:
      "The Principal, Aeronautical Information Services (AIS) will lead UCAA's AIS/AIM function, overseeing the production, validation and distribution of aeronautical data and information products including AIPs, NOTAMs, AIC and aeronautical charts in accordance with ICAO Annex 15 and Doc 8126. Open to verified CAA staff only.",
    accountabilities: [
      {
        area: "1. AIS/AIM Production & Quality Assurance",
        activities: [
          "Manage the production and quality assurance of Uganda's Aeronautical Information Publication (AIP) and AIP Supplements",
          "Oversee the NOTAM office — originating, checking and distributing NOTAMs via AFTN/AMHS",
          "Coordinate with survey, obstacle and terrain data providers for aeronautical chart accuracy",
        ],
      },
      {
        area: "2. AIM Transition & Stakeholder Engagement",
        activities: [
          "Lead the transition from AIS to Aeronautical Information Management (AIM) in line with ICAO Doc 10066",
          "Represent UCAA at ICAO AFI AIS/MAP meetings and ESARMA conferences",
          "Manage a team of AIS specialists and AIM data technicians",
        ],
      },
    ],
    requirements: [
      "A Bachelor's Degree in Aeronautical Science, Geospatial Information or a related field from a recognised university",
      "ICAO AIS/AIM training (Category 1–4 or equivalent national programme)",
      "Minimum 6 years AIS operational experience with at least 2 years at supervisory level",
      "Current substantive UCAA staff member at Principal or Senior Officer level (internal applicants only)",
      "Knowledge of AIXM 5.1, SWIM and WXXM standards is an added advantage",
      "Age 28–52 years at the date of application",
    ],
    desirable:
      "Experience with the ICAO GANP (Global Air Navigation Plan) AIM transition roadmap. Proficiency in GIS tools (ArcGIS, QGIS) for obstacle and terrain data management.",
    specialSkills: [
      "Must possess outstanding data quality management skills and meticulous attention to aeronautical data accuracy",
      "Must have demonstrated experience managing NOTAM workflows in a live operational AIS environment",
      "Must have good leadership skills for managing a specialist team of AIS and AIM technicians",
      "Must be able to represent UCAA authoritatively in regional and international AIS/AIM forums",
    ],
  },
};

const DEFAULT_DETAIL: JobDetail = {
  jobRef: "UCAA/ADV/EXT/00/2026",
  reportsTo: "Relevant Director",
  vacancies: 1,
  about:
    "This is an exciting opportunity to join Uganda's national aviation regulator. Full details will be provided to shortlisted candidates.",
  accountabilities: [
    {
      area: "1. Core Duties",
      activities: [
        "Carry out the duties of the post as assigned by the supervisor",
        "Uphold UCAA values of safety, integrity and service excellence",
      ],
    },
  ],
  requirements: [
    "See advertised qualification and experience requirements",
    "Uganda citizenship or valid work permit",
  ],
  desirable: "Relevant professional certification or membership.",
  specialSkills: [
    "Must possess good interpersonal and communication skills",
    "Must be a team player with a strong work ethic",
  ],
};

// ─── Saved-jobs helpers ───────────────────────────────────────────────────────

const SAVED_KEY = "caa_saved_jobs_v1";
function readSaved(): number[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function writeSaved(ids: number[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

function JobDetailPage() {
  const { jobId } = Route.useSearch();
  const { jobs, auth, openSignInPrompt, pushToast, trackEvent } = useApp();
  const navigate = useNavigate();
  const job = jobs.find((j) => j.id === jobId);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setSaved(readSaved().includes(jobId)); }, [jobId]);
  useEffect(() => {
    if (job) trackEvent({ type: "job_view", jobId: job.id, jobTitle: job.title });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  if (!job) {
    return (
      <div className="px-4 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-caa-danger mx-auto mb-4" />
        <h2 className="font-bold text-xl text-caa-body">Vacancy not found</h2>
        <p className="text-sm text-caa-muted mt-2 mb-6">This listing may have been removed or the link is invalid.</p>
        <Link to="/vacancies" className="inline-flex items-center gap-2 px-5 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded-md hover:bg-caa-navy-2 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Vacancies
        </Link>
      </div>
    );
  }

  const detail = DETAILS[jobId] ?? DEFAULT_DETAIL;
  const isExpired = new Date(job.closesAt) < new Date();

  const toggleSaved = () => {
    const cur = readSaved();
    const next = cur.includes(jobId) ? cur.filter((i) => i !== jobId) : [...cur, jobId];
    writeSaved(next);
    setSaved(next.includes(jobId));
    pushToast({ type: "info", title: next.includes(jobId) ? "Saved for later" : "Removed from saved", message: job.title });
    if (next.includes(jobId)) trackEvent({ type: "save_job", jobId: job.id, jobTitle: job.title });
  };

  const handleApply = () => {
    trackEvent({ type: "apply_click", jobId: job.id, jobTitle: job.title });
    if (!auth.isLoggedIn) { openSignInPrompt(); return; }
    navigate({ to: "/apply", search: { jobId } });
  };

  const padVacancies = String(detail.vacancies).padStart(2, "0");

  return (
    <div className="bg-gray-100 min-h-screen py-6 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">

        {/* ── Action bar (outside document) ───────────────────── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Link
            to="/vacancies"
            className="inline-flex items-center gap-1.5 text-caa-navy text-sm font-semibold hover:text-caa-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> All Vacancies
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 rounded bg-white hover:border-caa-navy text-gray-600 hover:text-caa-navy transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            <button
              onClick={toggleSaved}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-300 rounded bg-white hover:border-caa-navy text-gray-600 hover:text-caa-navy transition-colors"
            >
              {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* ── Document card ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-300 shadow-md print:shadow-none">

          {/* Document header */}
          <div className="bg-caa-navy px-8 py-5 flex items-center gap-5">
            <img src={logo} alt="UCAA" className="h-16 w-auto bg-white rounded p-1 shrink-0" />
            <div>
              <p className="text-white font-extrabold text-xl uppercase tracking-wide leading-snug">
                Uganda Civil Aviation Authority
              </p>
              <p className="text-white/70 text-sm mt-1">
                Headquarters: Entebbe International Airport &nbsp;|&nbsp; P.O. Box 5536, Kampala
              </p>
              <p className="text-white/70 text-sm">
                Tel: +256 312 352 000 &nbsp;|&nbsp; Email: aviation@caa.co.ug &nbsp;|&nbsp; www.caa.co.ug
              </p>
            </div>
          </div>

          {/* Gold accent line */}
          <div className="h-1 bg-caa-gold" />

          {/* Advertisement type */}
          <div className="px-8 py-5 border-b border-gray-300 text-center">
            <h2 className="font-bold text-lg uppercase underline tracking-wide">
              {job.visibility === "internal" ? "Internal Job Advertisement" : "External Job Advertisement"}
            </h2>
            <p className="text-sm mt-2 max-w-2xl mx-auto text-gray-700 leading-relaxed">
              Applications are invited from suitably qualified{" "}
              {job.visibility === "internal"
                ? "employees of Uganda Civil Aviation Authority"
                : "Ugandan citizens and residents"}{" "}
              to fill the following vacant position in the{" "}
              <strong>{job.dept}</strong> Directorate, as detailed below.
            </p>
          </div>

          {/* Reference table */}
          <div className="px-8 pt-6 pb-4">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  { label: "JOB REF",      value: detail.jobRef },
                  { label: "POSITION",     value: job.title, bold: true },
                  { label: "REPORTS TO",   value: detail.reportsTo },
                  { label: "SALARY LEVEL", value: job.salaryBand },
                  { label: "VACANCIES",    value: padVacancies },
                ].map(({ label, value, bold }) => (
                  <tr key={label}>
                    <td className="border border-gray-400 px-4 py-2.5 font-bold bg-gray-50 w-40 align-top text-[13px]">{label}</td>
                    <td className={`border border-gray-400 px-4 py-2.5 text-[13px] ${bold ? "font-bold" : ""}`}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Job purpose */}
          <div className="px-8 pb-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">JOB PURPOSE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-4 py-3 text-[13px] leading-relaxed text-gray-800">{detail.about}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Principal accountabilities */}
          <div className="px-8 pb-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase w-[38%]">Principal Accountabilities</th>
                  <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">Specific Activities</th>
                </tr>
              </thead>
              <tbody>
                {detail.accountabilities.map((acc, i) => (
                  <tr key={i}>
                    <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top">{acc.area}</td>
                    <td className="border border-gray-400 px-4 py-3 text-[13px]">
                      <ul className="space-y-1.5">
                        {acc.activities.map((act, j) => (
                          <li key={j} className="flex gap-2 leading-snug">
                            <span className="text-gray-400 shrink-0 mt-0.5">›</span>
                            {act}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Person specifications */}
          <div className="px-8 pb-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th colSpan={2} className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">Person Specifications</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top w-[38%]">Essential Requirements</td>
                  <td className="border border-gray-400 px-4 py-3 text-[13px]">
                    <ol className="space-y-1.5 list-decimal list-inside">
                      {detail.requirements.map((r, i) => (
                        <li key={i} className="leading-snug">{r}</li>
                      ))}
                    </ol>
                  </td>
                </tr>
                {detail.desirable && (
                  <tr>
                    <td className="border border-gray-400 px-4 py-3 font-semibold text-[13px] align-top">Desirable requirements</td>
                    <td className="border border-gray-400 px-4 py-3 text-[13px] leading-relaxed">{detail.desirable}</td>
                  </tr>
                )}
                {detail.specialSkills.length > 0 && (
                  <tr>
                    <td colSpan={2} className="border border-gray-400 px-4 py-3 text-[13px]">
                      <p className="font-bold uppercase mb-2">Special Skills and Attributes</p>
                      <ol className="space-y-1.5 list-decimal list-inside">
                        {detail.specialSkills.map((s, i) => (
                          <li key={i} className="leading-snug">{s}</li>
                        ))}
                      </ol>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* How to apply */}
          <div className="px-8 pb-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-4 py-2.5 bg-gray-50 text-left font-bold text-[13px] uppercase">How to Apply</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-4 py-4 text-[13px]">
                    <ol className="space-y-2 list-decimal list-inside">
                      <li className="leading-relaxed">
                        If you meet the minimum requirements, please submit an updated CV{" "}
                        <strong>(3 pages maximum)</strong> with a <strong>cover letter</strong> and relevant{" "}
                        <strong>academic documents</strong> as <strong>ONE PDF</strong> file to HR Department by <strong>e-mail</strong>.
                      </li>
                      <li className="leading-relaxed">
                        Submit the complete application to the recruitment email:{" "}
                        <strong>recruitment@caa.co.ug</strong>
                      </li>
                      <li className="leading-relaxed">
                        Please note that falsification of information is an offence in UCAA. You are advised to only apply for jobs where you meet the minimum requirements as indicated in the job description.
                      </li>
                      <li className="leading-relaxed">Physical/hard copy applications will not be accepted.</li>
                    </ol>
                    <p className="mt-4 mb-1">For any inquiries or assistance, please contact: —</p>
                    <p className="font-bold">Mr. Frank Wagunyanya — PHRO @ TEL: 0772 405 330</p>
                    <p className="font-bold">Syned Aryeija — PSA @ TEL: 0751 351 771</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Closing notice */}
          <div className="px-8 pb-8 text-[13px] text-gray-800 space-y-2">
            <p>
              Applications are to be received not later than{" "}
              <strong>5:00pm, {job.closes}.</strong>
            </p>
            <p>
              It is the duty of the applicant to ensure that his/her application is received by the indicated date. Late applications will not be entertained under any circumstances.
            </p>
            <p className="font-bold italic mt-3">
              We pledge to conduct a transparent recruitment process!
            </p>
            <div className="mt-3">
              <p className="font-bold">The Director Human Resource &amp; Administration,</p>
              <p className="font-bold">Uganda Civil Aviation Authority (Head Office)</p>
              <p className="font-bold">P.O Box 5536 — Kampala, Uganda</p>
            </div>
          </div>

        </div>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        {isExpired ? (
          <p className="mt-4 text-center text-sm font-semibold text-caa-danger">Applications for this vacancy have closed.</p>
        ) : (
          <div className="mt-4 flex justify-center gap-3 pb-6">
            <button
              onClick={toggleSaved}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-400 rounded text-sm font-semibold bg-white hover:border-caa-navy hover:text-caa-navy transition-colors"
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? "Saved" : "Save for later"}
            </button>
            <button
              onClick={handleApply}
              className="px-8 py-2.5 bg-caa-navy text-white text-sm font-semibold rounded hover:bg-caa-navy-2 transition-colors"
            >
              Apply Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
