import os
import time
from pyrogram import Client, filters
from pyrogram.types import Message
from db import update_userbot_prefix

API_ID = 11883019     # Ganti dengan API ID kamu
API_HASH = "1043679f63f946cabb601ef0683f67b6"  # Ganti juga

def start_userbot_main():
    session_str = os.getenv("SESSION_STRING")
    prefix = os.getenv("PREFIX", ".")

    app = Client(
        name="userbot",
        api_id=API_ID,
        api_hash=API_HASH,
        session_string=session_str,
        in_memory=True
    )

    @app.on_message(filters.command("ping", prefixes=prefix) & filters.me)
    async def ping_handler(client: Client, message: Message):
        start = time.time()
        msg = await message.reply("Pong...")
        end = time.time()
        await msg.edit_text(f"🏓 Pong! `{round((end-start)*1000)}ms`")

    @app.on_message(filters.command("help", prefixes=prefix) & filters.me)
    async def help_handler(client: Client, message: Message):
        await message.reply_text(
            f"**Userbot Aktif!**\n\n"
            f"Prefix: `{prefix}`\n"
            f"Perintah:\n"
            f"- `{prefix}ping` → Cek respons\n"
            f"- `{prefix}help` → Tampilkan menu ini"
        )

    @app.on_message(filters.command("setprefix", prefixes=prefix) & filters.me)
    async def setprefix_handler(client: Client, message: Message):
        args = message.text.split()
        if len(args) != 2:
            return await message.reply("Penggunaan: `.setprefix [prefix_baru]`")

        new_prefix = args[1]

        bot_id = int(os.getenv("BOT_ID"))  # Ambil ID userbot dari env
        update_userbot_prefix(bot_id, new_prefix)
        await message.reply(f"Prefix berhasil diubah menjadi `{new_prefix}`. Restarting...")
        
        # Restart userbot
        import sys
        os.execv(sys.executable, ['python'] + sys.argv)

    print(f"[USERBOT] Aktif dengan prefix '{prefix}'")
    app.run()
