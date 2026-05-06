type SiteAutopilotMode = "review_only" | "auto_schedule" | "near_full_auto";

type AccountAutopilotShape = {
  autoGenerateEnabled?: boolean | null;
  autoGenerateMode?: string | null;
  personaLabel?: string | null;
  personaPrompt?: string | null;
  topicFocus?: string | null;
  hookStyle?: string | null;
  ctaStyle?: string | null;
  voiceGuardrails?: string | null;
  autoGeneratePrompt?: string | null;
  autoGenerateGoal?: string | null;
};

function hasLegacyAutopilotContext(account: AccountAutopilotShape) {
  return Boolean(
    account.personaLabel?.trim() ||
      account.personaPrompt?.trim() ||
      account.topicFocus?.trim() ||
      account.hookStyle?.trim() ||
      account.ctaStyle?.trim() ||
      account.voiceGuardrails?.trim() ||
      account.autoGeneratePrompt?.trim() ||
      account.autoGenerateGoal?.trim()
  );
}

export function isAutopilotEnabledForAccount(
  account: AccountAutopilotShape,
  siteAutopilotMode: SiteAutopilotMode = "near_full_auto"
) {
  if (account.autoGenerateEnabled) {
    return true;
  }

  if (siteAutopilotMode === "review_only") {
    return false;
  }

  return hasLegacyAutopilotContext(account);
}

export function getEffectiveAutopilotMode(account: AccountAutopilotShape) {
  return account.autoGenerateMode === "draft" ? "draft" : "scheduled";
}
