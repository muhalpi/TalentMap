import type {
  DiscBand,
  DiscDimensionCode,
  DiscDimensionKey,
  DiscGraphKey,
  DiscPatternKey,
  DiscPatternProfile,
} from "./types";

interface DiscBandProfile {
  description: string;
  workStyle: string;
  strength: string;
  watchOut: string;
  developmentTip: string;
}

interface DiscDimensionProfileDefinition {
  code: DiscDimensionCode;
  label: string;
  bands: Record<DiscBand, DiscBandProfile>;
}

export const discDimensionOrder: DiscDimensionKey[] = [
  "dominance",
  "influence",
  "steadiness",
  "conscientiousness",
];

export const discDimensionCodes: Record<
  DiscDimensionKey,
  DiscDimensionCode
> = {
  dominance: "D",
  influence: "I",
  steadiness: "S",
  conscientiousness: "C",
};

export const discDimensionLabels: Record<DiscDimensionKey, string> = {
  dominance: "Dominance",
  influence: "Influence",
  steadiness: "Steadiness",
  conscientiousness: "Conscientiousness",
};

export const discDimensionByCode: Record<
  DiscDimensionCode,
  DiscDimensionKey
> = {
  D: "dominance",
  I: "influence",
  S: "steadiness",
  C: "conscientiousness",
};

export const discDimensionProfiles: Record<
  DiscDimensionKey,
  DiscDimensionProfileDefinition
> = {
  dominance: {
    code: "D",
    label: "Dominance",
    bands: {
      low: {
        description:
          "Relative to your other styles, taking direct control is less emphasized in how you see yourself, and you may prefer to reach results through agreement rather than assertion.",
        workStyle:
          "You may work best where expectations are negotiated rather than imposed, and you often let someone else carry the contested calls.",
        strength:
          "Keeps competitive pressure low and invites collaboration rather than contest.",
        watchOut:
          "When a decision needs a single owner or immediate pushback, your position may go unstated.",
        developmentTip:
          "Pick one recurring decision that is genuinely yours and state your call plainly, without softening it into a suggestion.",
      },
      moderate: {
        description:
          "Assertiveness sits in balance with your other styles, so you can push for a result when it matters and step back when it does not.",
        workStyle:
          "You are likely to read the situation before deciding whether to drive it yourself or support someone else driving it.",
        strength: "Applies pressure selectively rather than by default.",
        watchOut:
          "Others may be unsure when you intend to own an outcome and when you are deferring on it.",
        developmentTip:
          "Say out loud who owns the decision at the start of contested work, including when the owner is you.",
      },
      high: {
        description:
          "Relative to your other styles, driving toward results is central to how you see yourself, and you tend to be direct, fast-moving, and comfortable with challenge.",
        workStyle:
          "You may set the pace, cut through detail to the outcome, and prefer clear authority over the results you are accountable for.",
        strength:
          "Creates momentum and makes difficult calls when a situation has stalled.",
        watchOut:
          "Speed and directness can read as impatience, and useful objections may not get raised in time to help.",
        developmentTip:
          "Before committing to a course, ask one person who disagrees what you might be missing, and give their answer real weight.",
      },
    },
  },
  influence: {
    code: "I",
    label: "Influence",
    bands: {
      low: {
        description:
          "Relative to your other styles, persuasion and visible enthusiasm are less emphasized, and you may prefer that work speaks for itself rather than being promoted.",
        workStyle:
          "You may keep communication measured and factual, and choose depth with a few people over broad visibility.",
        strength: "Brings a sober, low-hype reading of people and proposals.",
        watchOut:
          "Good work and genuine support may go unnoticed when momentum depends on being talked about.",
        developmentTip:
          "Choose one piece of work each cycle and share it deliberately with the people whose backing it needs.",
      },
      moderate: {
        description:
          "Warmth and persuasion are present without dominating, so you can bring people along when it helps and stay understated when it does not.",
        workStyle:
          "You are likely to adjust how much you promote an idea to suit the audience and the stakes in front of you.",
        strength:
          "Reads the room and dials expressiveness up or down to fit it.",
        watchOut:
          "Your actual level of enthusiasm can be hard for others to gauge from the outside.",
        developmentTip:
          "When you genuinely back something, say so explicitly rather than assuming your support is already visible.",
      },
      high: {
        description:
          "Relative to your other styles, connecting with and persuading people is central to how you see yourself, and you tend to be expressive, optimistic, and quick to build rapport.",
        workStyle:
          "You may think out loud, use conversation to generate ideas, and rely on relationships to move work forward.",
        strength:
          "Builds trust quickly and generates commitment and energy around a direction.",
        watchOut:
          "Optimism and talk can outpace detail, follow-through, or the harder facts of a situation.",
        developmentTip:
          "After each persuasive conversation, write down the concrete commitments made and who owns each one.",
      },
    },
  },
  steadiness: {
    code: "S",
    label: "Steadiness",
    bands: {
      low: {
        description:
          "Relative to your other styles, holding a settled and unchanging pace is less emphasized, and you may be comfortable with variety, interruption, and rapid shifts of direction.",
        workStyle:
          "You may move between tasks readily, prefer new ground to established routine, and need little settling-in time after a change.",
        strength:
          "Absorbs change easily and keeps moving when circumstances reshuffle.",
        watchOut:
          "Colleagues who need time to adjust may find your pace unsettling, and long-running routine work may lose your attention.",
        developmentTip:
          "When you change direction, say what is changing, what stays the same, and by when, then give people a moment to catch up.",
      },
      moderate: {
        description:
          "Patience and pace sit in balance with your other styles, so you can hold a steady rhythm and also break it when something needs to move.",
        workStyle:
          "You are likely to sustain routine commitments while still accepting a reasonable amount of disruption to them.",
        strength:
          "Provides continuity without becoming immovable when plans change.",
        watchOut:
          "You may absorb changes of direction without saying what they cost, which keeps the strain invisible to others.",
        developmentTip:
          "Name the trade-off when you take on a change: what will move, what will slip, and where you need help.",
      },
      high: {
        description:
          "Relative to your other styles, steadiness and a consistent pace are central to how you see yourself, and you tend to be patient, dependable, and attentive to the people around you.",
        workStyle:
          "You may prefer predictable rhythms, clear expectations, and enough notice to prepare before direction changes.",
        strength:
          "Creates stability, follows through on commitments, and listens carefully before responding.",
        watchOut:
          "Abrupt change or open conflict can be draining, and disagreement may be held quietly rather than raised.",
        developmentTip:
          "When something concerns you, raise it early as a question rather than waiting to see whether it settles on its own.",
      },
    },
  },
  conscientiousness: {
    code: "C",
    label: "Conscientiousness",
    bands: {
      low: {
        description:
          "Relative to your other styles, formal precision and procedure are less emphasized, and you may rely on judgement and experience more than on detailed verification.",
        workStyle:
          "You may act on the information at hand, question rules that seem to add little, and treat detail as something to correct as you go.",
        strength:
          "Keeps work moving and avoids being held up by analysis or process for its own sake.",
        watchOut:
          "Accuracy, documentation, or compliance needs may be under-served, particularly where mistakes are expensive to undo.",
        developmentTip:
          "Agree in advance which parts of a task must be checked by someone else, and build that check into the plan.",
      },
      moderate: {
        description:
          "Attention to accuracy sits in balance with your other styles, so you can apply care where it matters and accept good enough where it does not.",
        workStyle:
          "You are likely to weigh how much precision a task genuinely needs before deciding how closely to work it.",
        strength: "Applies standards proportionately rather than uniformly.",
        watchOut:
          "The threshold you are using may not be obvious to others, so expectations about quality can quietly drift apart.",
        developmentTip:
          "State the standard you are working to at the start of a task and confirm that others are working to the same one.",
      },
      high: {
        description:
          "Relative to your other styles, accuracy and doing things properly are central to how you see yourself, and you tend to be analytical, careful, and attentive to standards.",
        workStyle:
          "You may want the data before committing, work to defined methods, and check your output before releasing it.",
        strength:
          "Protects quality, anticipates what could go wrong, and grounds decisions in evidence.",
        watchOut:
          "The search for certainty can slow decisions, and exacting standards may be experienced as criticism when applied to other people's work.",
        developmentTip:
          "Decide up front what level of confidence is enough to act, and treat reaching it as permission to move.",
      },
    },
  },
};

export const discPatternProfiles: Record<
  DiscPatternKey,
  DiscPatternProfile
> = {
  D: {
    key: "D",
    name: "Decisive Operator",
    epithet:
      "Takes direct control of a problem and moves quickly toward a result.",
    description:
      "Dominance is the most strongly expressed dimension in your perceived self, with the other three less prominent. You may prefer to take charge of a problem, decide early, and measure progress by visible results rather than by process. Colleagues often experience you as direct, competitive, and willing to accept risk in order to keep things moving. This pattern can generate momentum quickly, and it tends to work best when the drive is paired with enough consultation to keep other people aligned.",
    emotionalTone:
      "Frustration with delay tends to surface openly and without much softening. It usually passes as soon as a decision has been made.",
    motivation:
      "You are likely to be motivated by control over your own work, visible wins, and problems that others have not yet been able to solve.",
    judgesOthersBy:
      "You may judge others largely by their willingness to decide, the pace they work at, and whether they deliver what they committed to.",
    influencesOthersBy:
      "You tend to influence through directness, visible ownership of outcomes, and persistence when you meet resistance.",
    organizationValue:
      "You may add most value by cutting through delay, taking responsibility for difficult calls, and pushing stalled work forward.",
    overuses:
      "You may overuse bluntness and unilateral decision making, relying on force of will in situations where negotiation would work better.",
    underPressure:
      "Under pressure you may become more directive and less consultative, and you may take over tasks that belong to other people.",
    fears:
      "You may be most uneasy about losing control of a situation, or about being taken advantage of by others.",
    effectiveness:
      "Your effectiveness may increase when you slow down long enough to test assumptions with other people, and allow them to finish work in their own way.",
    generalTraits: [
      "Takes initiative quickly and prefers to be the one who decides.",
      "States positions directly, with little softening.",
      "Reasonably comfortable with risk, conflict, and unfamiliar problems.",
      "Focused on outcomes more than on process or protocol.",
      "Restless with routine, repetition, and slow-moving discussion.",
    ],
    strengths: [
      "Makes clear decisions in ambiguous situations without waiting for consensus.",
      "Brings visible urgency that moves stalled work forward.",
      "Accepts personal responsibility for difficult outcomes.",
      "Raises unpopular issues and holds a position under challenge.",
      "Changes course quickly once a chosen route stops working.",
    ],
    potentialProblemAreas: [
      "Decisions may be settled before quieter colleagues have contributed.",
      "Directness may be experienced as dismissive by people who need more context.",
      "Delegation may collapse into reclaiming the work whenever pace slips.",
      "Detail, documentation, and follow-through may be treated as someone else's responsibility.",
      "Repeated urgency may leave a team depleted even when results arrive.",
    ],
    communicationTips: [
      "Lead with the conclusion and offer supporting detail only if it is asked for.",
      "Be specific about what you need, by when, and who owns it.",
      "Disagree openly and with evidence; indirect hints are likely to be missed.",
      "Offer two or three options rather than presenting a single fixed plan.",
    ],
    motivators: [
      "Authority to decide, with visible ownership of the result.",
      "Difficult problems that have a clear scoreboard.",
      "Freedom from close supervision and unnecessary process.",
      "Advancement earned through demonstrated outcomes.",
    ],
    developmentTips: [
      "Ask one clarifying question before deciding when the situation is unfamiliar.",
      "Name the decision you are making and who genuinely needs to be consulted first.",
      "Set an explicit checkpoint instead of taking delegated work back.",
      "Acknowledge contributions as they happen, not only when a target is reached.",
    ],
  },
  I: {
    key: "I",
    name: "Engaging Connector",
    epithet:
      "Builds momentum through enthusiasm, visibility, and personal rapport.",
    description:
      "Influence is the most strongly expressed dimension in your perceived self. You may work mainly through people, talking ideas through, generating enthusiasm, and maintaining a wide network of goodwill. Others often experience you as expressive, optimistic, and easy to approach. This pattern can create energy and buy-in quickly, and it tends to become more reliable when the enthusiasm is anchored to specific commitments and follow-up.",
    emotionalTone:
      "Optimism tends to be your default register. You may express both enthusiasm and disappointment openly rather than holding them back.",
    motivation:
      "You are likely to be motivated by social recognition, variety, and work that involves engaging or persuading other people.",
    judgesOthersBy:
      "You may judge others by their warmth, openness, and willingness to engage, more than by their technical precision.",
    influencesOthersBy:
      "You tend to influence through enthusiasm, personal relationships, and an ability to make an idea sound worth joining.",
    organizationValue:
      "You may add most value by building alliances, lifting morale, and expressing a direction in terms people find engaging.",
    overuses:
      "You may overuse optimism and persuasion, agreeing to more than current conditions can realistically support.",
    underPressure:
      "Under pressure you may talk more, look for reassurance, and become less organized about detail and commitments.",
    fears:
      "You may be most uneasy about social rejection, or about being overlooked or excluded.",
    effectiveness:
      "Your effectiveness may increase when you attach specific owners, dates, and follow-up points to the enthusiasm you generate.",
    generalTraits: [
      "Thinks out loud and works ideas through in conversation.",
      "Builds rapport quickly with new people and across groups.",
      "Optimistic about what can be achieved and about who will help.",
      "Comfortable being visible, presenting, and persuading.",
      "Prefers variety and can lose interest in repetitive detail.",
    ],
    strengths: [
      "Creates enthusiasm for a direction that others have not yet accepted.",
      "Builds and maintains a wide network of useful working relationships.",
      "Communicates in language people find accessible and motivating.",
      "Recovers quickly from setbacks and helps sustain a team's mood.",
      "Connects people across boundaries that the formal structure ignores.",
    ],
    potentialProblemAreas: [
      "Commitments may be made faster than available capacity allows.",
      "Detail, records, and follow-through may slip once attention moves on.",
      "Optimism may soften genuinely bad news until it arrives late.",
      "Decisions may lean on who was most persuasive rather than on the evidence.",
      "A wish for approval can make necessary disagreement harder to voice.",
    ],
    communicationTips: [
      "Allow some informal conversation before moving to the agenda.",
      "Show genuine interest in the idea before you start critiquing it.",
      "Summarize agreements in writing so nothing rests on recollection.",
      "Give critical feedback privately, specifically, and with a clear route forward.",
    ],
    motivators: [
      "Public recognition and visible appreciation.",
      "Varied work with plenty of contact with other people.",
      "Freedom to shape how a message is delivered.",
      "A sociable team culture with a positive tone.",
    ],
    developmentTips: [
      "Check capacity and dates before agreeing to anything new.",
      "Keep one simple system for tracking the promises you have made.",
      "State the difficult part of an update first, then the plan for it.",
      "Ask a detail-focused colleague to review a plan before you present it.",
    ],
  },
  S: {
    key: "S",
    name: "Steady Anchor",
    epithet:
      "Provides consistency, patience, and dependable support over time.",
    description:
      "Steadiness is the most strongly expressed dimension in your perceived self. You may prefer a predictable pace, established working relationships, and a clear understanding of what is expected before change begins. Colleagues often experience you as calm, patient, and reliable, particularly during difficult periods. This pattern gives a team continuity, and it tends to work best when you also make your own views and limits visible.",
    emotionalTone:
      "You may keep strong feelings private and stay outwardly composed. That can mean concerns are noticed by others later than they actually arise.",
    motivation:
      "You are likely to be motivated by stability, sincere appreciation, and work that supports people you have committed to.",
    judgesOthersBy:
      "You may judge others by their reliability, their consistency, and whether their behavior matches what they say.",
    influencesOthersBy:
      "You tend to influence through dependability, patient listening, and a long record of doing what you said you would do.",
    organizationValue:
      "You may add most value by holding standards steady, supporting colleagues through change, and completing work that requires patience.",
    overuses:
      "You may overuse accommodation, absorbing extra load quietly instead of renegotiating what is realistic.",
    underPressure:
      "Under pressure you may become quieter and more outwardly compliant while resistance builds privately.",
    fears:
      "You may be most uneasy about sudden change, and about the loss of security or of familiar working relationships.",
    effectiveness:
      "Your effectiveness may increase when you state your view early and set explicit limits before workload becomes unmanageable.",
    generalTraits: [
      "Works at a consistent, sustainable pace.",
      "Listens carefully and lets others finish before responding.",
      "Prefers established methods and advance notice of change.",
      "Loyal to colleagues and to commitments already made.",
      "Understated about your own contribution.",
    ],
    strengths: [
      "Delivers consistently over long periods without needing supervision.",
      "Steadies a team during uncertainty or conflict.",
      "Builds deep trust with the people you work alongside.",
      "Follows work through to completion, including the unglamorous parts.",
      "Listens closely enough to surface concerns others have not voiced.",
    ],
    potentialProblemAreas: [
      "Genuine disagreement may go unstated until frustration accumulates.",
      "Change may be resisted even where the case for it is sound.",
      "Extra work may be absorbed silently rather than renegotiated.",
      "Decisions that need speed may be slowed by a wish for more certainty.",
      "Contributions may be undervalued because they are rarely made visible.",
    ],
    communicationTips: [
      "Give advance notice of change and explain the reasoning behind it.",
      "Ask directly for this person's view, then leave silence for the answer.",
      "Agree a realistic timeline rather than assuming capacity is available.",
      "Recognize sustained reliability, not only visible achievements.",
    ],
    motivators: [
      "Predictable priorities and a stable working environment.",
      "Sincere, specific appreciation from people you respect.",
      "Clear procedures and well-defined expectations.",
      "Long-term working relationships and a settled team.",
    ],
    developmentTips: [
      "Say what you think during the meeting rather than afterwards.",
      "Name your limit when new work arrives, before you take it on.",
      "Ask what problem a proposed change is meant to solve, then test one part of it.",
      "Keep a short record of your own results and share it at review points.",
    ],
  },
  C: {
    key: "C",
    name: "Precision Analyst",
    epithet: "Works to a high standard and checks the facts before committing.",
    description:
      "Conscientiousness is the most strongly expressed dimension in your perceived self. You may prefer to understand the requirements, verify the detail, and reduce the chance of error before acting. Others often experience you as careful, systematic, and diplomatically cautious. This pattern protects quality, and it tends to work best when the standard being applied is agreed in advance rather than assumed.",
    emotionalTone:
      "You may hold feelings in reserve and express concern through questions about the evidence rather than through open disagreement.",
    motivation:
      "You are likely to be motivated by accuracy, clear standards, and the chance to do work correctly rather than quickly.",
    judgesOthersBy:
      "You may judge others by the accuracy of their information and the quality of their reasoning.",
    influencesOthersBy:
      "You tend to influence through evidence, careful preparation, and a record of being right about the details.",
    organizationValue:
      "You may add most value by defining standards, catching errors early, and testing plans against the facts before they are launched.",
    overuses:
      "You may overuse analysis, procedure, and caution, applying a level of checking that the decision in front of you does not require.",
    underPressure:
      "Under pressure you may withdraw into detail, ask for more data, and delay a decision that already has enough support.",
    fears:
      "You may be most uneasy about criticism of your work, and about being responsible for a mistake that could have been avoided.",
    effectiveness:
      "Your effectiveness may increase when you agree in advance how much certainty a decision needs, and state your conclusion in plain terms.",
    generalTraits: [
      "Prepares thoroughly and works from documented information.",
      "Asks precise questions and notices inconsistencies quickly.",
      "Diplomatic in disagreement, preferring evidence to confrontation.",
      "Sets high standards, applied to your own work in particular.",
      "Prefers defined expectations to open-ended briefs.",
    ],
    strengths: [
      "Produces accurate, well-checked work that others can rely on.",
      "Identifies risks and flaws before they become expensive.",
      "Brings order and documentation to complicated processes.",
      "Holds quality steady when pressure invites shortcuts.",
      "Argues from evidence rather than from status or volume.",
    ],
    potentialProblemAreas: [
      "Decisions may be delayed while additional certainty is sought.",
      "High personal standards may be applied to colleagues who never agreed to them.",
      "Criticism may be taken more personally than it was intended.",
      "Necessary risks may be avoided because the downside is easier to see.",
      "Detailed explanation may obscure the recommendation being made.",
    ],
    communicationTips: [
      "Come prepared with data and sources, and allow time to work through them.",
      "Separate comment on the work from judgment of the person.",
      "Explain the reasoning behind a decision, not only the conclusion.",
      "State how much accuracy the task actually requires.",
    ],
    motivators: [
      "Clear standards, defined scope, and explicit quality expectations.",
      "Enough time to do the work properly and check it.",
      "Recognition for accuracy and expertise.",
      "Access to complete and reliable information.",
    ],
    developmentTips: [
      "Decide in advance what evidence would be sufficient, then act on it.",
      "Give your recommendation in one sentence before the supporting detail.",
      "Distinguish work that must be exact from work that only needs to be adequate.",
      "Treat questions about your work as interest rather than as challenge.",
    ],
  },
  DI: {
    key: "DI",
    name: "Driving Mobilizer",
    epithet:
      "Sets an ambitious direction and then recruits people to pursue it.",
    description:
      "Dominance is the strongest dimension in your perceived self, with Influence close behind. You may settle on a direction quickly and then use energy, argument, and personal presence to bring others with you. Colleagues often experience you as bold, persuasive, and difficult to slow down. The combination can move an organization quickly, and it tends to work best when the pace leaves room for detail and for people who need longer to catch up.",
    emotionalTone:
      "You may express drive and enthusiasm openly, and impatience with delay tends to show before it is discussed.",
    motivation:
      "You are likely to be motivated by challenging goals, visible leadership, and winning support for a direction you have chosen.",
    judgesOthersBy:
      "You may judge others by their confidence, their pace, and their willingness to commit to a direction.",
    influencesOthersBy:
      "You tend to influence by combining decisiveness with persuasion, naming the destination and making it sound worth reaching.",
    organizationValue:
      "You may add most value by setting direction in uncertain conditions and generating the momentum needed to carry it through.",
    overuses:
      "You may overuse persuasive push, treating agreement in the room as commitment and momentum as evidence that the plan is sound.",
    underPressure:
      "Under pressure you may push harder and argue faster, becoming impatient with analysis and with people who hesitate.",
    fears:
      "You may be most uneasy about losing influence, being overruled, or holding a position without authority or an audience.",
    effectiveness:
      "Your effectiveness may increase when you build in a deliberate check on the detail and confirm that stated agreement is real commitment.",
    generalTraits: [
      "Decides quickly, then works to bring others along.",
      "Comfortable leading from the front and being visible while doing it.",
      "Competitive, and energized by ambitious targets.",
      "Persuasive in argument and confident under challenge.",
      "Impatient with detailed process and extended deliberation.",
    ],
    strengths: [
      "Turns a decision into shared movement rather than an instruction.",
      "Recruits support for change that others consider too difficult.",
      "Sustains drive and morale at the same time.",
      "Handles resistance and opposition without losing the direction.",
      "Makes ambitious goals feel achievable to a team.",
    ],
    potentialProblemAreas: [
      "Pace and persuasion together may leave little room for genuine dissent.",
      "Detail, risk, and follow-through may be delegated and then not checked.",
      "Confidence may be mistaken for evidence when a plan is still untested.",
      "Cautious colleagues may disengage quietly rather than object.",
      "Sustained intensity may exhaust the team carrying the plan.",
    ],
    communicationTips: [
      "Open with the headline result and the timeline, then fill in detail.",
      "Bring your objection early, directly, and with evidence attached.",
      "Ask for the specific commitment you need, in writing.",
      "Say when you need more time rather than agreeing in the moment.",
    ],
    motivators: [
      "Ambitious goals with room to lead them personally.",
      "Authority to decide, plus a platform to argue the case.",
      "Visible progress and recognition for winning support.",
      "Varied, high-stakes work rather than routine administration.",
    ],
    developmentTips: [
      "Ask one person to argue the opposite case before a decision is fixed.",
      "Confirm agreement by asking what each person will actually do next.",
      "Assign detail and risk checking explicitly, then review it once yourself.",
      "Watch the team's capacity as closely as you watch the target.",
    ],
  },
  DS: {
    key: "DS",
    name: "Resolute Finisher",
    epithet:
      "Pursues results with persistence and prefers to see the work through personally.",
    description:
      "Dominance leads your perceived self, with Steadiness as the supporting dimension. You may combine a clear focus on results with the patience to keep working at a problem long after the initial energy has faded. Colleagues often experience you as self-reliant, determined, and hard to divert once a goal is set. The combination is well suited to finishing demanding work, and it tends to work best when others are brought into the effort rather than left outside it.",
    emotionalTone:
      "You may show determination more readily than other feelings. Irritation is more likely to appear as a hardened focus than as an outburst.",
    motivation:
      "You are likely to be motivated by personal responsibility for a result, and by finishing what you have taken on to your own standard.",
    judgesOthersBy:
      "You may judge others by their persistence, and by whether they finish work without needing to be chased.",
    influencesOthersBy:
      "You tend to influence by example and sustained effort rather than by argument or visible enthusiasm.",
    organizationValue:
      "You may add most value by carrying demanding work to completion, especially where progress depends on persistence rather than pace.",
    overuses:
      "You may overuse self-reliance, holding on to work that could be shared and reworking what others have already done.",
    underPressure:
      "Under pressure you may narrow your focus, take on more yourself, and stop explaining what you are doing or why.",
    fears:
      "You may be most uneasy about losing control of an outcome, or about your standards being compromised by others.",
    effectiveness:
      "Your effectiveness may increase when you delegate genuinely, explain your reasoning out loud, and accept a good result produced someone else's way.",
    generalTraits: [
      "Focused on results and reluctant to leave work unfinished.",
      "Self-reliant, often preferring to handle the task personally.",
      "Steady under sustained pressure and slow to give ground.",
      "Sets internal standards and measures progress against them.",
      "Reserved about explaining reasoning while work is in progress.",
    ],
    strengths: [
      "Sees demanding work through to completion without external pressure.",
      "Combines urgency about outcomes with patience about effort.",
      "Holds a position calmly when a project meets resistance.",
      "Delivers reliably without needing supervision or applause.",
      "Keeps standards intact when a task takes longer than planned.",
    ],
    potentialProblemAreas: [
      "Work may be absorbed personally instead of delegated or shared.",
      "Others may not know the reasoning behind a decision you have already made.",
      "Persistence may continue past the point where a plan should be abandoned.",
      "Team members may feel bypassed rather than developed.",
      "Workload may build quietly until it stops being sustainable.",
    ],
    communicationTips: [
      "Be concrete about the outcome you want, then leave room for how it is reached.",
      "Ask what has already been decided before offering a new option.",
      "Give notice before changing priorities mid-task.",
      "Acknowledge completed work specifically, not just the next target.",
    ],
    motivators: [
      "Clear ownership of a result, with the means to deliver it.",
      "Work that rewards persistence rather than only speed.",
      "Freedom from close supervision.",
      "Standards that are respected rather than negotiated away.",
    ],
    developmentTips: [
      "Hand over one task fully and resist reworking the result.",
      "Say your reasoning aloud early so others can follow the decision.",
      "Set a review point where continuing is an explicit choice rather than a default.",
      "Ask for help before the workload becomes visible to others as strain.",
    ],
  },
  DC: {
    key: "DC",
    name: "Exacting Strategist",
    epithet:
      "Drives for results while insisting the work stands up to scrutiny.",
    description:
      "Dominance leads your perceived self, with Conscientiousness as the supporting dimension. You may want both speed and correctness, pressing for a decision while testing whether the reasoning behind it holds. Colleagues often experience you as incisive, demanding, and quick to find the weak point in a proposal. This combination supports well-founded decisions, and it tends to work best when the critique is delivered in a form people can act on.",
    emotionalTone:
      "You may keep warmth in reserve and express dissatisfaction through pointed questions and blunt assessment rather than open emotion.",
    motivation:
      "You are likely to be motivated by getting things right and getting them done, with real authority over how the work is defined.",
    judgesOthersBy:
      "You may judge others by the rigor of their thinking and their ability to defend a position under questioning.",
    influencesOthersBy:
      "You tend to influence through logic, prepared argument, and a willingness to press a point until it is resolved.",
    organizationValue:
      "You may add most value by improving the quality of decisions, challenging weak plans early and then driving the better version forward.",
    overuses:
      "You may overuse critical analysis and control, applying scrutiny that slows willing colleagues or discourages them from contributing.",
    underPressure:
      "Under pressure you may become terse and controlling, tightening standards and finding fault faster than you offer direction.",
    fears:
      "You may be most uneasy about being publicly wrong, or about work associated with you failing on avoidable grounds.",
    effectiveness:
      "Your effectiveness may increase when you state what is working before what is not, and make clear which standards are genuinely required.",
    generalTraits: [
      "Wants results and accuracy at the same time.",
      "Questions assumptions quickly and directly.",
      "Prefers to define the standard rather than inherit it.",
      "Skeptical of plans that rest mainly on optimism.",
      "Reserved socially while being direct about the work.",
    ],
    strengths: [
      "Finds the flaw in a plan while there is still time to fix it.",
      "Combines decisiveness with disciplined reasoning.",
      "Holds quality and pace together under commercial pressure.",
      "Argues from preparation rather than from position.",
      "Makes decisions that hold up when they are examined later.",
    ],
    potentialProblemAreas: [
      "Critique may arrive before any acknowledgment of what was done well.",
      "Colleagues may stop volunteering ideas that are not yet fully formed.",
      "Control over method may limit how much others can genuinely own.",
      "Impatience and exacting standards together can feel unrelenting.",
      "Interpersonal signals may be treated as less relevant than the analysis.",
    ],
    communicationTips: [
      "Bring your reasoning and your sources, and expect both to be tested.",
      "Say plainly what you do not yet know rather than covering it.",
      "Ask which standard applies before starting, not after review.",
      "Read hard questioning as engagement with the work rather than personal disapproval.",
    ],
    motivators: [
      "Authority over both the outcome and the standard applied.",
      "Complex problems where the quality of thinking matters.",
      "Recognition for judgment as well as for delivery.",
      "Colleagues who can defend their reasoning.",
    ],
    developmentTips: [
      "Name one thing that works before listing what does not.",
      "Separate what must be exact from what only needs to be good enough at the start of a task.",
      "Ask a question to understand before asking one to test.",
      "Let a capable colleague choose the method and judge only the result.",
    ],
  },
  ID: {
    key: "ID",
    name: "Rallying Catalyst",
    epithet: "Wins people over first, then presses for a decision.",
    description:
      "Influence is the strongest dimension in your perceived self, with Dominance supporting it. You may begin with relationships and enthusiasm, then apply real pressure once you can see the direction you want. Colleagues often experience you as engaging, confident, and more determined than a first impression suggests. This combination is well suited to moving groups, and it tends to work best when persuasion is backed by verified detail.",
    emotionalTone:
      "You may express optimism and conviction freely. Frustration is more likely to appear as intensified persuasion than as withdrawal.",
    motivation:
      "You are likely to be motivated by influence itself: changing minds, and then seeing something happen as a result.",
    judgesOthersBy:
      "You may judge others by their openness to being convinced, and by whether they act once they have agreed.",
    influencesOthersBy:
      "You tend to influence by building rapport first and then asking for a commitment while goodwill is high.",
    organizationValue:
      "You may add most value by mobilizing people around a change and keeping pressure on it until it is genuinely adopted.",
    overuses:
      "You may overuse rapport and momentum, relying on the relationship to carry a proposal that has not been fully worked out.",
    underPressure:
      "Under pressure you may become more insistent and less patient, pushing for agreement rather than examining the objection.",
    fears:
      "You may be most uneasy about losing standing or approval, or about being left out of decisions that matter.",
    effectiveness:
      "Your effectiveness may increase when you test a proposal with a skeptical colleague before you start advocating for it.",
    generalTraits: [
      "Leads with rapport and shifts to pressure when it seems needed.",
      "Confident in front of a group and comfortable being the advocate.",
      "Optimistic about outcomes and about people.",
      "Persistent in pursuit of agreement more than in pursuit of detail.",
      "Restless with process, record keeping, and repetition.",
    ],
    strengths: [
      "Builds support quickly and then converts it into action.",
      "Presents a case in terms people can accept and repeat.",
      "Keeps pushing after the initial enthusiasm has faded.",
      "Absorbs rejection without losing energy for the goal.",
      "Creates access and openings that formal channels do not.",
    ],
    potentialProblemAreas: [
      "Persuasive pressure may produce agreement that was not thought through.",
      "Practical detail may be assumed rather than verified.",
      "Objections may be answered before they have been properly heard.",
      "Commitments may accumulate faster than they can be honored.",
      "A wish to be liked may sit awkwardly with the pressure being applied.",
    ],
    communicationTips: [
      "Engage with the idea and the person before raising the difficulties.",
      "State your reservation once, clearly, and ask for it to be addressed.",
      "Put agreed actions, owners, and dates in writing.",
      "Give the underlying reason for a no rather than simply deferring.",
    ],
    motivators: [
      "Visible influence and recognition for winning support.",
      "Work involving persuasion, negotiation, and new contacts.",
      "Freedom to shape both the message and the approach.",
      "Fast movement from agreement to action.",
    ],
    developmentTips: [
      "Ask a cautious colleague to stress-test the proposal before you present it.",
      "Slow down at the objection and ask a question instead of answering.",
      "Keep one running list of what you have promised and to whom.",
      "Confirm each commitment with a specific next step and date.",
    ],
  },
  IS: {
    key: "IS",
    name: "Warm Team Builder",
    epithet:
      "Brings people together first, then helps hold the group steady while it works.",
    description:
      "Influence leads your perceived self, with Steadiness as the supporting dimension. The combination pairs outgoing warmth with a preference for steady, unhurried working relationships. You may build rapport quickly and then invest in keeping the group connected and comfortable over time. Enthusiasm tends to set the tone, with patience and consistency supporting it rather than the reverse.",
    emotionalTone:
      "You may be openly friendly and generally optimistic, with a dislike of tension and an inclination to smooth it over early.",
    motivation:
      "You are likely to be motivated by acceptance and shared enjoyment in the work, and by a group that stays on good terms while it makes progress.",
    judgesOthersBy:
      "You may judge others by their warmth, their willingness to include people, and whether they seem genuinely interested in the group.",
    influencesOthersBy:
      "You tend to influence through personal encouragement, praise, and a steady willingness to help, rather than through pressure or authority.",
    organizationValue:
      "You may add most value by building morale, helping newcomers settle in, and keeping informal communication flowing across a team.",
    overuses:
      "You may overuse reassurance and optimism, leaving difficult feedback or persistent underperformance unaddressed.",
    underPressure:
      "Under pressure you may become indirect and over-accommodating, and hesitate to name a problem that could unsettle the atmosphere.",
    fears:
      "You may be most uneasy about losing approval, or about being seen as the person who caused a rift in the group.",
    effectiveness:
      "Your effectiveness may increase when you practice direct conversations about performance, and set a clear deadline even when the mood is comfortable.",
    generalTraits: [
      "Tends to approach new people easily and to remember what matters to them.",
      "Often prefers a friendly, predictable pace over rapid change.",
      "May think aloud and read reactions as the conversation moves.",
      "Usually looks for the cooperative option before the competitive one.",
      "Is often more motivated by commitments made to people than by formal process.",
    ],
    strengths: [
      "Creates a welcoming atmosphere that helps quieter colleagues join in.",
      "Builds trust widely and can carry goodwill between groups that rarely talk.",
      "Keeps enthusiasm alive through long stretches of routine work.",
      "Reads the mood of a group early and often responds before tension hardens.",
      "Offers practical help willingly, without needing recognition for it.",
    ],
    potentialProblemAreas: [
      "Conflict may be postponed long enough for small issues to grow.",
      "Being liked can take priority over holding a firm line on standards.",
      "Optimistic timelines may not account for the detail involved.",
      "Requests from people you like can be hard to decline.",
      "Decisions may drift when the group has not reached visible consensus.",
    ],
    communicationTips: [
      "Open with the relationship if that feels natural, then state the request plainly so the ask is not lost in the warmth.",
      "When you disagree, say so early and once, rather than hinting several times.",
      "Give detail-focused colleagues the specifics in writing, not only your confidence in the idea.",
      "Check that agreement in the room is real agreement and not politeness.",
      "Summarize decisions afterwards so a good conversation turns into shared commitments.",
    ],
    motivators: [
      "Working alongside people you like, on something visibly useful to them.",
      "Informal recognition and appreciation from colleagues.",
      "A stable team where relationships have time to develop.",
      "Freedom to talk ideas through rather than submit them on paper.",
      "Seeing that your encouragement made a difference to someone's progress.",
    ],
    developmentTips: [
      "Rehearse one clear, kind version of a difficult message before the conversation.",
      "Add a factual check to optimistic estimates before committing to a date.",
      "Set a limit on how many extra requests you take on each week.",
      "Ask for the dissenting view directly, since it may not arrive on its own.",
      "Keep a short written record of decisions so agreements survive the meeting.",
    ],
  },
  IC: {
    key: "IC",
    name: "Credible Enthusiast",
    epithet:
      "Persuades with energy, then backs the claim with the detail behind it.",
    description:
      "Influence leads your perceived self, with Conscientiousness as the supporting dimension. The combination pairs outgoing persuasion with a genuine concern for being right. Expressiveness and verbal fluency tend to set the tone, while an underlying attention to accuracy shapes what you are willing to promise. You may enjoy presenting ideas publicly and dislike being caught without the evidence to support them.",
    emotionalTone:
      "You may be expressive and engaging outwardly, with a more private streak of self-criticism about the quality of your work.",
    motivation:
      "You are likely to be motivated by recognition for work that is both appealing and defensible, and by influence earned through demonstrated competence.",
    judgesOthersBy:
      "You may judge others by their ability to express ideas clearly and to substantiate what they claim.",
    influencesOthersBy:
      "You tend to influence through well-presented reasoning, vivid illustration, and enthusiasm that is supported by evidence.",
    organizationValue:
      "You may add most value by translating technical or detailed work into language other people can understand and act on.",
    overuses:
      "You may overuse polish and persuasion, making an incomplete argument sound more settled than it is.",
    underPressure:
      "Under pressure you may become critical of other people's standards, or defensive when the detail of your own work is questioned.",
    fears:
      "You may be most uneasy about being publicly wrong, or about having your competence doubted in front of others.",
    effectiveness:
      "Your effectiveness may increase when you separate the moment for exploring ideas from the moment for verifying them, and invite scrutiny earlier.",
    generalTraits: [
      "Often thinks aloud, then returns later to check the facts.",
      "Tends to care about how work is presented as well as whether it is correct.",
      "May move quickly in conversation and slowly when committing to a number.",
      "Usually comfortable in front of an audience, less so improvising without preparation.",
      "Likely to hold both yourself and others to a visible standard.",
    ],
    strengths: [
      "Makes complex material accessible without stripping out important qualifications.",
      "Combines the confidence to present with the discipline to prepare.",
      "Notices the error that would undermine an otherwise persuasive case.",
      "Builds credibility with people-focused and detail-focused audiences alike.",
      "Can argue for quality in rooms where quality is not the loudest argument.",
    ],
    potentialProblemAreas: [
      "You may sound more certain in public than the underlying data supports.",
      "Questions about your accuracy can feel personal and prompt a defensive reply.",
      "Preparation can expand until it delays a decision that was already good enough.",
      "Visible work may crowd out less visible follow-through.",
      "Friction can build with colleagues who are casual about standards.",
    ],
    communicationTips: [
      "Say plainly which parts of your case are established and which are still estimates.",
      "Invite challenge on the detail before the presentation rather than after it.",
      "With direct colleagues, lead with the conclusion and keep supporting detail available.",
      "Treat a question about your figures as interest rather than as doubt about you.",
      "Give steady colleagues time to absorb material instead of deciding in the meeting.",
    ],
    motivators: [
      "Visible work that will be judged on quality as well as impact.",
      "Recognition from people whose expertise you respect.",
      "Clear criteria, so you know what a good result looks like.",
      "Opportunities to explain, teach, or present what you have worked out.",
      "Enough preparation time to feel confident in what you deliver.",
    ],
    developmentTips: [
      "Define what 'good enough' means for this audience before you start refining.",
      "Ask one person to stress-test your argument early in the work.",
      "Mark where you are inferring rather than reporting, and label it that way.",
      "Practice answering a correction with a question instead of a justification.",
      "Schedule the unglamorous follow-up tasks as firmly as the presentation itself.",
    ],
  },
  SD: {
    key: "SD",
    name: "Grounded Finisher",
    epithet:
      "Holds a steady pace, and pushes when something has to be finished.",
    description:
      "Steadiness leads your perceived self, with Dominance as the supporting dimension. The combination pairs a settled, consistent working rhythm with a real willingness to press for results. Patience and follow-through tend to set the tone, while a quieter determination surfaces when progress stalls. You may appear unhurried and still be difficult to divert from a commitment you have made.",
    emotionalTone:
      "You may be calm and measured most of the time, with occasional firmness that colleagues do not expect.",
    motivation:
      "You are likely to be motivated by completing what you have taken on, in a stable environment where sustained effort actually leads somewhere.",
    judgesOthersBy:
      "You may judge others by whether they keep their commitments and finish what they start.",
    influencesOthersBy:
      "You tend to influence through persistence, dependable delivery, and quiet insistence on the point that matters.",
    organizationValue:
      "You may add most value by carrying long work through to completion and keeping momentum after the initial energy fades.",
    overuses:
      "You may overuse endurance, continuing with an approach after conditions have changed enough to warrant a different one.",
    underPressure:
      "Under pressure you may dig in, hold a position longer than is useful, or absorb strain without mentioning it.",
    fears:
      "You may be most uneasy about sudden change, and about sustained effort being wasted or overturned without explanation.",
    effectiveness:
      "Your effectiveness may increase when you raise objections earlier, and ask whether the goal has moved before pushing harder on the plan.",
    generalTraits: [
      "Tends to work at a steady, sustainable rate rather than in bursts.",
      "Often quiet in discussion but clear about what you will and will not accept.",
      "May prefer to finish current work before opening anything new.",
      "Usually reliable about deadlines you have personally agreed to.",
      "Likely to hold back from change until the reasoning behind it makes sense to you.",
    ],
    strengths: [
      "Delivers over long periods without needing external pressure.",
      "Provides a stable reference point for colleagues during busy periods.",
      "Combines patience with enough drive to work through obstacles.",
      "Follows through on details that others assume are already handled.",
      "Holds a considered position without needing to win the argument loudly.",
    ],
    potentialProblemAreas: [
      "Resistance to change may show as delay rather than as open disagreement.",
      "Workload may be carried well past a reasonable point before help is requested.",
      "Persistence can keep a failing approach alive longer than it deserves.",
      "Frustration may build quietly and then surface more sharply than intended.",
      "Contribution may be understated in environments that reward visibility.",
    ],
    communicationTips: [
      "Say what you disagree with at the time, rather than working around it later.",
      "Ask for the reasoning behind a change so you can commit to it properly.",
      "Tell fast-moving colleagues what you need in order to reprioritize.",
      "Make progress visible so steady work is not mistaken for slow work.",
      "State your limit before your workload passes it.",
    ],
    motivators: [
      "Clear ownership of work you can see through to the end.",
      "A predictable environment with advance notice of change.",
      "Recognition for reliability, not only for new initiatives.",
      "Concrete goals rather than frequently shifting priorities.",
      "Colleagues who honor the commitments they make.",
    ],
    developmentTips: [
      "Book a short review to ask whether the current approach is still the right one.",
      "Raise a concern within a day of noticing it, in one plain sentence.",
      "Agree an explicit workload limit with your manager and revisit it regularly.",
      "Keep a brief record of what you delivered and share it periodically.",
      "Take on one small voluntary change each quarter to keep flexibility in practice.",
    ],
  },
  SI: {
    key: "SI",
    name: "Patient Encourager",
    epithet:
      "Steady first and sociable second, the calm presence people come to talk to.",
    description:
      "Steadiness leads your perceived self, with Influence as the supporting dimension. Patience and consistency tend to set the tone, with genuine warmth close behind. You may prefer to build relationships gradually and to be trusted as someone who listens without rushing. Where a more outgoing pattern draws people in quickly, this one tends to earn confidence over time.",
    emotionalTone:
      "You may be even-tempered and accepting, with a preference for friendly cooperation over open disagreement.",
    motivation:
      "You are likely to be motivated by belonging and harmony in a stable group where you can be genuinely useful to individuals.",
    judgesOthersBy:
      "You may judge others by whether they are considerate, trustworthy, and consistent in how they treat people.",
    influencesOthersBy:
      "You tend to influence through attentive listening, patience, and the reliability of your support over time.",
    organizationValue:
      "You may add most value by stabilizing relationships and giving colleagues a safe place to think out loud.",
    overuses:
      "You may overuse patience and accommodation, which can let other people set your priorities for you.",
    underPressure:
      "Under pressure you may withdraw, agree outwardly while disagreeing inwardly, or take on strain to keep the peace.",
    fears:
      "You may be most uneasy about open conflict, abrupt change, and losing a relationship you have invested in.",
    effectiveness:
      "Your effectiveness may increase when you state your own needs early, and treat a disagreement as information rather than as a threat.",
    generalTraits: [
      "Tends to listen more than you speak, and to remember what you hear.",
      "Often prefers a small number of steady relationships to a wide network.",
      "May take time to warm up, then remain constant afterwards.",
      "Usually looks for the option that keeps everyone reasonably comfortable.",
      "Likely to notice when a colleague is struggling before they say so.",
    ],
    strengths: [
      "Creates a calm atmosphere in which difficult conversations become possible.",
      "Supports colleagues consistently, not only when it is convenient.",
      "Mediates naturally between people who are talking past each other.",
      "Keeps commitments to individuals even when under pressure.",
      "Brings a settling influence to teams that run hot.",
    ],
    potentialProblemAreas: [
      "Your own preferences may go unstated until frustration accumulates.",
      "Unreasonable requests may be accepted rather than risk friction.",
      "Outward agreement can conceal real reservations.",
      "Change may be absorbed slowly, with the discomfort kept private.",
      "Contribution may be undervalued in cultures that reward assertiveness.",
    ],
    communicationTips: [
      "Name what you need in the same conversation in which you offer help.",
      "Use a short, factual sentence for disagreement rather than softening it away.",
      "With direct colleagues, lead with your conclusion and let the reasoning follow.",
      "Ask for time to consider rather than agreeing in the moment.",
      "Say when a change is unsettling you, so support can be offered.",
    ],
    motivators: [
      "A stable team with predictable expectations.",
      "Work where you can see the benefit to specific people.",
      "Sincere private appreciation rather than public spotlight.",
      "Advance notice and a clear reason when priorities change.",
      "Time to build relationships instead of constant reshuffling.",
    ],
    developmentTips: [
      "Practice stating one preference out loud in each planning discussion.",
      "Decide in advance what you will decline this week, then decline it.",
      "Separate the discomfort of conflict from the value of the disagreement.",
      "Ask directly for feedback rather than inferring it from tone.",
      "Give yourself a fixed adjustment period for change, then review how it actually went.",
    ],
  },
  SC: {
    key: "SC",
    name: "Steady Custodian",
    epithet:
      "Keeps the work running reliably, and keeps it correct while doing so.",
    description:
      "Steadiness leads your perceived self, with Conscientiousness as the supporting dimension. Patience and consistency tend to set the tone, with careful attention to standards close behind. You may be the person who maintains what others build, noticing the issues that only show up through repetition. Where a precision-led pattern starts from the rules, this one starts from the rhythm of the work and applies care within it.",
    emotionalTone:
      "You may be reserved and composed, with a strong preference for predictability and familiar methods.",
    motivation:
      "You are likely to be motivated by stability and correctness in your area of responsibility, with enough time to do the work properly.",
    judgesOthersBy:
      "You may judge others by the consistency of their standards, their thoroughness, and whether they can be trusted with details.",
    influencesOthersBy:
      "You tend to influence through dependable delivery, accurate work, and detailed familiarity with your own area.",
    organizationValue:
      "You may add most value by protecting quality and continuity in the work that simply has to keep functioning day after day.",
    overuses:
      "You may overuse caution and established procedure, which can slow down change that would help.",
    underPressure:
      "Under pressure you may become rigid, retreat into process, or quietly resist a decision rather than contest it.",
    fears:
      "You may be most uneasy about disruption to a system that works, and about being blamed for errors outside your control.",
    effectiveness:
      "Your effectiveness may increase when you test one improvement at a time, and describe risks in terms of impact rather than procedure.",
    generalTraits: [
      "Tends to prefer proven methods and a planned sequence of work.",
      "Often notices small inconsistencies that accumulate over time.",
      "May be slow to commit and very reliable once committed.",
      "Usually keeps thorough records without being asked to.",
      "Likely to feel uneasy when asked to improvise at short notice.",
    ],
    strengths: [
      "Sustains accuracy through long stretches of repetitive work.",
      "Builds routines that keep working after attention moves elsewhere.",
      "Anticipates practical problems that plans on paper tend to miss.",
      "Gives a calm, factual account of how things actually run.",
      "Maintains standards without needing supervision or reminders.",
    ],
    potentialProblemAreas: [
      "Change may be met with procedural objections rather than open discussion.",
      "Thoroughness can extend timelines beyond what the task requires.",
      "Correcting others' errors may substitute for addressing the cause.",
      "Discomfort with ambiguity can delay decisions that must be made on partial information.",
      "Valuable know-how may stay local because it is never written down.",
    ],
    communicationTips: [
      "State the risk you see and its likely consequence, not only the rule it breaks.",
      "Say how much time you need for accuracy instead of absorbing the pressure.",
      "Give fast-moving colleagues a short summary before the detailed version.",
      "Ask questions about a change early, while it can still be shaped.",
      "Share what you know about the work so it does not depend on you alone.",
    ],
    motivators: [
      "Clear standards and enough time to meet them.",
      "A stable role where your expertise is recognized.",
      "Advance notice of change, and a say in how it is implemented.",
      "Work that visibly keeps something reliable for other people.",
      "Relative freedom from constant interruption and reprioritization.",
    ],
    developmentTips: [
      "Agree a proportionate level of checking for each type of task.",
      "Pilot one change on a small scale rather than assessing it in theory.",
      "Document one part of your work each month so the knowledge is shared.",
      "Practice giving a recommendation with the caveats named but not leading.",
      "Flag capacity limits while the queue is building, not after it has built.",
    ],
  },
  CD: {
    key: "CD",
    name: "Rigorous Decider",
    epithet:
      "Starts from the evidence, then acts on it without waiting to be pushed.",
    description:
      "Conscientiousness leads your perceived self, with Dominance as the supporting dimension. Analysis and standards tend to set the tone, with a readiness to decide and drive close behind. You may want the facts settled before moving, and then move firmly. Where a drive-led pattern tends to act and correct afterwards, this one prefers to be right first and is willing to be blunt about what the evidence shows.",
    emotionalTone:
      "You may come across as cool and questioning, with visible impatience when reasoning is loose or claims go unchecked.",
    motivation:
      "You are likely to be motivated by correct outcomes achieved on your own terms, with the quality of the work beyond dispute.",
    judgesOthersBy:
      "You may judge others by their precision, their logical consistency, and whether they can defend their conclusions.",
    influencesOthersBy:
      "You tend to influence through evidence, thorough preparation, and a willingness to state an unpopular conclusion.",
    organizationValue:
      "You may add most value by testing assumptions before commitment and then holding the line on quality.",
    overuses:
      "You may overuse critical analysis and bluntness, which can leave people feeling examined rather than consulted.",
    underPressure:
      "Under pressure you may become sharply critical, take control of details, or dismiss input that arrives without support.",
    fears:
      "You may be most uneasy about being wrong, or about being held accountable for work whose standards you did not control.",
    effectiveness:
      "Your effectiveness may increase when you acknowledge the human impact of a decision, and ask questions before delivering a verdict.",
    generalTraits: [
      "Tends to test claims before accepting them, including your own.",
      "Often direct about problems and comfortable being the dissenting voice.",
      "May prefer written reasoning to verbal reassurance.",
      "Usually sets high standards and expects them to be met.",
      "Likely to become impatient with discussion that adds no new information.",
    ],
    strengths: [
      "Finds the flaw in a plan before it becomes an expensive mistake.",
      "Combines analytical depth with the resolve to act on conclusions.",
      "Holds quality steady when schedule pressure is high.",
      "Says the thing others are avoiding, with evidence to support it.",
      "Structures ambiguous problems into questions that can actually be decided.",
    ],
    potentialProblemAreas: [
      "Directness combined with critique can read as dismissive of people, not just ideas.",
      "Delegation may be limited because others' standards are not trusted.",
      "Time spent verifying can outlast the value of the decision.",
      "Emotional and relational factors may be treated as noise.",
      "Disagreement may turn into a contest over who is correct.",
    ],
    communicationTips: [
      "Say what holds up before listing what does not.",
      "State your conclusion and how confident you are, so others know what is settled.",
      "Ask a question in places where you would normally correct.",
      "With people-focused colleagues, name the human impact of the decision explicitly.",
      "Distinguish a standard you will not move on from a preference you can trade.",
    ],
    motivators: [
      "Complex problems where accuracy genuinely matters.",
      "Autonomy over how the work is done and how it is judged.",
      "Clear criteria and access to the underlying data.",
      "Respect from colleagues who are technically capable.",
      "Authority to act once the analysis is complete.",
    ],
    developmentTips: [
      "Set an explicit evidence threshold in advance, and decide once it is met.",
      "Open reviews by asking for the author's reasoning before giving your assessment.",
      "Delegate one task with agreed acceptance criteria instead of doing it yourself.",
      "Add one sentence about people impact to each recommendation.",
      "Notice when you are arguing to be right rather than to improve the outcome.",
    ],
  },
  CI: {
    key: "CI",
    name: "Diplomatic Analyst",
    epithet:
      "Careful with the facts, and careful with the people who have to hear them.",
    description:
      "Conscientiousness leads your perceived self, with Influence as the supporting dimension. Accuracy and analysis tend to set the tone, with sociability and tact close behind. You may work through the detail privately and then present it in a form people can accept. Where an expression-led pattern often persuades first and verifies afterwards, this one verifies first and then chooses the wording carefully.",
    emotionalTone:
      "You may be reserved and measured, while remaining attentive to how findings will land with the people involved.",
    motivation:
      "You are likely to be motivated by being both correct and well received, with your judgment trusted by the people who rely on it.",
    judgesOthersBy:
      "You may judge others by their accuracy, their fairness, and the tone in which they handle disagreement.",
    influencesOthersBy:
      "You tend to influence through careful reasoning presented tactfully, and through a reputation for being even-handed.",
    organizationValue:
      "You may add most value by delivering difficult analysis in a way that keeps people engaged rather than defensive.",
    overuses:
      "You may overuse diplomacy and qualification, softening a conclusion until the warning inside it is missed.",
    underPressure:
      "Under pressure you may become indirect, over-qualify findings, or avoid a confrontation the situation needs.",
    fears:
      "You may be most uneasy about criticism of your work, and about causing conflict by saying something too plainly.",
    effectiveness:
      "Your effectiveness may increase when you lead with the conclusion, and soften the delivery rather than the content.",
    generalTraits: [
      "Tends to prepare thoroughly before offering an opinion.",
      "Often reads the room and adjusts how you present rather than what you found.",
      "May be comfortable presenting yet private about unfinished thinking.",
      "Usually cautious with definite statements until you have checked them.",
      "Likely to prefer persuading through evidence over pressing a point.",
    ],
    strengths: [
      "Makes rigorous work understandable and acceptable to non-specialists.",
      "Raises uncomfortable findings without putting people on the defensive.",
      "Notices both the error in the data and the sensitivity in the room.",
      "Builds trust across groups that disagree with each other.",
      "Keeps standards high without making standards feel like criticism.",
    ],
    potentialProblemAreas: [
      "Hedged delivery may leave a serious concern sounding optional.",
      "Raising an issue may be delayed while you search for the right way to say it.",
      "Wanting both approval and accuracy can pull in opposite directions and stall a decision.",
      "Criticism may be taken personally and processed privately.",
      "Preparation may exceed what a short answer actually required.",
    ],
    communicationTips: [
      "Put the conclusion in the first sentence, then add the qualifications.",
      "Use a plain severity word, such as minor, significant, or blocking, so hedging cannot obscure it.",
      "Raise concerns while they are small, when tact is easier to maintain.",
      "With direct colleagues, keep the preamble short and offer detail on request.",
      "Say when you need more time instead of presenting provisional work as final.",
    ],
    motivators: [
      "Work that requires both analytical care and human judgment.",
      "Recognition for reliable, well-presented thinking.",
      "A collaborative environment where standards are shared.",
      "Clear expectations about scope and quality.",
      "Opportunities to explain findings to the people who will use them.",
    ],
    developmentTips: [
      "Write your headline finding in one unqualified sentence before drafting the rest.",
      "Set a deadline for raising a concern, independent of how polished the wording is.",
      "Ask whether you are protecting the relationship or avoiding the discomfort.",
      "Separate feedback on your work from judgment of your competence.",
      "Agree the expected depth of analysis before you begin.",
    ],
  },
  CS: {
    key: "CS",
    name: "Precise Stabilizer",
    epithet: "Gets the work right, then keeps it right.",
    description:
      "Conscientiousness leads your perceived self, with Steadiness as the supporting dimension. Precision and standards tend to set the tone, with patience and staying power close behind. You may set exacting expectations for your own work and then maintain them consistently over long periods. Where a patience-led pattern starts from keeping things running and applies care within it, this one starts from getting it correct and stays with it until it is.",
    emotionalTone:
      "You may be contained and serious about quality, with a strong dislike of avoidable error.",
    motivation:
      "You are likely to be motivated by accuracy and order in your own work, sustained without shortcuts or rushed compromise.",
    judgesOthersBy:
      "You may judge others by their precision, their thoroughness, and whether their work holds up on inspection.",
    influencesOthersBy:
      "You tend to influence through demonstrated competence, careful documentation, and consistently error-free delivery.",
    organizationValue:
      "You may add most value by setting and sustaining a standard others can rely on, especially where mistakes are costly.",
    overuses:
      "You may overuse checking and refinement, pushing effort past the point of useful return.",
    underPressure:
      "Under pressure you may narrow onto detail, become critical of other people's accuracy, or hold back from acting until you are certain.",
    fears:
      "You may be most uneasy about making a mistake, and about being judged on work you had no time to complete properly.",
    effectiveness:
      "Your effectiveness may increase when you agree an acceptable margin of error in advance, and treat the deadline as part of the quality standard.",
    generalTraits: [
      "Tends to work systematically and to finish one stage before starting the next.",
      "Often more comfortable with facts and procedures than with improvisation.",
      "May review your own work more than once before releasing it.",
      "Usually persistent with problems that require sustained attention.",
      "Likely to prefer clear rules to informal understandings.",
    ],
    strengths: [
      "Produces work that rarely needs rechecking.",
      "Maintains high standards without losing patience for the long parts.",
      "Builds documentation and process that outlast individual projects.",
      "Catches the small error that would otherwise compound later.",
      "Stays with a difficult technical problem past the point where others move on.",
    ],
    potentialProblemAreas: [
      "The pursuit of a flawless result can crowd out timeliness.",
      "Work that is already sufficient for its purpose may be held back.",
      "High standards applied to colleagues can be experienced as criticism.",
      "Ambiguous instructions may cause more delay than they need to.",
      "Rework may be absorbed quietly rather than traced to its source.",
    ],
    communicationTips: [
      "Ask what level of accuracy the task actually requires before starting it.",
      "Give a status update at a set interval, so silence is not read as no progress.",
      "Frame corrections as what the work requires rather than what the person got wrong.",
      "Summarize for time-pressed colleagues and keep your detail available separately.",
      "Say when a deadline and your standard are in conflict, early enough to renegotiate.",
    ],
    motivators: [
      "Well-defined work with a clear definition of correct.",
      "Enough time and quiet to do the work properly.",
      "Recognition for accuracy and dependability.",
      "Stable procedures and reliable information.",
      "Being trusted as the person who gets the detail right.",
    ],
    developmentTips: [
      "Set a time limit for checking, and stop when it is reached.",
      "Write down what 'complete' means for a task before you begin it.",
      "Ask for clarification within the first hour of meeting ambiguity.",
      "Practice sharing a good-enough draft and inviting feedback on it.",
      "Report recurring errors to their source instead of absorbing the rework.",
    ],
  },
  balanced: {
    key: "balanced",
    name: "Adaptive Generalist",
    epithet:
      "Shows no single dominant style and adjusts to what the situation asks for.",
    description:
      "No dimension stands out clearly in your perceived self, so your responses describe a relatively even profile across Dominance, Influence, Steadiness, and Conscientiousness. In practice this may reflect genuine flexibility: you can push, engage, steady, or verify depending on what the work needs. It can also mean the questionnaire did not find a clear self-image, which sometimes happens when a role demands several styles at once, when someone is new to their work, or when answers describe what the situation seemed to require rather than what felt true. Read the three graphs together before treating this as a settled description.",
    emotionalTone:
      "Your emotional expression may vary with context rather than following one consistent register.",
    motivation:
      "You may be motivated more by the demands of your current role than by one steady preference, which makes it worth identifying explicitly what you want from work.",
    judgesOthersBy:
      "You may judge others situationally, applying whichever standard the task in front of you seems to call for.",
    influencesOthersBy:
      "You tend to influence by reading the room and matching your approach to the person, rather than through one recognizable style.",
    organizationValue:
      "You may add most value in roles that need several behaviors in turn, and as someone who can translate between colleagues with sharper preferences.",
    overuses:
      "You may overuse adaptation, supplying whichever style is missing until your own priorities become hard for others to identify.",
    underPressure:
      "Under pressure your response may be less predictable, because there is no strongly preferred behavior to fall back on.",
    fears:
      "You may be most uneasy about being pinned to a single role or expectation that does not fit every part of your work.",
    effectiveness:
      "Your effectiveness may increase when you name your own preferences deliberately rather than letting each situation choose for you.",
    generalTraits: [
      "Adjusts approach to the person and the task at hand.",
      "Reasonably comfortable operating in several different styles.",
      "Rarely the most extreme voice in a group.",
      "May be described quite differently by different colleagues.",
      "Preferences can be hard for others, and sometimes for you, to predict.",
    ],
    strengths: [
      "Moves between driving, engaging, supporting, and verifying as the work requires.",
      "Translates between colleagues whose styles tend to clash.",
      "Settles into varied teams and unfamiliar situations without much friction.",
      "Avoids the blind spots that come with one strongly preferred style.",
      "Can supply whichever behavior a team is currently missing.",
    ],
    potentialProblemAreas: [
      "Colleagues may be unsure what you stand for or what you want.",
      "Adapting to others may crowd out your own priorities.",
      "An even profile may reflect an unclear self-image rather than flexibility.",
      "Your response under pressure may be harder for others to anticipate.",
      "Development priorities may be less obvious without one clear strength to build from.",
    ],
    communicationTips: [
      "Ask what approach this person would prefer rather than assuming one.",
      "Be explicit about the role you want them to play in a piece of work.",
      "Check which parts of the task genuinely interest them.",
      "Do not read agreement as preference; invite a stated position.",
    ],
    motivators: [
      "Varied work that uses more than one way of operating.",
      "Clarity about which behaviors a role actually rewards.",
      "Room to develop a preference rather than only respond to demand.",
      "Feedback on how your contribution is actually experienced.",
    ],
    developmentTips: [
      "Compare the public, private, and perceived graphs before drawing conclusions.",
      "Write down two or three situations where you felt most effective and look for the common behavior.",
      "State one clear preference in your next planning conversation.",
      "Consider retaking the questionnaire outside a period of transition, answering as you are rather than as the role asks.",
    ],
  },
};

export const discGraphMeta: Record<
  DiscGraphKey,
  { label: string; caption: string }
> = {
  public: {
    label: "Public self",
    caption:
      "Built from your MOST choices. It describes the behavior you tend to show other people at work, including how you may adapt to what a role appears to expect.",
  },
  private: {
    label: "Private self",
    caption:
      "Built from your LEAST choices. It describes your more instinctive responses, which tend to surface under pressure, fatigue, or when adapting takes too much effort. This graph runs the opposite way to its raw count: rarely rejecting a dimension gives it a high segment here, so a low number of LEAST picks reads as a high bar.",
  },
  perceived: {
    label: "Perceived self",
    caption:
      "Built from the difference between the other two graphs. It describes your core self-image, and it is the graph used to identify your behavioral pattern.",
  },
};
