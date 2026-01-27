import type { Context } from "hono";
import { html } from "hono/html";
import css from "../style.css?inline";

const translations = {
	en: {
		title: "MesPrefs",
		tagline: "A tiny API born from a kid's request:",
		quote: '"Dad, add this song to my favorites!"',
		cta: "Fork it & make it yours",
		storyTitle: "The Story",
		storyText: `Picture this: you're vibing to music at home on Spotify, and your kid suddenly shouts <em>"I LOVE this song! Add it to my playlist!"</em> — every. single. time. So instead of grabbing a phone, unlocking it, opening Spotify, searching, adding... we now just <span class="text-green-600 font-semibold">press a button</span>. ✨`,
		step1Title: "Listen",
		step1Text: "Just enjoy your music like you always do (Spotify)",
		step2Title: "Press",
		step2Text: "Hit the magic button on the remote",
		step3Title: "Done!",
		step3Text: "Song saved",
		featuresTitle: "What it does",
		feature1: "Add the current track to your favorites playlist",
		feature2: "Remove it if you changed your mind (no judgment here)",
		feature3: "Endpoint to list your playlists (for debugging)",
		feature4: `Works great with <a href="https://www.home-assistant.io/" target="_blank" class="text-green-600 font-semibold hover:underline">Home Assistant</a>, smart buttons, or anything that can make HTTP calls`,
		madeWith: "Made with 💚 by",
		viewOnGithub: "View on GitHub",
		runsOn: "Runs on",
	},
	fr: {
		title: "MesPrefs",
		tagline: "Une petite API née d'une demande de mon fils:",
		quote: '"Papa, ajoute cette chanson à mes préférées!"',
		cta: "Voir sur GitHub",
		storyTitle: "L'histoire",
		storyText: `Imaginez: vous écoutez de la musique à la maison sur Spotify, et votre enfant s'écrie <em>"J'ADORE cette chanson! Ajoute-la à ma playlist!"</em> — à. chaque. fois. Alors au lieu de prendre le téléphone, le déverrouiller, ouvrir Spotify, chercher, ajouter... maintenant on <span class="text-green-600 font-semibold">appuie sur un bouton</span>. ✨`,
		step1Title: "Écoutez",
		step1Text: "Profitez de votre musique comme d'habitude (Spotify)",
		step2Title: "Appuyez",
		step2Text: "Appuyez sur le bouton magique de la télécommande",
		step3Title: "C'est fait!",
		step3Text: "Chanson sauvegardée",
		featuresTitle: "Fonctionnalités",
		feature1: "Ajouter la chanson en cours à votre playlist de favoris",
		feature2: "La retirer si vous avez changé d'avis (sans jugement)",
		feature3: "Endpoint pour lister vos playlists (pour débogage)",
		feature4: `Fonctionne parfaitement avec <a href="https://www.home-assistant.io/" target="_blank" class="text-green-600 font-semibold hover:underline">Home Assistant</a>, des boutons connectés, ou tout ce qui peut faire des appels HTTP`,
		madeWith: "Fait avec 💚 par",
		viewOnGithub: "Voir sur GitHub",
		runsOn: "Roule sur",
	},
};

export async function landingHandler(ctx: Context<{ Bindings: Env }>) {
	const queryLang = ctx.req.query("lang");
	const hasExplicitLang = queryLang === "fr" || queryLang === "en";
	const lang = queryLang === "fr" ? "fr" : "en";
	const t = translations[lang];
	const otherLang = lang === "en" ? "fr" : "en";
	const otherLangLabel = lang === "en" ? "FR" : "EN";

	const page = html`
    <!DOCTYPE html>
    <html lang="${lang}">
      <head>
        <script>
          (function() {
            const hasExplicitLang = ${hasExplicitLang};
            const currentLang = '${lang}';

            if (hasExplicitLang) {
              localStorage.setItem('mesprefs-lang', currentLang);
            } else {
              const saved = localStorage.getItem('mesprefs-lang');
              if (saved && (saved === 'fr' || saved === 'en') && saved !== currentLang) {
                window.location.replace('?lang=' + saved);
                return;
              }
              if (!saved) {
                const browserLang = navigator.language.toLowerCase();
                const detectedLang = browserLang.startsWith('fr') ? 'fr' : 'en';
                if (detectedLang !== currentLang) {
                  window.location.replace('?lang=' + detectedLang);
                  return;
                }
              }
            }
          })();
        </script>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>${t.title}</title>
        <style>${html(css)}</style>
      </head>
      <body class="gradient-bg min-h-screen">
        <!-- Top nav -->
        <nav class="flex justify-end gap-2 p-4 md:p-6">
          <a
            href="?lang=${otherLang}"
            class="flex items-center gap-2 bg-teal-950/5 hover:bg-teal-950/10 border border-black/10 rounded-full px-4 py-2 transition-all font-semibold"
          >
            ${otherLangLabel}
          </a>
          <a
            href="https://github.com/francoiscote/mesprefs"
            class="flex items-center gap-2 bg-teal-950/5 hover:bg-teal-950/10 border border-black/10 rounded-full px-4 py-2 transition-all"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span class="font-semibold">GitHub</span>
          </a>
        </nav>

        <div class="container mx-auto px-4 pb-16 max-w-4xl">
          <!-- Hero -->
          <div class="text-center mb-16">
            <div class="text-8xl mb-6 float">💚</div>
            <h1 class="text-5xl md:text-7xl font-black mb-4">
              Mes<span class="text-green-600">Prefs</span>
            </h1>
            <p class="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-8">
              ${t.tagline}<br />
              <span class="text-green-600 font-semibold italic">${t.quote}</span>
            </p>
            <a
              href="https://github.com/francoiscote/mesprefs"
              class="inline-flex items-center gap-3 bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-4 rounded-full text-lg transition-all hover:scale-105"
            >
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              ${t.cta}
            </a>
          </div>

          <!-- Story -->
          <div
            class="bg-teal-950/5 backdrop-blur-sm rounded-3xl p-8 mb-12 border border-2 border-black/10"
          >
            <h2 class="text-2xl font-semibold mb-4 flex items-center gap-3">
              <span>📖</span> ${t.storyTitle}
            </h2>
            <p class="text-lg text-slate-600 leading-relaxed">
              ${html(t.storyText)}
            </p>
          </div>

          <!-- How it works -->
          <div class="grid md:grid-cols-3 gap-6 mb-12">
            <div
              class="bg-teal-950/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-2 border-black/10"
            >
              <div class="text-5xl mb-4">🎶</div>
              <h3 class="font-semibold text-xl mb-2">${t.step1Title}</h3>
              <p class="text-slate-600">${t.step1Text}</p>
            </div>
            <div
              class="bg-teal-950/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-2 border-black/10"
            >
              <div class="text-5xl mb-4">👇🏻</div>
              <h3 class="font-semibold text-xl mb-2">${t.step2Title}</h3>
              <p class="text-slate-600">${t.step2Text}</p>
            </div>
            <div
              class="bg-teal-950/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-2 border-black/10"
            >
              <div class="text-5xl mb-4">🎉</div>
              <h3 class="font-semibold text-xl mb-2">${t.step3Title}</h3>
              <p class="text-slate-600">${t.step3Text}</p>
            </div>
          </div>

          <!-- Features -->
          <div
            class="bg-teal-950/5 backdrop-blur-sm rounded-3xl p-8 mb-12 border border-2 border-black/10"
          >
            <h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
              <span>⚡</span> ${t.featuresTitle}
            </h2>
            <ul class="space-y-4 text-lg">
              <li class="flex items-start gap-3">
                <span class="text-green-600 text-2xl">✅</span>
                <span>${t.feature1}</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-red-600 text-2xl">❌</span>
                <span>${t.feature2}</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-600 text-2xl">👀</span>
                <span>${t.feature3}</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-yellow-600 text-2xl">🏠</span>
                <span>${html(t.feature4)}</span>
              </li>
            </ul>
          </div>

          <!-- Footer -->
          <div class="text-center text-slate-600">
            <p class="mb-2">
              ${t.madeWith}
              <a
                href="https://www.francoiscote.net"
                class="text-green-600 hover:underline"
                >François Côté</a
              >
            </p>
            <p class="text-sm mb-2">
              <a
                href="https://github.com/francoiscote/mesprefs"
                class="text-green-600 hover:underline"
                >${t.viewOnGithub}</a
              >
            </p>
            <p class="text-sm">
              ${t.runsOn}
              <a
                href="https://workers.cloudflare.com"
                class="text-green-600 hover:underline"
                >Cloudflare Workers</a
              > ・Featuring <a class="text-green-600 hover:underline" href="https://www.pangrampangram.com/products/frama">PP Frama</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

	return ctx.html(page);
}
