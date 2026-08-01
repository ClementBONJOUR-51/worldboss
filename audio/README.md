# WorldBoss Audio Catalog

Ce dossier reference tous les sons que le jeu sait declencher, meme si les fichiers reels ne sont pas encore presents.

## Structure attendue

- `audio/ui/` : boutons, modales, validation, navigation.
- `audio/social/` : chat, emotes, petits retours non critiques.
- `audio/combat/` : tirs, impacts, QTE, attaques du boss, blessures.
- `audio/ambient/` : nappes d ambiance carte / arene.
- `audio/music/` : victoire, defaite, themes plus longs.

## Regles de lecture

- Plusieurs sons peuvent jouer en meme temps.
- Chaque son a sa propre limite de concurrence (`maxConcurrent`) pour eviter la saturation.
- Les assets absents sont acceptes: le jeu continue sans crash et le gestionnaire ignore proprement l echec.
- L audio doit etre debloque par une interaction utilisateur au moins une fois par session de page.

## Liste des sons pris en compte

| Cle logique | Fichier attendu | Evenement couvert | Superposition |
| --- | --- | --- | --- |
| `uiToggleOn` | `audio/ui/audio-toggle-on.mp3` | activation de l audio | non |
| `uiToggleOff` | `audio/ui/audio-toggle-off.mp3` | coupure de l audio | non |
| `modalOpen` | `audio/ui/modal-open.mp3` | ouverture modal pseudo / parametres | faible |
| `modalClose` | `audio/ui/modal-close.mp3` | fermeture modal pseudo / parametres | faible |
| `nicknameSaved` | `audio/ui/nickname-saved.mp3` | validation pseudo | non |
| `enterArena` | `audio/ui/enter-arena.mp3` | entree en arene | non |
| `returnMap` | `audio/ui/return-map.mp3` | retour carte / redeploiement | non |
| `endCountdown` | `audio/ui/end-countdown.mp3` | retour automatique de fin de partie | non |
| `bossClickFire` | `audio/combat/boss-click-fire.mp3` | clic joueur sur le boss | oui |
| `bossClickImpact` | `audio/combat/boss-click-impact.mp3` | clic valide / degat applique | oui |
| `noAmmo` | `audio/combat/no-ammo.mp3` | tentative sans munitions | non |
| `qteReady` | `audio/combat/qte-ready.mp3` | apparition d un QTE | non |
| `qteTap` | `audio/combat/qte-tap.mp3` | clic local sur un QTE | faible |
| `qteSuccess` | `audio/combat/qte-success.mp3` | reussite QTE | oui |
| `qteFail` | `audio/combat/qte-fail.mp3` | echec QTE / refus | oui |
| `artilleryIncoming` | `audio/combat/artillery-incoming.mp3` | chute d une bombe de batterie de siege | oui |
| `artilleryImpact` | `audio/combat/artillery-impact.mp3` | impact d une bombe de batterie de siege | oui |
| `structureBuild` | `audio/combat/structure-build.mp3` | clic de construction / amelioration structure | faible |
| `bossWarningLight` | `audio/combat/boss-warning-light.mp3` | alerte attaque boss legere | non |
| `bossWarningUltimate` | `audio/combat/boss-warning-ultimate.mp3` | alerte attaque boss ultime | non |
| `bossImpactLight` | `audio/combat/boss-impact-light.mp3` | resolution attaque boss legere | oui |
| `bossImpactUltimate` | `audio/combat/boss-impact-ultimate.mp3` | resolution attaque boss ultime | oui |
| `playerInjured` | `audio/combat/player-injured.mp3` | joueur local blesse / hors combat | faible |
| `playerRecovered` | `audio/combat/player-recovered.mp3` | fin de blessure / retour des soins | non |
| `bossDeath` | `audio/combat/boss-death.mp3` | mort du boss | non |
| `emoteSelect` | `audio/social/emote-select.mp3` | choix d emote | oui |
| `chatSend` | `audio/social/chat-send.mp3` | envoi de chat | oui |
| `chatReceive` | `audio/social/chat-receive.mp3` | reception d un chat d un autre joueur | oui |
| `matchVictory` | `audio/music/match-victory.mp3` | fin de partie victoire | non |
| `matchDefeat` | `audio/music/match-defeat.mp3` | fin de partie defaite | non |
| `mapAmbient` | `audio/ambient/map-ambient.mp3` | ambiance carte | non |
| `arenaAmbient` | `audio/ambient/arena-ambient.mp3` | ambiance arene | non |

## Evenements deja relies au code

- Toggle audio global.
- Ouverture / fermeture de la modal pseudo et sauvegarde du pseudo.
- Entree en arene et redeploiement vers la carte.
- Clic boss, degat valide, no ammo.
- Apparition / clic / resultat des QTE.
- Construction structure.
- Salves d artillerie avec superposition des tirs et impacts.
- Alerte et impact des attaques du boss, avec variante light / ultimate.
- Blessure locale et retour a l etat normal.
- Emotes et chat.
- Mort du boss et fin de partie victoire / defaite.

## Ajout d un nouvel asset

1. Deposer le fichier au bon emplacement dans `public/audio/...`.
2. Reutiliser la cle logique deja declaree dans `src/config/audioConfig.js`.
3. Ajuster `volume`, `category`, `maxConcurrent` ou `cooldownMs` si besoin.