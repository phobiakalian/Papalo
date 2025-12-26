from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils import executor
from aiogram.dispatcher import FSMContext
from aiogram.contrib.fsm_storage.memory import MemoryStorage
from aiogram.dispatcher.filters.state import State, StatesGroup
import asyncio

from db import add_userbot, get_all_userbots, update_status, get_expired_userbots
from userbot_manager import start_userbot, stop_userbot

API_TOKEN = '12345:1ANKNKA91'

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot, storage=MemoryStorage())

class RegisterUserbot(StatesGroup):
    waiting_name = State()
    waiting_prefix = State()
    waiting_duration = State()
    waiting_session = State()

@dp.message_handler(commands=['start', 'menu'])
async def cmd_start(msg: types.Message):
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("Register Userbot", callback_data="register"))
    markup.add(InlineKeyboardButton("List Userbots", callback_data="list"))
    await msg.answer("Selamat datang di Panel Admin Userbot!", reply_markup=markup)

@dp.callback_query_handler(lambda c: c.data == "register")
async def register_handler(callback: types.CallbackQuery):
    await callback.message.answer("Masukkan nama userbot:")
    await RegisterUserbot.waiting_name.set()

@dp.message_handler(state=RegisterUserbot.waiting_name)
async def get_name(msg: types.Message, state: FSMContext):
    await state.update_data(name=msg.text)
    await msg.answer("Masukkan prefix (contoh: . atau !):")
    await RegisterUserbot.waiting_prefix.set()

@dp.message_handler(state=RegisterUserbot.waiting_prefix)
async def get_prefix(msg: types.Message, state: FSMContext):
    await state.update_data(prefix=msg.text)
    await msg.answer("Masukkan durasi aktif (dalam menit):")
    await RegisterUserbot.waiting_duration.set()

@dp.message_handler(state=RegisterUserbot.waiting_duration)
async def get_duration(msg: types.Message, state: FSMContext):
    await state.update_data(duration=int(msg.text))
    await msg.answer("Kirimkan session string dari userbot:")
    await RegisterUserbot.waiting_session.set()

@dp.message_handler(state=RegisterUserbot.waiting_session)
async def get_session(msg: types.Message, state: FSMContext):
    data = await state.get_data()
    add_userbot(
        name=data['name'],
        prefix=data['prefix'],
        session_string=msg.text,
        duration_minutes=data['duration']
    )
    await msg.answer("Userbot berhasil diregistrasi!")
    await state.finish()

@dp.callback_query_handler(lambda c: c.data == "list")
async def list_userbots(callback: types.CallbackQuery):
    userbots = get_all_userbots()
    if not userbots:
        await callback.message.answer("Belum ada userbot.")
        return

    for ub in userbots:
        text = f"**ID:** {ub[0]}\n**Name:** {ub[1]}\n**Prefix:** {ub[2]}\n**Status:** {ub[5]}"
        keyboard = InlineKeyboardMarkup()
        keyboard.add(
            InlineKeyboardButton("Aktifkan", callback_data=f"start_{ub[0]}"),
            InlineKeyboardButton("Nonaktifkan", callback_data=f"stop_{ub[0]}"),
            InlineKeyboardButton("Restart", callback_data=f"restart_{ub[0]}")
        )
        await callback.message.answer(text, reply_markup=keyboard, parse_mode="Markdown")

@dp.callback_query_handler(lambda c: c.data.startswith(("start_", "stop_", "restart_")))
async def control_userbot(callback: types.CallbackQuery):
    action, uid = callback.data.split("_")
    uid = int(uid)

    if action == "start":
        await callback.message.answer("Mengaktifkan userbot...")
        start_userbot(uid)
        update_status(uid, "active")
    elif action == "stop":
        await callback.message.answer("Menonaktifkan userbot...")
        stop_userbot(uid)
        update_status(uid, "inactive")
    elif action == "restart":
        await callback.message.answer("Merestart userbot...")
        stop_userbot(uid)
        await asyncio.sleep(1)
        start_userbot(uid)

# Cek userbot yang kadaluarsa setiap 1 menit
async def check_expired_userbots():
    while True:
        expired = get_expired_userbots()
        for ub in expired:
            stop_userbot(ub[0])
            update_status(ub[0], "inactive")
            print(f"[INFO] Userbot {ub[1]} dimatikan otomatis (expired)")
        await asyncio.sleep(60)

async def on_startup(_):
    asyncio.create_task(check_expired_userbots())

if __name__ == "__main__":
    executor.start_polling(dp, on_startup=on_startup)
