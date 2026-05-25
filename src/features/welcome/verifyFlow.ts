import { PermissionFlagsBits, type GuildMember, type Role } from "discord.js";

import { ensureCommunityRole } from "../../utils/roles.js";
import {
  buildAlreadyVerifiedEmbed,
  buildCommunityUnlockedEmbed,
  buildWelcomeErrorEmbed,
} from "./welcomeEmbeds.js";
import { logOnboardingStepFailed, logVerifyCompleted } from "./welcomeLogger.js";

async function getBotMember(member: GuildMember) {
  return member.guild.members.me ?? member.guild.members.fetchMe().catch(() => null);
}

function canManageRole(input: {
  botMember: GuildMember | null;
  role: Role;
}) {
  if (!input.botMember) {
    return {
      ok: false,
      message:
        "KlarBot konnte die eigene Bot-Rolle nicht pruefen. Bitte informiere das Team.",
    };
  }

  if (!input.botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return {
      ok: false,
      message:
        "KlarBot fehlt die Berechtigung Rollen verwalten. Bitte pruefe die Serverrechte.",
    };
  }

  if (input.role.managed) {
    return {
      ok: false,
      message:
        "Diese Rolle wird von Discord oder einer Integration verwaltet und kann nicht automatisch vergeben werden.",
    };
  }

  if (input.botMember.roles.highest.comparePositionTo(input.role) <= 0) {
    return {
      ok: false,
      message:
        "Die KlarBot-Rolle ist zu niedrig. Bitte schiebe die Bot-Rolle ueber die Verify-Rolle.",
    };
  }

  return {
    ok: true,
    message: "",
  };
}

function verifyFailure(message: string) {
  return {
    ok: false,
    message,
    embed: buildWelcomeErrorEmbed(message),
  };
}

function verifySuccess(message: string, embed: ReturnType<typeof buildCommunityUnlockedEmbed>) {
  return {
    ok: true,
    message,
    embed,
  };
}

export async function verifyCommunityMember(
  member: GuildMember,
  options: {
    verifiedRoleId?: string | null;
    removeRoleId?: string | null;
  } = {},
) {
  try {
    const role = options.verifiedRoleId
      ? await member.guild.roles.fetch(options.verifiedRoleId)
      : await ensureCommunityRole(member.guild);

    if (!role) {
      return verifyFailure(
        "Die Verify-Rolle wurde auf diesem Server nicht gefunden. Bitte informiere das Team.",
      );
    }

    const botMember = await getBotMember(member);
    const roleCheck = canManageRole({ botMember, role });

    if (!roleCheck.ok) {
      logOnboardingStepFailed("verify", new Error(roleCheck.message));
      return verifyFailure(roleCheck.message);
    }

    if (member.roles.cache.has(role.id)) {
      return {
        ok: true,
        message: "Mitglied war bereits verifiziert.",
        embed: buildAlreadyVerifiedEmbed(),
      };
    }

    if (options.removeRoleId && member.roles.cache.has(options.removeRoleId)) {
      const removeRole = await member.guild.roles.fetch(options.removeRoleId);

      if (removeRole) {
        const removeRoleCheck = canManageRole({ botMember, role: removeRole });

        if (!removeRoleCheck.ok) {
          logOnboardingStepFailed("verify", new Error(removeRoleCheck.message));
          return verifyFailure(removeRoleCheck.message);
        }
      }
    }

    await member.roles.add(role, "KlarBot Verify: Community-Rolle vergeben");

    if (options.removeRoleId && member.roles.cache.has(options.removeRoleId)) {
      await member.roles.remove(
        options.removeRoleId,
        "KlarBot Verify: optionale Rolle entfernt",
      );
    }


    logVerifyCompleted(member.user, member.guild);

    return verifySuccess(
      "Mitglied wurde erfolgreich verifiziert.",
      buildCommunityUnlockedEmbed(member.user),
    );
  } catch (error) {
    logOnboardingStepFailed("verify", error);
    return verifyFailure(
      "KlarBot konnte die Community-Rolle nicht vergeben. Bitte informiere das Team.",
    );
  }
}
