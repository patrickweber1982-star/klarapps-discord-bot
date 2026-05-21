import { EmbedBuilder } from "discord.js";

const klarAppsBrand = {
  name: "KlarBot",
  colors: {
    success: 0x21a67a,
    error: 0xd64545,
    info: 0x2563eb,
    warning: 0xf59e0b,
    moderation: 0x7c3aed,
  },
};

function baseEmbed(title: string, description: string, color: number) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setFooter({ text: "KlarApps Systeme" })
    .setTimestamp();
}

export function successEmbed(description: string, title = "Erfolgreich") {
  return baseEmbed(title, description, klarAppsBrand.colors.success);
}

export function errorEmbed(description: string, title = "Fehler") {
  return baseEmbed(title, description, klarAppsBrand.colors.error);
}

export function infoEmbed(description: string, title = klarAppsBrand.name) {
  return baseEmbed(title, description, klarAppsBrand.colors.info);
}

export function warningEmbed(description: string, title = "Hinweis") {
  return baseEmbed(title, description, klarAppsBrand.colors.warning);
}

export function moderationEmbed(description: string, title = "Moderation") {
  return baseEmbed(title, description, klarAppsBrand.colors.moderation);
}
