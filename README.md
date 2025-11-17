# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/597b121d-3df9-4eaf-8b2e-4334969835c9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/597b121d-3df9-4eaf-8b2e-4334969835c9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Deploy to Vercel (recommended)

Front-end is a static Vite app; deploy is trivial.

1) Create a new Vercel project, import this repo.
2) Build settings:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install` (default)
3) Environment Variables (Project → Settings → Environment Variables):
- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your Supabase anon/public key
4) Save and Deploy.

Client-side routing is handled by `vercel.json` rewrites so deep links work.

CLI alternative:

```bash
npm install -g vercel
vercel login
vercel link   # link local folder to a Vercel project
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel        # preview deploy
vercel --prod # production deploy
```

Ensure your Supabase CORS settings allow your Vercel domain if you have restrictions.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
