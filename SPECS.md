# Spécifications du Projet : ReMixIt Extension

## 1. Vision
Une extension de navigateur (Chrome/Brave/Edge) qui agit comme un pont intelligent entre le contenu web consommé par l'utilisateur et ses workflows d'automatisation (n8n). L'objectif est de transformer, résumer ou reformater n'importe quel contenu web à la volée.

## 2. Architecture Technique
Nous utiliserons une architecture "Client lourd / Backend délégué" :
*   **Frontend (Extension)** : Gère l'interface, la capture du contenu (scraping) et la gestion des templates (prompts).
*   **Backend (n8n)** : Reçoit la donnée brute et les instructions, exécute l'IA (OpenAI/Anthropic...), et retourne le résultat formaté.

### Pourquoi ce choix ?
*   **Flexibilité totale** : Les prompts sont envoyés depuis l'extension. Le workflow n8n peut être un simple "Passe-plat" vers un LLM, ce qui rend l'extension agnostique au workflow.
*   **Simplicité de maintenance** : Pas besoin de mettre à jour l'extension pour changer de modèle IA ou de logique backend.

## 3. Parcours Utilisateur (UX)

### A. Configuration (Premier lancement)
1.  L'utilisateur ouvre les options de l'extension.
2.  Il saisit l'URL de son **Webhook n8n** (POST).
3.  Il définit ses **Templates** (stockés localement dans le navigateur).
    *   *Exemple d'interface de gestion de templates :*
        *   Nom : `Thread Twitter`
        *   Instruction (Prompt) : `Transforme ce texte en un thread de 5 tweets engageants...`
        *   Longueur approx : `Court`

### B. Utilisation Quotidienne (Option Clic-droit)
1.  L'utilisateur est sur une page (ex: un article de blog).
2.  Il sélectionne du texte (optionnel).
3.  Fait un **Clic-droit** > "ReMixIt" > Sélectionne un template (ex: "Thread Twitter").
4.  Une **Side Panel** (panneau latéral Chrome) s'ouvre.
    *   *État 1* : "Analyse en cours..." (L'extension extrait le contenu de la page pour compléter la sélection).
    *   *État 2* : "Traitement..." (Envoi au webhook n8n).
    *   *État 3* : Affichage du résultat retourné par n8n.
5.  L'utilisateur peut copier le résultat ou le modifier.

## 4. Structure des Données (Payload Webhook)

Voici le JSON que l'extension enverra à n8n :

```json
{
  "page_url": "https://...",
  "page_title": "Titre de la page",
  "selected_text": "Le texte spécifique sélectionné par l'utilisateur...",
  "full_page_content": "Le contenu nettoyé de la tout page (via Readability)...",
  "template_config": {
    "name": "Thread Twitter",
    "prompt": "Rédige un thread...",
    "length": "short"
  }
}
```

## 5. Stack Technique Extension
*   **Core** : React + TypeScript
*   **Build** : Vite + CRXJS (pour une expérience de dev fluide)
*   **UI** : TailwindCSS + Shadcn/UI (pour un look moderne et "premium")
*   **Scraping** : `@mozilla/readability` (pour extraire le contenu propre d'une page HTML)
*   **Stockage** : `chrome.storage.sync` (pour sauvegarder les templates et l'URL du webhook)

---

## 6. Prochaines étapes
1.  Initialiser le projet Vite/React.
2.  Configurer le manifest (Permissions: `contextMenus`, `sidePanel`, `activeTab`, `scripting`).
3.  Créer l'interface de configuration des templates.
