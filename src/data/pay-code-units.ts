import type { UnitAlias } from './unit-aliases.ts'

/** Census pay codes no budget publishes, each joined by hand review to the budget unit whose staff it pays; the comment gives the pay code's latest name, then the unit's. */
export const PAY_CODE_UNITS: readonly UnitAlias[] = [
  { code: '110300', sameAs: '110299' }, // Pres Tribal Advisor Office Ops; Pres Tribal Advisor Office
  { code: '110453', sameAs: '110451' }, // BOAT General BizOps; Knight Campus Shared Services -BOAT
  { code: '110511', sameAs: '110510' }, // MIIP Admin; KCIP MIIP
  { code: '110521', sameAs: '110520' }, // BIIP Admin; KCIP BioInfo Internship Prgm (BIIP)
  { code: '110861', sameAs: '110860' }, // Human Perf Alliance OR - Moonshot; Human Performance Alliance at OR
  { code: '120001', sameAs: '120100' }, // OTP Provost; OTP Provost Ops
  { code: '211181', sameAs: '211160' }, // EI CMAE - Grad & Post Grad Ops; EI Ctr for Multicult & Acad Excel
  { code: '221110', sameAs: '221102' }, // DSGN Communications; DSGN Communications & Recruiting
  { code: '221575', sameAs: '221610' }, // DSGN Product Design Program; DSGN Product Design
  { code: '221611', sameAs: '221610' }, // DSGN Sports Product Design Program; DSGN Product Design
  { code: '221700', sameAs: '221701' }, // DSGN School of PPPM; DSGN PPPM Administration
  { code: '222011', sameAs: '222010' }, // CAS Classics Department; CAS Classics
  { code: '222014', sameAs: '222018' }, // CAS Humanities Program Operations; CAS Humanities Program
  { code: '222015', sameAs: '222023' }, // CAS Medieval Stds Prog Operations; CAS Medieval Studies Program
  { code: '222020', sameAs: '222019' }, // CAS Comp Lit Journal Operations; CAS Comparative Literature Journal
  { code: '222025', sameAs: '222024' }, // CAS Comp Lit Program Operations; CAS Comparative Literature Program
  { code: '222030', sameAs: '222029' }, // CAS Creative Writing Operations; CAS Creative Writing
  { code: '222041', sameAs: '222040' }, // CAS East Asian Lang & Lit Dept; CAS East Asian Language Literature
  { code: '222051', sameAs: '222050' }, // CAS English Department; CAS English
  { code: '222060', sameAs: '222059' }, // CAS Folklore Operations; CAS Folklore
  { code: '222071', sameAs: '222070' }, // CAS German and Scandinavian Dept; CAS German and Scandinavian
  { code: '222085', sameAs: '222084' }, // CAS Philosophy Operations; CAS Philosophy
  { code: '222095', sameAs: '222094' }, // CAS Religious Studies Operations; CAS Religious Studies
  { code: '222096', sameAs: '222094' }, // CAS Religious Stds Arabic Language; CAS Religious Studies
  { code: '222111', sameAs: '222110' }, // CAS REEES Operations; CAS REEES
  { code: '222121', sameAs: '222120' }, // CAS Theatre Arts Operations; CAS Theatre Arts
  { code: '222150', sameAs: '222149' }, // CAS Yamada Lang Center Operations; CAS Yamada Language Center
  { code: '222181', sameAs: '222160' }, // CAS AEI Intensive Program Admin; CAS AEI American English Institute
  { code: '222240', sameAs: '222235' }, // CAS Judaic Studies Prog Operations; CAS Judaic Studies Program
  { code: '222250', sameAs: '222017' }, // CAS Humanities Coop Operations; CAS Humanities Cooperative Programs
  { code: '222400', sameAs: '222410' }, // CAS Global Studies and Languages; CAS School of Global Stds & Lang
  { code: '222510', sameAs: '222505' }, // CAS Anthropology Operations; CAS Anthropology
  { code: '222520', sameAs: '222515' }, // CAS Asian Studies Operations; CAS Asian Studies
  { code: '222531', sameAs: '222530' }, // CAS Economics Department; CAS Economics
  { code: '222537', sameAs: '222530' }, // CAS Economics SAIL Camp; CAS Economics
  { code: '222540', sameAs: '222539' }, // CAS Environmental Stds Operations; CAS Environmental Studies
  { code: '222542', sameAs: '222645' }, // CAS Food Studies; CAS Food Studies
  { code: '222550', sameAs: '222545' }, // CAS Ethnic Studies Operations; CAS Ethnic Studies
  { code: '222552', sameAs: '222551' }, // CAS Geography Operations; CAS Geography
  { code: '222555', sameAs: '222554' }, // CAS History Operations; CAS History
  { code: '222560', sameAs: '222559' }, // CAS Int'l Studies Operations; CAS International Studies
  { code: '222565', sameAs: '222564' }, // CAS Linguistics Operations; CAS Linguistics
  { code: '222570', sameAs: '222569' }, // CAS Political Science Operations; CAS Political Science
  { code: '222585', sameAs: '222580' }, // CAS Sociology Operations; CAS Sociology
  { code: '222590', sameAs: '222589' }, // CAS Women's Studies Operations; CAS Women's Studies
  { code: '222600', sameAs: '222601' }, // CAS OCIAS Operations; CAS Or Consortium Int'l & Area Stds
  { code: '222630', sameAs: '222631' }, // CAS Infographics Lab Operations; CAS Infographics Lab
  { code: '222970', sameAs: '223510' }, // CAS Physics Faculty Support; CAS Physics
  { code: '223131', sameAs: '223100' }, // CAS Bio Teaching/Reseach; CAS Biology
  { code: '223252', sameAs: '223250' }, // CAS Chem Research/Theoretical Sci; CAS Chemistry
  { code: '223411', sameAs: '223400' }, // CAS CIS Department Operations; CAS CIS Computer & Information Sci
  { code: '223460', sameAs: '223455' }, // CAS Multidiscip Sci Program Ops; CAS Multidisciplinary Science Prgm
  { code: '223470', sameAs: '223469' }, // CAS Earth Sciences Operations; CAS Earth Sciences
  { code: '223500', sameAs: '223501' }, // CAS Mathematics Operations; CAS Mathematics
  { code: '223511', sameAs: '223510' }, // CAS Physics Department; CAS Physics
  { code: '223521', sameAs: '223520' }, // CAS Psychology Office Operations; CAS Psychology
  { code: '223525', sameAs: '223520' }, // CAS Psychology Faculty Support; CAS Psychology
  { code: '223540', sameAs: '223541' }, // CAS SCDS Operations; CAS School of Comptr & Data Science
  { code: '223546', sameAs: '223545' }, // CAS Data Science Operations; CAS Department of Data Science
  { code: '223802', sameAs: '223815' }, // CAS Dean's Office/Administration; CAS Dean's Office Administration
  { code: '223861', sameAs: '223915' }, // CAS Central Grant Administration; CAS Grant Administration
  { code: '223887', sameAs: '223883' }, // CAS Cinema Studies Operations; CAS Cinema Studies
  { code: '223904', sameAs: '223905' }, // CAS IT Research Support; CAS IT
  { code: '223906', sameAs: '223905' }, // CAS IT Operations; CAS IT
  { code: '223971', sameAs: '22397A' }, // CAS ASU1 Operations; CAS Academic Support Unit 1
  { code: '223972', sameAs: '22397B' }, // CAS ASU2 Operations; CAS Academic Support Unit 2
  { code: '223973', sameAs: '22397F' }, // CAS ASU6 Operations; CAS Academic Support Unit 6
  { code: '223974', sameAs: '22397G' }, // CAS ASU8 Operations; CAS Academic Support Unit 8
  { code: '223981', sameAs: '22397C' }, // CAS ASU3 Operations; CAS Academic Support Unit 3
  { code: '223982', sameAs: '22397D' }, // CAS ASU4 Operations; CAS Academic Support Unit 4
  { code: '223983', sameAs: '22397E' }, // CAS ASU5 Operations; CAS Academic Support Unit 5
  { code: '223991', sameAs: '223990' }, // CASDAS Human Resources Operations; CAS Division of Admin Svc-CASDAS
  { code: '223992', sameAs: '223990' }, // CAS Business Office Fin Ops; CAS Division of Admin Svc-CASDAS
  { code: '223994', sameAs: '223990' }, // CAS Business Office Purchasing Ops; CAS Division of Admin Svc-CASDAS
  { code: '223995', sameAs: '223990' }, // CASDAS Travel Operations; CAS Division of Admin Svc-CASDAS
  { code: '223996', sameAs: '223990' }, // CAS Business Office Sen Director; CAS Division of Admin Svc-CASDAS
  { code: '223997', sameAs: '223990' }, // CASDAS General Operations; CAS Division of Admin Svc-CASDAS
  { code: '224110', sameAs: '224100' }, // CHC Instruction-Resident and PDTF; CHC College Instruction
  { code: '224120', sameAs: '224100' }, // CHC Instruction-Affiliated Faculty; CHC College Instruction
  { code: '225651', sameAs: '225650' }, // LCB Portland Programs Admin Office; LCB Portland Programs Admin
  { code: '226210', sameAs: '226200' }, // Ed intoCareers Operations; Ed intoCareers
  { code: '226315', sameAs: '226316' }, // Ed CATE Administration; Ed CATE Cntr Advanced Tech in Educ
  { code: '226360', sameAs: '226650' }, // Ed Center for Equity Promotion; Ed CEQP Center for Equity GMU
  { code: '226410', sameAs: '226431' }, // Ed Family and Human Services; Ed CPHS Department
  { code: '226420', sameAs: '226451' }, // Ed Communication Disorders & Sci; Ed SPECS Department
  { code: '226440', sameAs: '226431' }, // Ed Counseling, Family & Human Srvcs; Ed CPHS Department
  { code: '226460', sameAs: '226431' }, // Ed Counseling Psychology; Ed CPHS Department
  { code: '226507', sameAs: '226506' }, // Ed CORE Administration; Ed CORE Ctr At Oregon For Res In Ed
  { code: '226540', sameAs: '226535' }, // Ed Early Childhood CARES; Ed EC Cares
  { code: '226541', sameAs: '226535' }, // EC Cares Faculty Academic Year; Ed EC Cares
  { code: '226621', sameAs: '226620' }, // Ed DESTNY Admin; Ed DESTNY Disability, EI, SSET
  { code: '226900', sameAs: '226471' }, // Ed Methodology, Policy & Leadership; Ed EMPL Department
  { code: '226904', sameAs: '226471' }, // Ed EMP&L Administrator Lic. Program; Ed EMPL Department
  { code: '226906', sameAs: '226471' }, // EMPL Acad Ext Programs; Ed EMPL Department
  { code: '226920', sameAs: '226491' }, // ED Education Studies; Ed EDST Department
  { code: '226940', sameAs: '226451' }, // Ed School Psychology; Ed SPECS Department
  { code: '226960', sameAs: '226451' }, // Ed Special Education; Ed SPECS Department
  { code: '226975', sameAs: '226620' }, // Ed SSET Sec Sp Ed & Transition Prog; Ed DESTNY Disability, EI, SSET
  { code: '228831', sameAs: '228830' }, // Law LLM; Law LLM
  { code: '228841', sameAs: '228840' }, // CRES; Law CRES
  { code: '228881', sameAs: '228880' }, // Law Undergrad Program; Law Undergraduate
  { code: '229611', sameAs: '229610' }, // SOMD Academic Music Operations; SOMD Academic Music Dept
  { code: '229621', sameAs: '229620' }, // SOMD Music Performance Operations; SOMD Music Performance Dept
  { code: '229823', sameAs: '229800' }, // SOMD Dance Instruction; SOMD Dance
  { code: '230100', sameAs: '230101' }, // BI Ballmer Institute Operations; BI Administration
  { code: '230200', sameAs: '230201' }, // BI Ballmer Institute Instruction; BI Academic Programs
  { code: '230310', sameAs: '230301' }, // BI Research Administration; BI Research Operations
  { code: '262300', sameAs: '262301' }, // EM Financial Aid Operations; EM Financial Aid & Scholarships
  { code: '262410', sameAs: '262400' }, // UESS FYE Programs; UESS First Year Experience
  { code: '264051', sameAs: '264050' }, // DGE CAPS Operations; DGE Ctr for Asian & Pacific Stds
  { code: '265100', sameAs: '265102' }, // GS Administrative Operations; GS Administration and Operations
  { code: '266300', sameAs: '266601' }, // MNCH/OSMA Research Ops; Mus of Nat & Cult Hist
  { code: '266600', sameAs: '266601' }, // MNCH Operations; Mus of Nat & Cult Hist
  { code: '267051', sameAs: '267050' }, // UESS Admin Operations; UESS Administration
  { code: '267500', sameAs: '267501' }, // University Counseling Center; Counseling Center Ops
  { code: '267810', sameAs: '267800' }, // UESS Advising Operations; UESS Exploring Advising
  { code: '267816', sameAs: '267800' }, // UESS OAA Academic Advising; UESS Exploring Advising
  { code: '267820', sameAs: '267819' }, // UESS AEC Operations; UESS Accessible Education Center
  { code: '267841', sameAs: '267840' }, // UESS Degree Progression Operations; UESS Degree Progression
  { code: '410180', sameAs: '410189' }, // SRS Insurance Office Operations; SRS Risk & Insurance
  { code: '410240', sameAs: '410203' }, // FASS Information Technology; FASS Information Technology
  { code: '441160', sameAs: '441060' }, // HR Community of Practice Support; HR Community of Practice
  { code: '450401', sameAs: '450400' }, // SRS EHS General Operations; SRS Envtl Hlth & Safety (EHS)
  { code: '460100', sameAs: '460500' }, // CS Transportation Services Ops; CS Transportation Services
  { code: '460509', sameAs: '460500' }, // CS Transportation; CS Transportation Services
  { code: '535000', sameAs: '531111' }, // UA JSMA Education; Jordan Schnitzer Mus of Art
  { code: '604211', sameAs: '604210' }, // Rsch COI and Export Controls Ops; Rsch COI and Export Controls
  { code: '611112', sameAs: '601100' }, // Rsch Finance & Business Admin Ops; Rsch Finance & Business Admin
  { code: '621000', sameAs: '620000' }, // Rsch RCS Operations; Rsch Research Compliance Services
  { code: '630051', sameAs: '264299' }, // IA Ctr Applied Secnd Lang Stds Op; DGE Ctr Applied Second Lang Studies
  { code: '630610', sameAs: '660500' }, // Rsch Greenhouse Operations; Rsch Greenhouse
  { code: '630671', sameAs: '630670' }, // Rsch Genomics Sequencing; Rsch Genomics & Cell Sorting Srvcs
  { code: '630900', sameAs: '630899' }, // Rsch Material Science Institute; Rsch Material Science Institute
  { code: '631410', sameAs: '631400' }, // Rsch OMQ Op & Phys Res; Rsch Ctr Optical Molec Quant Sci
  { code: '631411', sameAs: '631400' }, // Rsch Chem-Oregon Ctr for Optics; Rsch Ctr Optical Molec Quant Sci
  { code: '631610', sameAs: '631600' }, // EI Ctr on Diversity & Community; EI Ctr on Diversity & Community
  { code: '631810', sameAs: '631800' }, // Rsch CAMCOR Administration; Rsch Ctr Adv Mat Charact in OR
  { code: '631811', sameAs: '631800' }, // Rsch CAMCOR Operations; Rsch Ctr Adv Mat Charact in OR
  { code: '631910', sameAs: '631900' }, // Rsch Inst Ecol & Evol Operations; Rsch Inst Ecology & Evolution
  { code: '632010', sameAs: '632000' }, // Rsch COACh; Rsch Comm Adv of Women Chemists
  { code: '632110', sameAs: '222660' }, // NW Indian Lang Inst Ops; CAS NW Indian Lang Inst
  { code: '632501', sameAs: '632500' }, // Rsch Prevention Sci Inst Operations; Rsch Prevention Science Institute
  { code: '632810', sameAs: '632800' }, // Rsch IFS Inst. Fundamental Sci Ops; Rsch Inst. for Fundamental Science
  { code: '639901', sameAs: '639900' }, // Rsch SPS Administration; Rsch Sponsored Projects Services
  { code: '640711', sameAs: '640710' }, // Rsch Econ Dev & Industry Engage Ops; Rsch Econ Dev & Industry Engagement
  { code: '641241', sameAs: '641240' }, // Rsch OACISS Ops; Rsch OACISS
  { code: '641251', sameAs: '641250' }, // Rsch Neuroinformatics Center; Rsch Neuroinformatics Center
  { code: '641401', sameAs: '641400' }, // Rsch TMF Services; Rsch Transgenic Mouse Facility
  { code: '641601', sameAs: '222663' }, // CAS CLLAS Operations; CAS Cntr Latino/a & Latin Am Stds
  { code: '660110', sameAs: '660100' }, // Rsch AQACS Ops; Rsch Aquatic Animal Care Svcs AQACS
  { code: '660310', sameAs: '660300' }, // Rsch CASE Operations; Rsch Cntr Assessment, Stats & Eval
  { code: '660710', sameAs: '660700' }, // Rsch High Perf Computng Facilty Ops; Rsch High Perf Computing Facility
  { code: '660951', sameAs: '660950' }, // Rsch COVID MAP project; Rsch COVID MAP
  { code: '661100', sameAs: '661000' }, // Rsch OARL Ops; Rsch Oregon Acoustical Rsch Lab
]

/** Census pay codes no budget publishes that hand review found to pay no single budget unit; each stays its own department. */
export const PAY_CODES_WITHOUT_UNIT: readonly string[] = [
  '100000', // Senior VP & Provost
  '106003', // Government & Community Relations
  '110000', // Pres President's Office
  '110401', // Knight Campus Administration
  '110431', // Communications
  '110502', // KCIP BGMP Old
  '110512', // Polymers Internship Track
  '110513', // Semiconductors Internship Track
  '110514', // Optics Internship Track
  '110515', // Sensors Internship Track
  '110522', // Bioinformatics&Genomics Int. Track
  '110532', // IMPACT Team
  '110651', // BioE Undergrad Programs
  '110800', // Knight Campus Research
  '129100', // Provost Administrative Services Tea
  '129500', // Central Business Services Office
  '210218', // Pro Data Science Undergraduate Pgm
  '211150', // Pres Many Nations Longhouse
  '221130', // AAA Eugene Program Admin
  '221140', // DSGN Facilities Services
  '221150', // DSGN Fiscal Services
  '221160', // DSGN Technology Services
  '221500', // DSGN School of Arch & Environment
  '222602', // CAS OCIAS African Stds
  '222603', // CAS OCIAS European Studies Program
  '222605', // CAS OCIAS Latin American Stds Pgm
  '223115', // CAS Biology OIMB
  '223527', // CAS Psych/Ctr Translation Neurosci
  '223529', // Ctr Brain Injury Rsrch & Training
  '223800', // CAS Administration
  '223801', // CAS Related Expenses
  '223803', // CAS Department Heads' Compensation
  '223809', // CAS Department Web Service
  '223814', // CAS Special Operations
  '223860', // CAS Related Operations
  '223886', // CAS Professional Distinctions
  '223902', // CAS Desktop Support
  '223984', // CAS ASU7 Operations
  '225616', // LCB Sports Product Management
  '226100', // Ed COE Central Activities
  '226313', // Ed TAG Talented & Gifted Program
  '226390', // Ed Ctr for Child Safety & Wellbeing
  '226400', // Ed Academic Programs
  '226413', // Ed SAPP-Substance Abuse Prevention
  '226470', // Ed Prevention Science
  '226494', // Ed EIP Early Intervention Program
  '226495', // Ed SPL Suicide Prevention Lab
  '226520', // Ed CHD Administration
  '226580', // Ed CHD External Funding
  '226740', // Ed IVDB Administration
  '226835', // Ed GE Assoc Dean Global Ed Admin
  '226980', // Ed Teaching & Learning
  '227105', // SOJC Instr Support
  '227150', // SOJC Graduate Affairs
  '227203', // SOJC Portland Operations
  '227210', // SOJC Portland Programs
  '228110', // Law School Grants
  '228401', // Law Juris Doctorate
  '229100', // SOMD Music
  '229300', // SOMD Bach Festival
  '230150', // BI Communications
  '230160', // BI Program Evaluation
  '230220', // BI Child Behavioral Health UG
  '230312', // BI Bearman Research Lab
  '264620', // IA Confucius Institute
  '264700', // IA AHA International
  '265105', // GS Academic Operations
  '266815', // UESS PathwayOregon
  '267052', // UESS Student Success Programs
  '267056', // UESS SAIL
  '267445', // VPSL ASUO Student Groups
  '267803', // UESS Tyk Advising
  '267817', // UESS Student Support Services
  '410201', // Finance & Admn Shared Services
  '410212', // Administrative Services Operations
  '410230', // Compliance & UOAA Bus Mgt
  '410440', // VPFA Shared Admin Services
  '410500', // Campus Planning, Design & Constr
  '410810', // Safety and Risk Services
  '431141', // BA Payroll Mailing Indicator
  '431142', // BAO Counter Pickup Indicator
  '433200', // IS Telecommunications Services
  '445100', // CS Olum Child Development Center
  '450402', // SRS Research Safety
  '602100', // Rsch VP Research Advancement
  '611111', // Rsch Administration Operations
  '611113', // Rsch Technical Services Operations
  '611116', // Research Core Business Services
  '630500', // Rsch Inst Cognitive & Dec Sciences
  '630672', // Rsch Genomics Robotics
  '630720', // Rsch ISE Sustainable Environment
  '630800', // Rsch IFS Inst Theoretical Science
  '631295', // Rsch Neuro ZFIN Group
  '631710', // Rsch Child and Family Ctr Oper
  '632200', // Rsch IFS Ctr High Energy Physics
  '640651', // Rsch Technology Transfer Operations
  '660200', // Rsch Bowerman Sports Science Center
]
