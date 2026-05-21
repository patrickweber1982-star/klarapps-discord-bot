import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type APISelectMenuOption,
} from "discord.js";

export function primaryButton(customId: string, label: string) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Primary);
}

export function secondaryButton(customId: string, label: string) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);
}

export function linkButton(label: string, url: string) {
  return new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link);
}

export function stringSelectMenu(
  customId: string,
  placeholder: string,
  options: APISelectMenuOption[],
) {
  return new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addOptions(options);
}

export function textInput(customId: string, label: string, required = true) {
  return new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setRequired(required)
    .setStyle(TextInputStyle.Short);
}

export function modal(customId: string, title: string, inputs: TextInputBuilder[] = []) {
  const modalBuilder = new ModalBuilder().setCustomId(customId).setTitle(title);

  for (const input of inputs) {
    modalBuilder.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(input),
    );
  }

  return modalBuilder;
}
