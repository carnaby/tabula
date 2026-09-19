# Tabula — Externá pamäť pre AI agentov

**Tabula** je zdieľaná, externá pamäť pre AI agentov, dostupná cez MCP protokol. Rieši jeden problém: agent v novej session nevie, čo sa rozhodlo v predchádzajúcich sessions ani v iných projektoch. Tabula tie znalosti vytiahne mimo repozitár a dá ti nad nimi jedno UI, kde ako kurátor záznamov upravuješ ich popis a kontroluješ kvalitu.

Do Tabuly idú rozhodnutia, pravidlá a gotchas — nie priebeh práce. **Kritické pravidlo: do Tabuly nikdy nejdú heslá, kľúče ani tokeny.**

## Lokálny vývoj

### Príprava prostredia

```bash
pnpm install
```

Spusti dev PostgreSQL (vyžaduje Docker). Kontajner `tabula-dev-db` s volume `tabula-dev-pg` na porte 5432, dáta prežijú reštart; príkaz ho pri ďalšom spustení len naštartuje:

```bash
pnpm db:dev
```

Vytvor `.env` zo šablóny `.env.example`:

```bash
cp .env.example .env
```

Uprav `.env` s real hodnotami (aspoň `TABULA_TOKEN` a `DATABASE_URL`).

### Spustenie aplikácie

Backend (MCP server + REST API, port 3000 podľa `PORT`):

```bash
pnpm dev
```

Frontend (Vite dev server, port 5173; `/api` proxyuje na `TABULA_API`, default `http://localhost:3000`):

```bash
pnpm dev:web
# ak backend beží na inom porte (napr. PORT=3100 v .env):
TABULA_API=http://localhost:3100 pnpm dev:web
```

Ak `/api` v prehliadači vracia `502 Bad Gateway`, backend nebeží — pozri výstup `pnpm dev` (najčastejšie nebeží DB z `pnpm db:dev`).

Otvor [http://localhost:5173](http://localhost:5173) v prehliadači a zadaj bearer token (`TABULA_TOKEN` z `.env`).

### Testovanie a kontrola typov

```bash
pnpm test       # Vitest (vyžaduje Docker s PostgreSQL)
pnpm typecheck  # TypeScript type checking
```

## Premenné prostredia

| Premenná | Popis | Príklad |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://tabula:change-me@localhost:5432/tabula` |
| `TABULA_TOKEN` | Bearer token pre MCP a UI (≥32 znakov) | `openssl rand -hex 32` |
| `TABULA_CONNECTOR_SECRET` | Secret pre fallback URL v claude.ai (≥32 znakov, optional) | `openssl rand -hex 32` |
| `PORT` | Port pre server (default 3000) | `3000` |
| `HOST` | Host pre binding (default 0.0.0.0) | `0.0.0.0` alebo `127.0.0.1` |
| `WEB_DIST` | Cesta k buildu web UI (default `web/dist`) | `web/dist` |
| `LOG_LEVEL` | Úroveň logovania: debug/info/warn/error (default info) | `info` |
| `POSTGRES_PASSWORD` | Heslo PostgreSQL v docker-compose | `change-me` |
| `TABULA_PORT` | Host port v docker-compose (default 3000) | `3000` |

## Deploy na NAS

### Príprava

1. Na NAS sklonuj repozitár:

```bash
git clone https://github.com/<org>/tabula.git
cd tabula
```

2. Vytvor `.env` so silnými hodnotami:

```bash
cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
TABULA_TOKEN=$(openssl rand -hex 32)
TABULA_CONNECTOR_SECRET=$(openssl rand -hex 32)
TABULA_PORT=3000
EOF
```

Ručne: vygeneruj hodnoty príkazom `openssl rand -hex 32` a vlož ich do `.env` ako `KĽÚČ=hodnota`.

3. Spusti docker-compose (build a run):

```bash
docker compose up -d --build
```

Migrácie sa spúšťajú automaticky pri štarte aplikácie.

### Reverse proxy

Nakonfiguruj reverse proxy pre `tabula.example.com` → `http://<nas>:3000`. Proxy musí:
- Preposlať hlavičku `Authorization` bez zmeny
- Nesmie bufferovať odpovede (`text/event-stream`)
- Timeout aspoň 60 sekúnd
- Mať SSL/TLS (Let's Encrypt)

Health check:

```bash
curl -fsS https://tabula.example.com/healthz
# {"ok":true}
```

## Záloha

Denný cron na NAS (odporúčané):

```bash
docker compose exec -T db pg_dump -U tabula tabula | gzip > tabula-$(date +%F).sql.gz
```

## Pripojenie Claude Code

Zaregistruj Tabulu ako MCP server v Claude Code:

```bash
claude mcp add tabula --scope user --transport http https://tabula.example.com/mcp \
  --header "Authorization: Bearer <TABULA_TOKEN>" --header "X-Tabula-Agent: claude-code"
```

Over registráciu:

```bash
claude mcp list
claude mcp get tabula
```

(Claude Code ukladá tento zápis do `~/.claude.json` pod kľúčom `"type"`, nie `"transport"` — nekontroluj ten súbor ručne, použi vyššie uvedené príkazy.)

Do `CLAUDE.md` projektu vlož [snippet zo `templates/claude-md-snippet.md`](templates/claude-md-snippet.md) s realnym slugom projektu a [SessionStart hook](templates/session-start-hook.json).

**Tip:** Ak sa konektor nepodarí pripojiť, skontroluj:
1. `https://tabula.example.com/healthz` vracia `{"ok":true}`
2. `TABULA_TOKEN` v nastavení sa zhoduje s env premennou na serveri
3. Server implementuje stateless Streamable HTTP transport s klasickým `initialize` handshakom (MCP 2025-11-25); klient, ktorý vie hovoriť len 2026-07-28, sa nebude vedieť inicializovať

## Pripojenie claude.ai

V claude.ai Settings → Connectors → Add custom connector:

### Preferovaná varianta: Custom header

1. URL: `https://tabula.example.com/mcp`
2. Request headers: `Authorization: Bearer <TABULA_TOKEN>`

(Táto varianta je beta feature administrovaná org administrátorom v claude.ai.)

### Fallback (ak header nefunguje): secret v ceste URL

1. URL: `https://tabula.example.com/mcp/<TABULA_CONNECTOR_SECRET>` (secret je súčasť cesty, nie query string)
2. Bez hlavičiek

V tejto variante sa záznamy v Tabule označujú `agent_label = claude-ai`. Secret je heslo: **kto má URL, má prístup k pamäti.** Chráň ho ako token.

## Protokol pre agenta

Tabula bez protokolu sa nepoužije — MCP tool je pasívny. Protokol musí byť v CLAUDE.md každého projektu a v project instructions claude.ai.

### Tri šablóny

1. **CLAUDE.md snippet:** [`templates/claude-md-snippet.md`](templates/claude-md-snippet.md)
   - Skopíruj do CLAUDE.md projektu
   - Uprav `<slug>` na real slug projektu

2. **claude.ai project instructions:** [`templates/claude-ai-project-instructions.md`](templates/claude-ai-project-instructions.md)
   - Skopíruj do "Doplnkové inštrukcie" v claude.ai project settings
   - Uprav `<slug>` na real slug projektu

3. **SessionStart hook (optional, ale odporúčané):** [`templates/session-start-hook.json`](templates/session-start-hook.json)
   - Pridaj do `.claude/settings.json` projektu
   - Vypiše pripomienku na začiatku session

### Projektový slug

Slug musí existovať v Tabule UI pred prvým použitím. Vytvoriť ho môže len ty (admin).

## Prvé dva týždne

Aby sa Tabula naladila, každý večer:

1. Otvor Tabulu UI
2. Prejdi nové memories (default filter: `status = active`, zoradené `created_at` DESC)
3. Čo je zjavne banálne: zmaž
4. Čo je nejasné: uprav `title` a `body`
5. Kontrola v "Recall preview": over, že digest projektu `global` je pod 1 500 tokenov

Adjust popisy toolov v `src/mcp/descriptions.ts` ak agenti zapisujú príliš mnoho (10+ records/session) — problém je zle sformulovaný popis, nie deduplikácia.

---

## Go-live checklist

Orchestrátor prejde s tebou týmito krokmi. Táto tabuľka je referenčná.

| Krok | Akcia | Kritérium |
|---|---|---|
| 1 | Klonuj repozitár na NAS, `.env` s `openssl rand -hex 32` hodnotami, `docker compose up -d --build` | Server beží |
| 2 | Reverse proxy + TLS na `tabula.example.com`; `curl -fsS https://tabula.example.com/healthz` vracia `{"ok":true}` | Health check OK |
| 3 | V UI: vytvor projekty (`omnistra`, `limen`) s jednovetovým popisom; do `global` vlož pinned note „Session protocol" (copy z `docs/memory/` ak existuje) | Projekty existujú, global digest < 1 500 tokenov |
| 4 | Pripoj Claude Code (pozri vyššie), do CLAUDE.md vlož snippet so slugom a SessionStart hook | `list_projects` vracia všetky projekty |
| 5 | Spusti reálnu session v Claude Code; agent zavolá `recall`, digest < 1 500 tokenov, na konci session uloží 0–3 záznamy | Záznamy vidíš v UI a môžeš ich editovať |
| 6 | Pripojíš claude.ai (pozri vyššie) a v konverzácii overiš, že `recall` funguje; zapíšeš si, ktorá auth varianta zabrala | `recall` pracuje, auth variant určený |
| 7 | Porovnaj odhad tokenov (`znaky / 4`) so skutočným počtom tokenov digestu; podľa potreby uprav `estimateTokens` v `src/domain/tokens.ts` | Token estimate sa zhoduje so skúškou |

**Kritérium MVP:** agent na začiatku session zavolá `recall`, digest má v Recall preview < 1 500 tokenov, na konci session uloží 0–3 záznamy a tie vidíš a upravíš v UI.
