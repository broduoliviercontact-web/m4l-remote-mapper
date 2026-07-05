# Format d'import MidiSniffRemote

## Objectif

Ce document définit le format d'échange minimal entre `MidiSniffRemote` et M4L Remote Mapper. La version `0.1.0` transporte une liste dédupliquée de contrôles MIDI détectés. Elle ne décrit ni les cibles Ableton/Max for Live, ni les options d'export.

Le fichier est un document JSON UTF-8 contenant un seul objet racine.

## Exemple

```json
{
  "version": "0.1.0",
  "source": "MidiSniffRemote",
  "deviceName": "Unknown MIDI Device",
  "capturedAt": "2026-07-05T13:45:00.000Z",
  "controls": [
    {
      "id": "cc_ch1_74",
      "type": "cc",
      "channel": 1,
      "number": 74,
      "min": 0,
      "max": 127,
      "lastValue": 96,
      "suggestedKind": "knob_or_fader",
      "label": "CC 74"
    },
    {
      "id": "note_ch1_36",
      "type": "note",
      "channel": 1,
      "number": 36,
      "min": 0,
      "max": 127,
      "lastValue": 127,
      "suggestedKind": "button_or_pad",
      "label": "Note 36"
    }
  ]
}
```

## Contrat des champs

### Objet racine

| Champ | Type | Règle |
| --- | --- | --- |
| `version` | chaîne | Version sémantique du format. La première version est exactement `0.1.0`. |
| `source` | chaîne | Producteur du fichier. Doit valoir `MidiSniffRemote` pour ce format. |
| `deviceName` | chaîne | Nom lisible du port ou du contrôleur. Utiliser `Unknown MIDI Device` si le nom n'est pas disponible. |
| `capturedAt` | chaîne | Date de génération au format ISO 8601 UTC, par exemple `2026-07-05T13:45:00.000Z`. |
| `controls` | tableau | Liste des contrôles détectés, dédupliquée par `id`. Le tableau peut être vide. |

### Contrôle

| Champ | Type | Règle |
| --- | --- | --- |
| `id` | chaîne | Identifiant stable et unique dans le fichier. Format recommandé : `<type>_ch<channel>_<number>`, par exemple `cc_ch1_74`. |
| `type` | chaîne | Type MIDI normalisé. Valeurs acceptées en `0.1.0` : `cc` ou `note`. Note On et Note Off d'une même note produisent un seul contrôle `note`. |
| `channel` | entier | Canal MIDI affiché à l'utilisateur, de 1 à 16 inclus. |
| `number` | entier | Numéro de CC ou de note, de 0 à 127 inclus. |
| `min` | entier | Valeur MIDI minimale attendue, de 0 à 127. Pour le MVP, utiliser `0`. |
| `max` | entier | Valeur MIDI maximale attendue, de 0 à 127 et supérieure ou égale à `min`. Pour le MVP, utiliser `127`. |
| `lastValue` | entier | Dernière valeur ou vélocité reçue, comprise entre `min` et `max`. |
| `suggestedKind` | chaîne | Indication non contraignante pour l'interface : `knob_or_fader` ou `button_or_pad`. L'utilisateur doit pouvoir la corriger. |
| `label` | chaîne | Nom initial lisible et modifiable, par exemple `CC 74` ou `Note 36`. |

Un importeur futur devra au minimum vérifier la version, les champs obligatoires, les bornes numériques et l'unicité des `id`. Un fichier invalide devra produire une erreur lisible sans modifier la Mapping Matrix existante.

## Mapping vers la Mapping Matrix existante

L'import ne devra pas créer immédiatement une cible ou une route Ableton arbitraire. Chaque entrée de `controls` deviendra d'abord une source MIDI disponible, puis pourra pré-remplir une ligne de la Mapping Matrix. Les cibles et options finales resteront choisies par l'utilisateur.

| Import MidiSniffRemote | Modèle de la Mapping Matrix |
| --- | --- |
| `id` | Identifiant de la source MIDI et clé de déduplication. |
| `type: "cc"` | `messageType: "CONTROLCHANGE"`. |
| `type: "note"` | Source Note à prendre en charge par le futur adaptateur d'import ; le modèle actuel est principalement centré sur les CC. |
| `channel` | `userChannel` inchangé et `frameworkChannel = channel - 1`. |
| `number` | `data1`, c'est-à-dire le numéro de CC ou de note. |
| `lastValue` | Valeur initiale utilisée pour l'aperçu du contrôle. |
| `min` / `max` | Métadonnées de plage ; elles ne remplacent pas les règles de scaling de la route. |
| `suggestedKind` | Proposition initiale de `controlType` : `continuous` pour `knob_or_fader`, `button` pour `button_or_pad`. |
| `label` | Libellé initial de la source ou `userLabel`, toujours modifiable. |

Une ligne pré-remplie conservera donc l'identité MIDI importée, mais restera incomplète tant que l'utilisateur n'aura pas choisi sa cible, son mode de bouton éventuel et ses autres options de mapping. Cette séparation protège le générateur ZIP/Python existant.

## Limites MVP

- Pas encore d'import dans l'interface.
- Pas encore de lecture directe du fichier par M4L Remote Mapper.
- Pas encore d'auto-détection parfaite entre knob, fader, bouton et pad.
- Pas encore de prise en charge avancée des messages SysEx.
- Le format `0.1.0` couvre uniquement les CC et les Notes ; les autres familles MIDI restent hors scope.

## Prochain sprint possible

- Ajouter un bouton **Import JSON**.
- Parser et valider ce format sans muter l'état en cas d'erreur.
- Pré-remplir les sources et les lignes de la Mapping Matrix.
- Laisser l'utilisateur renommer les contrôles et corriger leur type suggéré.
- Préserver sans modification le pipeline d'export ZIP/Python.
