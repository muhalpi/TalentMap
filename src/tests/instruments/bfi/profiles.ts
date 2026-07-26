import type { BfiTraitBand, BfiTraitKey } from "./types";

interface BfiBandProfile {
  description: string;
  workStyle: string;
  strength: string;
  watchOut: string;
  developmentTip: string;
}

interface BfiTraitProfileDefinition {
  code: "E" | "A" | "C" | "ES" | "O";
  label: string;
  bands: Record<BfiTraitBand, BfiBandProfile>;
}

export const bfiTraitOrder: BfiTraitKey[] = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "opennessIntellect",
];

export const bfiTraitProfiles: Record<
  BfiTraitKey,
  BfiTraitProfileDefinition
> = {
  extraversion: {
    code: "E",
    label: "Extraversion",
    bands: {
      lower: {
        description: "You tend to be reserved, selective about social energy, and comfortable working independently.",
        workStyle: "You may contribute best after reflection and often prefer focused or small-group settings.",
        strength: "Brings attentive listening, calm presence, and sustained independent focus.",
        watchOut: "Useful ideas may remain less visible when the environment rewards rapid or frequent speaking.",
        developmentTip: "Prepare one contribution before important group discussions and choose deliberate moments to make it visible.",
      },
      moderate: {
        description: "You can move between social engagement and independent focus without strongly favoring either.",
        workStyle: "You are likely to adapt your level of interaction to the people and task in front of you.",
        strength: "Balances group participation with space for reflection and concentration.",
        watchOut: "Others may not always know whether you want collaboration or protected focus time.",
        developmentTip: "State your preferred collaboration rhythm explicitly at the start of shared work.",
      },
      higher: {
        description: "You tend to gain energy from interaction, activity, and visible participation with others.",
        workStyle: "You may think aloud, initiate conversations, and help create momentum in group settings.",
        strength: "Builds connection quickly and brings visible energy to collaborative work.",
        watchOut: "Fast verbal processing can leave less space for quieter colleagues or deeper reflection.",
        developmentTip: "Add a deliberate pause before closing discussion and invite input from people who have not spoken.",
      },
    },
  },
  agreeableness: {
    code: "A",
    label: "Agreeableness",
    bands: {
      lower: {
        description: "You tend to be candid, questioning, and willing to challenge people or assumptions directly.",
        workStyle: "You may prioritize evidence, standards, and outcomes over maintaining immediate harmony.",
        strength: "Surfaces difficult issues and tests ideas without relying on social consensus.",
        watchOut: "Direct challenge can be experienced as dismissive when intent or empathy is not made explicit.",
        developmentTip: "Pair critique with a clear statement of shared purpose and acknowledge the other person's perspective first.",
      },
      moderate: {
        description: "You tend to balance cooperation and empathy with a willingness to disagree when necessary.",
        workStyle: "You can support relationships while still evaluating ideas on their merits.",
        strength: "Combines practical candor with consideration for how decisions affect others.",
        watchOut: "You may delay choosing between harmony and challenge when a situation demands a clearer stance.",
        developmentTip: "Name whether the moment calls primarily for support, exploration, or a firm decision.",
      },
      higher: {
        description: "You tend to be cooperative, compassionate, and attentive to other people's needs and feelings.",
        workStyle: "You may invest naturally in trust, support, and maintaining constructive working relationships.",
        strength: "Creates psychological safety and notices the human impact of decisions.",
        watchOut: "A strong preference for harmony can make boundaries, conflict, or unpopular decisions harder to address.",
        developmentTip: "Practice stating one clear boundary or disagreement while keeping the relationship respectful.",
      },
    },
  },
  conscientiousness: {
    code: "C",
    label: "Conscientiousness",
    bands: {
      lower: {
        description: "You tend to favor flexibility, spontaneity, and adapting as circumstances change.",
        workStyle: "You may work in bursts, keep options open, and resist structure that feels unnecessary.",
        strength: "Responds flexibly when priorities shift and avoids overengineering routine work.",
        watchOut: "Details, deadlines, or follow-through may become vulnerable when work lacks external structure.",
        developmentTip: "Use one visible system for commitments and define the next concrete action before leaving a task.",
      },
      moderate: {
        description: "You tend to combine planning and reliability with room to adjust when conditions change.",
        workStyle: "You can use structure pragmatically without needing every detail fixed in advance.",
        strength: "Balances dependable execution with practical flexibility.",
        watchOut: "Your level of structure may vary across tasks, which can make consistency harder under pressure.",
        developmentTip: "Identify which commitments require a checklist and which genuinely benefit from improvisation.",
      },
      higher: {
        description: "You tend to be organized, deliberate, dependable, and attentive to standards and completion.",
        workStyle: "You may plan ahead, track details, and prefer clear commitments and orderly execution.",
        strength: "Creates reliability through preparation, follow-through, and attention to quality.",
        watchOut: "High standards can become rigidity, overcontrol, or unnecessary perfectionism when conditions change.",
        developmentTip: "Define what 'good enough' means before starting and revisit the plan when new information arrives.",
      },
    },
  },
  emotionalStability: {
    code: "ES",
    label: "Emotional stability",
    bands: {
      lower: {
        description: "You tend to notice pressure and emotional shifts quickly and may experience stress more intensely.",
        workStyle: "You may be alert to risks, interpersonal tension, and signals that something needs attention.",
        strength: "Detects emerging concerns and emotional undercurrents that others may miss.",
        watchOut: "Sustained uncertainty or pressure can consume attention and make recovery more difficult.",
        developmentTip: "Build a repeatable recovery routine and separate immediate facts from anticipated outcomes during stressful moments.",
      },
      moderate: {
        description: "You tend to respond emotionally to meaningful pressure while regaining equilibrium in ordinary conditions.",
        workStyle: "You are likely to register risks without being consistently dominated by them.",
        strength: "Combines sensitivity to pressure with a generally steady response.",
        watchOut: "Stress may accumulate gradually before you recognize that your usual coping approach needs adjustment.",
        developmentTip: "Use an early warning signal—sleep, focus, or irritability—to trigger recovery before pressure compounds.",
      },
      higher: {
        description: "You tend to remain calm, even-tempered, and resilient when facing routine pressure or uncertainty.",
        workStyle: "You may provide steadiness during setbacks and make decisions without strong emotional reactivity.",
        strength: "Maintains composure and helps stabilize work during demanding periods.",
        watchOut: "Calmness can sometimes make other people's urgency or emotional signals seem less significant than they feel.",
        developmentTip: "Check explicitly for concerns from others before assuming a situation feels manageable to everyone.",
      },
    },
  },
  opennessIntellect: {
    code: "O",
    label: "Openness / intellect",
    bands: {
      lower: {
        description: "You tend to prefer concrete information, familiar methods, and ideas with clear practical relevance.",
        workStyle: "You may focus on what is proven, understandable, and directly useful to the task.",
        strength: "Grounds discussion in practical reality and established experience.",
        watchOut: "Unfamiliar or abstract ideas may be dismissed before their potential value becomes clear.",
        developmentTip: "Before rejecting a novel idea, identify one small, low-risk way to test it in practice.",
      },
      moderate: {
        description: "You tend to balance curiosity about new ideas with a preference for practical application.",
        workStyle: "You can explore alternatives while still asking how they connect to real constraints and outcomes.",
        strength: "Translates between imaginative possibilities and workable solutions.",
        watchOut: "You may stay in evaluation mode when a situation needs either bolder exploration or faster execution.",
        developmentTip: "Decide whether the current phase is for expanding options or narrowing them, then work accordingly.",
      },
      higher: {
        description: "You tend to be curious, imaginative, reflective, and comfortable engaging with complex or abstract ideas.",
        workStyle: "You may enjoy learning, reframing problems, and generating possibilities beyond established approaches.",
        strength: "Brings conceptual range, curiosity, and original perspectives to ambiguous problems.",
        watchOut: "Exploration can outpace practical constraints or make routine execution feel less engaging.",
        developmentTip: "Translate each promising idea into a concrete experiment, owner, and next decision point.",
      },
    },
  },
};
