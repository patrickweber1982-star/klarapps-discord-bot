import { EmbedBuilder } from "discord.js";

const klarAppsBrand = {
  name: "KlarBot",
  footer: "KlarBot • KlarApps Systeme",
  colors: {
    success: 0x21a67a,
    error: 0xd64545,
    info: 0x2563eb,
    warning: 0xf59e0b,
    moderation: 0x7c3aed,
    punishment: 0xef4444,
    onboarding: 0x14b8a6,
  },
};

type KlarBotEmbedType = keyof typeof klarAppsBrand.colors;

function baseEmbed(title: string, description: string, type: KlarBotEmbedType) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(klarAppsBrand.colors[type])
    .setFooter({ text: klarAppsBrand.footer })
    .setTimestamp();
}

export function successEmbed(description: string, title = "Erfolgreich") {
  return baseEmbed(title, description, "success");
}

export function errorEmbed(description: string, title = "Fehler") {
  return baseEmbed(title, description, "error");
}

export function infoEmbed(description: string, title = klarAppsBrand.name) {
  return baseEmbed(title, description, "info");
}

export function warningEmbed(description: string, title = "Hinweis") {
  return baseEmbed(title, description, "warning");
}

export function moderationEmbed(description: string, title = "Moderation") {
  return baseEmbed(title, description, "moderation");
}

export function punishmentEmbed(description: string, title = "Moderationsaktion") {
  return baseEmbed(title, description, "punishment");
}

export function onboardingEmbed(description: string, title = "KlarApps Onboarding") {
  return baseEmbed(title, description, "onboarding");
}
