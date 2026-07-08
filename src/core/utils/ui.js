import { ansi } from "../../../helpers/ansiStyle.js";
import { SystemError, execAsync } from "../constants.js";

/**
 * Send a desktop notification.
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {'normal' | 'critical' | 'low' } urgency - The urgency level of the notification (default='normal')
 * @param {Object} [config] - Configuration object
 * @returns {Promise<void>}
 */
export async function notify(title, message = "", urgency = "normal", config) {
  const disableNotification = config?.disableNotification ?? globalThis.USER_ARGUMENTS?.disableNotification;
  if (disableNotification) return;
  const command = [
    "notify-send",
    "-u",
    urgency,
    title,
    message,
  ];
  await execAsync(command)
    .catch((error) => {
      throw new SystemError("Failed to send notification.", error);
    });
}

/**
 * Log a message to the console if inspection is enabled.
 * @param {string} message - The message to log
 * @param {Object} [config] - Configuration object
 */
export function log(message, config) {
  const inspection = config?.inspection;
  if (!inspection) return;
  const fmtMsg = message.split(";")
    .map((line) => ` ${ansi.style.brightGreen}◉ ${line}${ansi.style.reset}`)
    .join("\n");

  print(fmtMsg);
}
