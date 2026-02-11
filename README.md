# 📻 ReMorphIt Extension

ReMorphIt est une extension Chrome premium qui transforme le web en contenu prêt à l'emploi.

## Fonctionnalités
- **Scan intelligent** : Extraction automatique de contenu (Articles, LinkedIn, Twitter/X, YouTube).
- **Templates personnalisés** : Créez vos propres instructions IA pour transformer le contenu.
- **Support Multilingue** : Interface disponible en Français et Anglais.
- **Mode PRO** : Accès illimité et templates premium via abonnement Stripe.

## Installation (Développement)
1. Clonez le dépôt.
2. `npm install`
3. `npm run build`
4. Allez sur `chrome://extensions/`.
5. Activez le "Mode développeur".
6. Cliquez sur "Charger l'extension décompressée" et sélectionnez le dossier `dist`.

## Technologies
- React 19
- TypeScript
- Vite + CRXJS
- TailwindCSS 4
- Supabase (Auth & Database)
- Stripe (Paiements)
