import TelegramBot from 'node-telegram-bot-api';
import {
  deleteUserData,
  getUser,
  acceptConsent,
  hasConsent,
} from '../db/repository.js';

const PRIVACY_POLICY = `📄 Политика конфиденциальности @dietmealfitbot

1. Какие данные собираем: имя (из Telegram), возраст, пол, рост, вес, цели питания, аллергии, история чата с AI.

2. Зачем: исключительно для составления персонального рациона питания внутри приложения.

3. Где хранятся: на защищённом сервере. Не передаются третьим лицам, не используются в рекламных целях.

4. Как удалить: напиши /delete — все твои данные будут удалены в течение 24 часов.

5. Оператор данных: бот @dietmealfitbot, разработчик — физическое лицо, Россия.

6. Основание обработки: согласие пользователя (ст. 9 ФЗ №152).`;

const START_MESSAGE = `Привет! Я AI-диетолог 🥗

Помогу составить персональный рацион питания, рецепты и отвечу на вопросы по питанию.

⚠️ Для работы мне нужны твои данные (возраст, вес, рост, цели питания).
Они хранятся только для персонализации твоего рациона и никому не передаются.

Нажимая «Принять и начать», ты соглашаешься с обработкой персональных данных
в соответствии с Федеральным законом №152-ФЗ «О персональных данных».

⚕️ Дисклеймер: бот не является медицинским устройством и не заменяет консультацию врача.`;

const HOW_IT_WORKS = `Вводишь параметры → AI составляет меню с рецептами и КБЖУ.

Бесплатно: меню 3 дня + 3 совета + 3 вопроса в неделю
Premium: 7 дней + безлимит + замена блюд — 299₽/мес`;

const HELP_MESSAGE = `ℹ️ Помощь @dietmealfitbot

/start — начать работу
/app — открыть приложение
/delete — удалить все данные

Поддержка: @dietmealfitbot
Premium: открой приложение → ⭐ Premium (299₽/мес)`;

function appKeyboard(frontendUrl: string, withHow = false) {
  const rows: TelegramBot.InlineKeyboardButton[][] = [
    [{ text: '🥗 Открыть приложение', web_app: { url: frontendUrl } }],
  ];
  if (withHow) {
    rows.push([{ text: '❓ Как это работает', callback_data: 'how_it_works' }]);
  }
  rows.push([{ text: '📄 Политика конфиденциальности', callback_data: 'privacy' }]);
  return { inline_keyboard: rows };
}

function getAdminTelegramId(): string | null {
  const id = process.env.ADMIN_TELEGRAM_ID?.trim();
  return id || null;
}

function isAdmin(telegramId: string): boolean {
  const adminId = getAdminTelegramId();
  return !!adminId && telegramId === adminId;
}

function formatUsername(username?: string): string {
  return username ? `@${username}` : 'без username';
}

const SUPPORT_AUTO_REPLY =
  'Спасибо! Я получил твоё сообщение и отвечу как можно скорее 🙏';

async function forwardSupportMessage(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const adminId = getAdminTelegramId();
  if (!adminId) {
    console.warn('ADMIN_TELEGRAM_ID не задан — сообщения поддержки не пересылаются');
    return;
  }

  const telegramId = String(msg.from?.id);
  const name = msg.from?.first_name || 'Пользователь';
  const username = formatUsername(msg.from?.username);
  const text = msg.text || '';

  await bot.sendMessage(
    adminId,
    `💬 Поддержка от ${name} (ID: ${telegramId}, ${username}):\n${text}\n\nЧтобы ответить, используй команду:\n/reply ${telegramId} текст ответа`
  );
}

export function initBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан — бот не запущен');
    return null;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const bot = new TelegramBot(token, { polling: true });

  bot.setMyCommands([
    { command: 'start', description: 'Начать' },
    { command: 'app', description: 'Открыть приложение' },
    { command: 'help', description: 'Помощь и поддержка' },
  ]).catch(() => {});

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id);
    const user = await getUser(telegramId);
    const name = user?.name || user?.first_name || msg.from?.first_name || 'друг';

    if (hasConsent(user)) {
      await bot.sendMessage(chatId, `С возвращением, ${name}! 👋`, {
        reply_markup: appKeyboard(frontendUrl),
      });
      return;
    }

    await bot.sendMessage(chatId, START_MESSAGE, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Принять и начать', callback_data: 'accept_start' }],
          [{ text: '📄 Политика конфиденциальности', callback_data: 'privacy' }],
        ],
      },
    });
  });

  bot.onText(/\/app/, async (msg) => {
    await bot.sendMessage(msg.chat.id, '🥗 Открываю приложение:', {
      reply_markup: appKeyboard(process.env.FRONTEND_URL || 'http://localhost:5173'),
    });
  });

  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(msg.chat.id, HELP_MESSAGE);
  });

  bot.onText(/\/appss_verify/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'appss_46a816');
  });

  bot.onText(/^\/reply(?:@\w+)?\s+(\d+)\s+([\s\S]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = String(msg.from?.id);

    if (!isAdmin(senderId)) {
      await bot.sendMessage(chatId, 'Эта команда доступна только администратору.');
      return;
    }

    const targetId = match?.[1];
    const replyText = match?.[2]?.trim();
    if (!targetId || !replyText) {
      await bot.sendMessage(chatId, 'Использование: /reply {telegramId} текст ответа');
      return;
    }

    try {
      await bot.sendMessage(targetId, `💬 Поддержка:\n${replyText}`);
      await bot.sendMessage(chatId, `✅ Ответ отправлен пользователю ${targetId}`);
    } catch {
      await bot.sendMessage(chatId, 'Не удалось отправить сообщение. Проверь ID пользователя.');
    }
  });

  bot.on('message', async (msg) => {
    if (!msg.text || msg.chat.type !== 'private') return;
    if (msg.text.startsWith('/')) return;

    const senderId = String(msg.from?.id);
    if (!senderId || isAdmin(senderId)) return;

    try {
      await forwardSupportMessage(bot, msg);
      await bot.sendMessage(msg.chat.id, SUPPORT_AUTO_REPLY);
    } catch (err) {
      console.error('Ошибка пересылки в поддержку:', err);
      await bot.sendMessage(msg.chat.id, SUPPORT_AUTO_REPLY);
    }
  });

  bot.on('callback_query', async (query) => {
    if (!query.message || !query.from) return;
    const chatId = query.message.chat.id;
    const telegramId = String(query.from.id);
    const name = query.from.first_name || 'друг';

    if (query.data === 'privacy') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, PRIVACY_POLICY);
      return;
    }

    if (query.data === 'how_it_works') {
      await bot.answerCallbackQuery(query.id);
      await bot.sendMessage(chatId, HOW_IT_WORKS, {
        reply_markup: appKeyboard(frontendUrl),
      });
      return;
    }

    if (query.data === 'accept_start') {
      await bot.answerCallbackQuery(query.id);
      await acceptConsent(telegramId, query.from.first_name);

      await bot.sendMessage(
        chatId,
        `Отлично, ${name}! 👋\n\nОткрой приложение и введи данные — составлю персональный рацион за 1 минуту.`,
        { reply_markup: appKeyboard(frontendUrl, true) }
      );
    }
  });

  bot.onText(/\/delete/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id);
    if (!telegramId) return;

    await deleteUserData(telegramId);
    await bot.sendMessage(chatId, '✅ Все твои данные удалены. Если захочешь вернуться — напиши /start');
  });

  console.log('Telegram бот запущен');
  return bot;
}
