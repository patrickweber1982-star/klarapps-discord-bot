import { EmbedBuilder } from "discord.js";

const klarAppsBrand = {
  name: "KlarBot",
  colors: {
    success: 0x21a67a,
    error: 0xd64545,
    info: 0x2563eb,
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
