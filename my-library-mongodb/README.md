# My Library — Personal Book Collection

A personal library website with MongoDB database. Add your favourite books and download them.

---

## Requirements

- **Node.js** (v18+) — https://nodejs.org
- **MongoDB** — either local install or free MongoDB Atlas cloud

---

## Step 1: Set Up MongoDB Atlas (Free Cloud Database)

1. Go to https://www.mongodb.com/atlas and create a free account
2. Click **"Build a Database"** → choose **FREE** (M0 Sandbox)
3. Pick any region close to you → click **Create**
4. Create a database user:
   - Username: choose anything (e.g. `admin`)
   - Password: choose a strong password
   - Click **Create User**
5. In **Network Access** → click **Add IP Address** → **Allow Access from Anywhere** → Confirm
6. Go back to **Database** → click **Connect** → **Drivers**
7. Copy the connection string — it looks like:
   ```
   mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/mylibrary
   ```
   Replace `yourpassword` with the password you created.

---

## Step 2: Install and Run Locally

Open Terminal in this folder:

```
npm install
```

Then run with your MongoDB connection string:

**Windows (PowerShell):**
```
$env:MONGODB_URI="mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/mylibrary"; node dist/index.cjs
```

**Windows (Command Prompt):**
```
set MONGODB_URI=mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/mylibrary
node dist/index.cjs
```

**Mac / Linux:**
```
MONGODB_URI="mongodb+srv://admin:yourpassword@cluster0.xxxxx.mongodb.net/mylibrary" node dist/index.cjs
```

Open http://localhost:5000 in your browser.

---

## How to Use

- Click **"+ Add Book"** and use the password from your `ADMIN_PASSWORD` environment variable.
- Fill in title, author, category, and upload your book file
- Search, filter by category, and download books
- Dark/light mode toggle in the top right

---

## Your Data is Permanent

Since MongoDB Atlas stores your data in the cloud, your books are saved permanently — even if you restart the server or use a different computer.

---

## Change the Password

Edit `server/routes.ts`, find:
```
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.LIBRARY_ADMIN_PASSWORD || "";
```
Change it, then rebuild:
```
npm run build
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MongoDB connection error` | Check your MONGODB_URI is correct and your IP is whitelisted in Atlas |
| `node is not recognized` | Install Node.js from https://nodejs.org |
| `Cannot find module` | Run `npm install` first |
