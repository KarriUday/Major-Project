# Send real email to Gmail / BMSIT inbox

The project website **does not** deliver mail by itself. After you connect Gmail SMTP, messages go to the student's **real Gmail inbox** (e.g. `1by23cs098@bmsit.in`).

## One-time setup (5 minutes)

### 1. Start the app

Double-click **`START_APP.bat`** → open **http://localhost:3001/**

### 2. Create a Gmail App Password

Use the **teacher/sender** Google account (your `@gmail.com` or `@bmsit.in`):

1. Turn on **2-Step Verification**: https://myaccount.google.com/security  
2. Create **App Password**: https://myaccount.google.com/apppasswords  
   - App: **Mail**  
   - Device: **Windows Computer**  
3. Copy the **16-character password** (like `abcd efgh ijkl mnop`)

Use the App Password — **not** your normal Gmail login password.

### 3. Connect in the app

1. Role → **Faculty** or **Admin**  
2. **Mail Center**  
3. **Connect Gmail (real delivery)**  
   - **Teacher Gmail:** your sender address  
   - **App Password:** paste the 16-character code  
4. Click **Connect Gmail**  
5. Click **Test → 1by23cs098@bmsit.in**  
6. Open Gmail for `1by23cs098@bmsit.in` — check **Inbox** and **Spam**

### 4. Send to students

- Recipients: **Uday K · 1by23cs098@bmsit.in only** (or all students)  
- **Send email now** → mail arrives in their Gmail inbox

## Troubleshooting

| Problem | Fix |
|--------|-----|
| "Username and Password not accepted" | Use App Password, enable 2FA |
| Mail not in inbox | Check Spam / Promotions |
| BMSIT blocks external mail | Use a `@bmsit.in` sender account with App Password |
| Mail: setup Gmail (amber) | Complete Connect Gmail in Mail Center |

Credentials are stored locally in `server/.env` only on your PC.
