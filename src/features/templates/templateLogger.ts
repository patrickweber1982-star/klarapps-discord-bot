import { logger } from "../../utils/logger.js";

export function logTemplateSelected(template: string) {
  logger.template(`template selected | template=${template}`);
}

export function logTemplatesMerged(templates: string[]) {
  logger.template(`merged templates | templates=${templates.join(",")}`);
}

export function logCreated(type: "role" | "channel" | "category", name: string) {
  logger.template(`created ${type} | name=${name}`);
}

export function logSkipped(type: "role" | "channel" | "category", name: string) {
  logger.template(`skipped existing ${type} | name=${name}`);
}
