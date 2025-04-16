import multiprocessing
import os
import json
from db import get_userbot

processes = {}

def start_userbot(bot_id):
    userbot = get_userbot(bot_id)
    if not userbot:
        print(f"[ERROR] Userbot ID {bot_id} tidak ditemukan.")
        return

    name = userbot[1]
    prefix = userbot[2]
    session_string = userbot[3]

    def run():
        os.environ["BOT_ID"] = str(bot_id)
        os.environ["SESSION_STRING"] = session_string
        os.environ["PREFIX"] = prefix
        from userbots.template import start_userbot_main
        start_userbot_main()

    if bot_id in processes:
        print(f"[INFO] Userbot {name} sudah aktif.")
        return

    p = multiprocessing.Process(target=run)
    p.start()
    processes[bot_id] = p
    print(f"[STARTED] Userbot {name} aktif.")

def stop_userbot(bot_id):
    if bot_id in processes:
        processes[bot_id].terminate()
        processes[bot_id].join()
        del processes[bot_id]
        print(f"[STOPPED] Userbot ID {bot_id} dimatikan.")
    else:
        print(f"[INFO] Userbot ID {bot_id} belum aktif.")
