import TelegramBot from 'node-telegram-bot-api';

let botInstance: TelegramBot | null = null;

export function setBot(bot: TelegramBot | null) {
  botInstance = bot;
}

export function getBot(): TelegramBot | null {
  return botInstance;
}
