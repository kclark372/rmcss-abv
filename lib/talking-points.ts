/**
 * Motivational-interviewing talking points shown to staff on the RMC meeting
 * form, transcribed verbatim from "Talking points for RMC Meeting".
 *
 * Each block is one collapsible panel. A group with `items` renders as a
 * bulleted list; a group with only a `label` renders as a lead-in / aside line.
 */

export interface TalkingPointGroup {
  /** Optional heading, or a standalone line when there are no `items`. */
  label?: string;
  items?: readonly string[];
}

export interface TalkingPointBlock {
  title: string;
  groups: readonly TalkingPointGroup[];
}

export const TALKING_POINTS = {
  q1q2: {
    title: '💡 Talking points for Q1 and Q2',
    groups: [
      {
        items: [
          `Can you tell me more about when …(most recent/severe problem)`,
          `It looks like you have been using (substance type/frequency of use in past 90 days) please tell me a little bit about your recent use and what you think about it.`,
          `How do you imagine things will be like if you continue using?`,
        ],
      },
      {
        label: `Reflect back what the participant says and follow the MI strategies:`,
        items: [
          `Express Empathy: “Seeing on paper how much drugs and alcohol you’ve been using seems to be sort of surprising to you.”`,
          `Develop Discrepancy: “In what way do you think that staying in treatment could help you be a better parent?” Query extremes: “What’s the worst thing that might happen if things stay the same?...What’s the best thing if you stick with it (treatment)?” Double sided reflection: “On one hand it is hard to stop completely. On the other hand you’ve done it before...”`,
          `Avoid Argumentation: “You’re saying that drugs should be legalized anyway. I’m not going to debate you on that. In the meantime though, while they’re still illegal, it sounds like you’re really sick of the legal hassles related to your drug use.”`,
          `Support Self-Efficacy: “Your openness in talking about these issues is admirable.”`,
          `Emphasize Autonomy: “Ultimately it’s up to you.” “You know your body/health/life better than anyone else.” “This is your decision.”`,
        ],
      },
      {
        label: `Offer a summary of change talk and end with: “Ultimately the decision is yours and I’m wondering where you’re at. Where does this leave you? What might be next for you?”`,
      },
      {
        label: `RECOVERY – NO PAST 90 DAY USE`,
        items: [
          `What do you like about not using?`,
          `What do you like most about your recovery right now?`,
          `How has your life changed since you’ve stopped using?`,
          `What’s the best thing about recovery?`,
          `What things have gotten better?`,
        ],
      },
      { label: `What has helped you to stay off of alcohol or other drugs?` },
    ],
  },

  q3: {
    title: '💡 Talking points for Q3',
    groups: [
      {
        label: `It looks like you were in treatment for your (drug and/or alcohol) use in the past 90 days/ever. Can you tell me how that went for you?`,
      },
      {
        items: [
          `What things have you liked about treatment?`,
          `What has helped you learn skills for staying off of (drugs or alcohol)?`,
          `What kinds of skills have you learned for coping with problems that come up in your life?`,
          `How has your life gotten better since you’ve been in treatment?`,
        ],
      },
      { label: `What do you like about what you’ve done?` },
    ],
  },

  q4: {
    title: '💡 Talking points for Q4',
    groups: [
      {
        items: [
          `I’m hearing that [X, Y, Z] are bothering you.`,
          `What’s bothering you most out of those things?`,
          `What’s worrying you the most?`,
          `I’m guessing that (X, Y, Z) problems is bothering you the most.`,
          `What do you feel is most important for you to address right now?`,
          `Tell me more.`,
        ],
      },
    ],
  },

  q5: {
    title: '💡 Talking points for Q5',
    groups: [
      {
        items: [
          `Tell me more about that . . .`,
          `Seems to me you’re really concerned about . . .`,
        ],
      },
    ],
  },

  q6: {
    title: '💡 Talking points for Q6',
    groups: [
      {
        items: [
          `What else, if anything, might get in the way of going to (staying in) treatment?`,
          `Or: Of the things you mention, what worries you the most?`,
          `Invite solving the problem together; ask permission to offer suggestions, examples:`,
          `Can we talk a little more about these issues and how they might be addressed?`,
          `Or: Would you like to hear what’s worked for other participants dealing with these issues?`,
          `You’re not alone in that aspect`,
          `That’s a barrier for a lot of people`,
          `Working with participants in your situation, they will…`,
          `We can help you with that, if you want to talk about it some more`,
        ],
      },
    ],
  },

  importance: {
    title: '💡 Talking points for Importance',
    groups: [
      {
        label: `Overall points to guide discussion:`,
        items: [
          `Slow down, listen & empathize`,
          `Affirm effort`,
          `Explore and acknowledge the hardships to achieving their current goal. Use language like “right now,” “sometimes,” “maybe,” “a part of you” to introduce the possibility of change in the future`,
          `If they are struggling, normalize their experience`,
          `Summarize and reflect their feelings about achieving their current goal`,
          `Inquire how their current goal aligns with their overall goals/values. Use examples.`,
          `Support their autonomy to make change.`,
          `Explore what may help them make change to move toward their goal.`,
        ],
      },
      {
        label: `Low 1-3:`,
        items: [
          `Thank you for being honest`,
          `You’re not alone. Lots of people struggle with [going to treatment, staying in treatment, relapse, not using, etc]`,
          `A lot of participants start out where you are.`,
          `What would move you up from a (1) or (2) to a (2) or (3)? Repeat reason`,
        ],
      },
      {
        label: `Moderate 4-6:`,
        items: [
          `You have a good idea of what you want/need.`,
          `So you’re kind of in between / the middle / right now.`,
          `Go down on the ruler: What puts you at (5-6-7) instead of 1 or 2? Repeat reason`,
          `Go one number higher: What would it take to get to (6-7-8)? Repeat reason — What would it take to move up one number on the ruler? Repeat reason`,
        ],
      },
      {
        label: `High 7-10:`,
        items: [
          `That’s great to hear.`,
          `This is clearly important to you.`,
          `You’re really committed to [starting treatment; staying in treatment; staying in recovery, cutting down on your use]`,
          `You have a great idea of what you want/need.`,
          `What’s going to keep you there (9-10)? Repeat reason — How do you stay there? Repeat reason`,
        ],
      },
      {
        label: `What could potentially get in the way? How do you want to handle that? Repeat how.`,
      },
    ],
  },

  confidence: {
    title: '💡 Talking points for Confidence',
    groups: [
      { label: `Explore past success and strengths to guide discussion of confidence.` },
      {
        label: `Overall points to guide discussion:`,
        items: [
          `Slow down, listen & empathize`,
          `Affirm effort`,
          `Use language like “right now,” “sometimes,” “maybe,” “a part of you” to introduce that change might be possible`,
          `Inquire about their ability, strengths, past successes in other areas; affirm response.`,
          `Ask permission to share a strength that you’ve observed`,
          `Support their autonomy to make change.`,
          `Explore what may help them make change to move toward their goal.`,
          `Summarize success and strengths`,
        ],
      },
      {
        label: `None/Low 1-3:`,
        items: [
          `Thank you for taking these questions seriously and giving me your honest answer.`,
          `Right now, it's a bit of a blank. That happens. We understand.`,
          `So you’re mulling things over.`,
          `“This is really hard right now. When other things have been hard, in the past, how did you handle it?”`,
          `You’ve got some hesitation which is normal.`,
          `You’re not alone.`,
          `A lot of participants start out where you are.`,
          `What would move you from a (1) or (2) to a (2) or (3)? Repeat reason`,
        ],
      },
      {
        label: `Moderate 4-6: [Use your hands to show the scale]`,
        items: [
          `So, you’re kind of in between / the middle / right now.`,
          `Go down on the ruler: What puts you at (5-6-7) instead of 1 or 2? Repeat reason`,
          `Go up one number: What would it take to go from (current number to) one higher (6-7-8)? Repeat reason`,
          `OR What would it take to move up one number on the ruler?`,
        ],
      },
      {
        label: `High 7-10:`,
        items: [
          `That’s great to hear.`,
          `You’ve got a lot of confidence when it comes to your recovery.`,
          `You’re ready to take charge of your life.`,
          `What’s going to keep you there (9-10)? Repeat reason`,
          `How do you stay there? Repeat reason`,
        ],
      },
      {
        label: `OR What could potentially get in the way? How do you want to handle that? Repeat how.`,
      },
    ],
  },
} satisfies Record<string, TalkingPointBlock>;
