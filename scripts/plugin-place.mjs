// plugin-place.mjs : où vit le plugin, et ce que ça change pour une mise à jour.
//
// Une mise à jour écarte le dossier installé en sauvegarde, puis met la nouvelle version à
// sa place. Cette sauvegarde ne dure que si le dossier est rangé dans un registre connu :
// un dossier de marketplace, `.../plugins/marketplaces/<marketplace>/<nom du plugin>`.
//
// Claude Desktop 4.29 (Microsoft Store) range ce qu'on lui téléverse dans un registre à lui
// (`...\rpm\<compte>\<organisation>\plugin_<id>`), et le range tout seul quelques minutes
// après une mise à jour : tout dossier qu'il ne connaît pas est supprimé, la sauvegarde
// comprise. Son écran Plugins montre aussi la version du téléversement, jamais celle du
// disque. Donc, hors d'un dossier de marketplace, une mise à jour ne promet pas de
// sauvegarde, et sous Desktop elle dit quelle version tourne vraiment.
//
// Aucune entrée-sortie : seuls le chemin et le nom du plugin sont lus. Même règle que le
// plugin Hypervibe (son `scripts/plugin-place.mjs`, relevé au banc des 28-29/10/2026).

import path from "node:path";

/**
 * @param {string} racinePlugin  le dossier du plugin
 * @param {string} nom           son nom, celui de .claude-plugin/plugin.json
 * @returns {{place: "marketplace"|"desktop"|"hors_marketplace", backupKept: boolean, desktop: boolean}}
 */
export function placeDuPlugin(racinePlugin, nom) {
  const racine = path.resolve(String(racinePlugin || ""));
  const marketplace = path.dirname(racine);
  if (path.basename(path.dirname(marketplace)) === "marketplaces" && path.basename(racine) === nom) {
    return { place: "marketplace", backupKept: true, desktop: false };
  }
  const segments = racine.split(/[\\/]+/).map((s) => s.toLowerCase());
  const desktop = segments.includes("rpm") && /^plugin_[a-z0-9]+$/i.test(path.basename(racine));
  return { place: desktop ? "desktop" : "hors_marketplace", backupKept: false, desktop };
}
