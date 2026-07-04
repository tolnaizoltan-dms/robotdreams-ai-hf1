# Plantbase — ROI-levezetés (5 fős lakberendező iroda)

> Pénzbeli megtakarítás becslése, ha a csapat a **Plantbase** CLI agentet használja a növénycsomag-összeállításhoz.  
> Források: [`brs-plantbase.md`](./brs-plantbase.md) KPI-k, [`stack.md`](./stack.md) katalógus-séma, seed adat (`seed/plants.ts`).

---

## Összefoglaló

| Mutató                                   | Konzervatív     | Bázis             | Optimista         |
| ---------------------------------------- | --------------- | ----------------- | ----------------- |
| **Éves nettó megtakarítás**              | **~500 000 Ft** | **~1 170 000 Ft** | **~2 540 000 Ft** |
| **Megtérülés (bevezetési költség után)** | ~2 hónap        | ~4 hét            | ~2 hét            |
| **ROI (1. év, nettó / bevezetés)**       | ~525%           | ~1 360%           | ~3 075%           |

A bázis forgatókönyv szerint egy **5 fős iroda évi ~1,17 M Ft nettó megtakarítást** ér el: főleg **munkaidő** (keresgélés, méricskélés, raktár/akció ellenőrzés helyett természetes nyelvű lekérdezés) és **olcsóbb beszerzési kosár** (akciók + alternatívák) révén. A Plantbase futtatási költsége ehhez képest elhanyagolható.

---

## 1. Ki a „5 fős iroda”?

| Szerep              | Fő    | Plantbase-használat                   |
| ------------------- | ----- | ------------------------------------- |
| Senior lakberendező | 2     | Napi: szobánkénti csomag-összeállítás |
| Lakberendező        | 1     | Ugyanaz                               |
| Junior tervező      | 1     | Csomag-összeállítás, tanulás          |
| Irodavezető / admin | 1     | Ritkán: raktár, ár, gyors ellenőrzés  |
| **Összesen**        | **5** | **4 aktív „csomag-összeállító”**      |

A számításban **4 tervező** havi növénycsomag-munkáját vesszük figyelembe; az admin használata a megtakarításhoz nem számít (de ingyen jár).

---

## 2. Kiinduló feltételek (a BRS-ből)

A [`brs-plantbase.md`](./brs-plantbase.md) persona-modellje:

| Paraméter                          | Érték                | Megjegyzés                            |
| ---------------------------------- | -------------------- | ------------------------------------- |
| Ügyfél / tervező / hó              | 5                    | Növénycsomagot igénylő projektek      |
| Szoba / ügyfél                     | 3                    | Átlagos lakás / iroda                 |
| **Szoba / tervező / hó**           | **15**               | 5 × 3                                 |
| **Szoba / iroda / hó (4 tervező)** | **60**               | 4 × 15                                |
| **Szoba / iroda / év**             | **720**              | 60 × 12                               |
| Idő kézzel / szoba                 | 10–15 perc           | Webshop, méret, raktár, akció, büdzsé |
| **Átlag kézi idő**                 | **12,5 perc**        | (10 + 15) / 2                         |
| **Cél Plantbase-szel (KPI)**       | **< 5 perc / szoba** | BRS sikerkritérium                    |
| **Megtakarítás / szoba**           | **7,5 perc**         | 12,5 − 5                              |

### Mit csinál kézzel a tervező? (forintosítható idő)

1. Webshopok és katalógusok böngészése
2. Méricskélés: `current_height_cm`, `max_height_cm`, `current_pot_cm` vs. szoba
3. Raktárkészlet (`stock > 0`)
4. Akciók (`sale_price`)
5. Büdzsé-illesztés: `COALESCE(sale_price, price)`

Ezeket a Plantbase **egyetlen (vagy néhány) természetes nyelvű kérdéssel** lefedi SQL-lel a `products` táblán — SQL-tudás nélkül.

---

## 3. Hard ROI #1 — Munkaidő-megtakarítás

### Számítás

```
Megtakarított óra/hó = szobák/hó × (kézi − agent) perc / 60
                     = 60 × 7,5 / 60
                     = 7,5 óra/hó

Megtakarított óra/év = 7,5 × 12 = 90 óra/év
```

### Óradíj (belső költség)

| Komponens                                | Összeg          | Forrás / indoklás                 |
| ---------------------------------------- | --------------- | --------------------------------- |
| Bruttó bér (lakberendező, Budapest, mid) | 480 000 Ft/hó   | Piaci sáv ~400–600 ezer (2025–26) |
| Munkáltatói teher (~38%)                 | × 1,38          | Járulék, szabadság, egyéb         |
| Teljes személyköltség                    | ~662 000 Ft/hó  |                                   |
| Hasznos munkaidő                         | ~150 ó/hó       | Tervezés, nem admin               |
| **Belső óradíj**                         | **~4 400 Ft/ó** | 662 000 / 150                     |

**Számlázható alternatíva** (opportunity cost): ha a felszabadult idő új ügyfél-felvételre megy, a piaci tervezői óradíj ~7 000–10 000 Ft. A táblázatban mindkettő szerepel.

| Forgatókönyv                                      | Óradíj   | Éves megtakarítás (90 ó) |
| ------------------------------------------------- | -------- | ------------------------ |
| Konzervatív (csak belső költség, 50% realizálás*) | 4 400 Ft | **~198 000 Ft**          |
| Bázis (teljes belső költség)                      | 4 400 Ft | **~396 000 Ft**          |
| Bázis + opportunity (8 000 Ft/ó)                  | 8 000 Ft | **~720 000 Ft**          |

\* _Konzervatív: feltételezzük, hogy a felszabadult idő fele „elfolyik” (kávé, kontextusváltás), még így is mérhető._

### Kapacitás-bővítés (külön sor, nem duplázzuk a fenti táblát)

90 óra/év ≈ **12 teljes munkanap**. Ez **~6 extra ügyfél** (4 tervező × 1,5 ügyfél/év) a jelenlegi tempó mellett, **új alkalmazás nélkül**.

Ha egy ügyfél átlagos bruttó projekt-díja 350 000 Ft és a ráfordított változó költség 40%:

```
Extra árbevétel ≈ 6 × 350 000 = 2 100 000 Ft/év
Extra fedezet   ≈ 6 × 210 000 = 1 260 000 Ft/év  (nem számít bele a nettó ROI-ba, soft/hard határ)
```

---

## 4. Hard ROI #2 — Olcsóbb beszerzési kosár

Az agent a prompt szerint mindig `COALESCE(sale_price, price)` szerint számol, raktáron lévőt preferál, és olcsóbb alternatívát javasol ([`system-prompt.md`](./system-prompt.md)).

### Seed-adat alapú katalógus-realitás (`seed/plants.ts`, 30 tétel)

| Mutató                                   | Érték            |
| ---------------------------------------- | ---------------- |
| Átlagos listaár                          | ~5 350 Ft        |
| Akciós tételek aránya                    | 7 / 30 ≈ **23%** |
| Átlagos akció mértéke (akciós tételeken) | **~19%**         |
| Tipikus szobacsomag                      | **5 db** növény  |
| **Kosárérték / szoba (átlag)**           | **~26 750 Ft**   | 5 × 5 350 |

### Kézi vs. agent: mi marad le?

| Hatás               | Kézi (becslés)               | Plantbase                        | Különbség                                           |
| ------------------- | ---------------------------- | -------------------------------- | --------------------------------------------------- |
| Akciók kihasználása | ~30% az elérhető akciókból   | ~85%                             | Agent rendszeresen szűr `sale_price IS NOT NULL`-ra |
| Olcsóbb alternatíva | Ritka (ismert 3–4 „kedvenc”) | Kategória + fény + méret alapján | Átl. 10–15% olcsóbb megfelelő csere 20% tételnél    |

**Konzervatív modell** (szobánként):

```
Beszerzési megtakarítás = kosár × (akció_delta + alternatíva_delta)
akció_delta      ≈ 26 750 × 23% × 19% × (85% − 30%) ≈  640 Ft
alternatíva_delta ≈ 26 750 × 20% × 12%               ≈  640 Ft
Összesen / szoba (konzervatív)                        ≈ 1 280 Ft
```

**Bázis modell**: ~1 400 Ft/szoba (realizálható akció- és alternatíva-haszon, nem minden tételnél csere).  
**Optimista**: ~2 800 Ft/szoba (prémium helyett mid-tier csere gyakoribb).

| Forgatókönyv | Ft / szoba | Éves (720 szoba)  |
| ------------ | ---------- | ----------------- |
| Konzervatív  | 800 Ft     | **~576 000 Ft**   |
| Bázis        | 1 400 Ft   | **~1 008 000 Ft** |
| Optimista    | 2 800 Ft   | **~2 016 000 Ft** |

> A megtakarítás **ügyfél büdzséjén marad** (több növény ugyanabból) vagy **magasabb haszonkulcs** (ugyanaz a vizuál, olcsóbb beszerzés). Mindkettő forintosítható.

---

## 5. Költségek (Plantbase használata)

### 5.1 LLM API (Anthropic Claude)

Becsült használat: **4 lekérdezés / szoba** (csomag, raktár, büdzsé-ellenőrzés, finomítás).

| Paraméter                                                       | Érték                                |
| --------------------------------------------------------------- | ------------------------------------ |
| Lekérdezés / hó                                                 | 60 × 4 = **240**                     |
| Token / lekérdezés (belső + válasz, cache-elt system prompttal) | ~6 000 input + 800 output            |
| Költség / lekérdezés (Sonnet-szerű díj, 2026-os nagyságrend)    | ~0,06–0,12 USD                       |
| **Havi API**                                                    | **~15–30 USD** ≈ **6 000–12 000 Ft** |
| **Éves API**                                                    | **~72 000–144 000 Ft**               |

A [`architektura.md`](./architektura.md) prompt cache (`cache_control: ephemeral`) csökkenti az ismétlődő séma-kontextus költségét.

### 5.2 Infrastruktúra (v1)

| Tétel                                    | Éves költség | Megjegyzés                             |
| ---------------------------------------- | ------------ | -------------------------------------- |
| Postgres (docker, helyi)                 | ~0 Ft        | Meglévő gép / OrbStack                 |
| Katalógus-frissítés (CSV/import, 2 ó/hó) | ~105 000 Ft  | 2 × 4 400 × 12                         |
| Bevezetés, betanítás (egyszeri)          | ~80 000 Ft   | ~18 óra × 4 400 (4 fő × 2 óra + setup) |

### 5.3 Összesített éves költség

| Tétel                       | Konzervatív     | Bázis           |
| --------------------------- | --------------- | --------------- |
| API                         | 144 000 Ft      | 100 000 Ft      |
| Katalógus-karbantartás      | 105 000 Ft      | 105 000 Ft      |
| Amortizált bevezetés (3 év) | 27 000 Ft       | 27 000 Ft       |
| **Összes éves költség**     | **~276 000 Ft** | **~232 000 Ft** |

---

## 6. Nettó ROI — éves összesítés

### Bázis forgatókönyv

| Sor                                       | Összeg (Ft/év)       |
| ----------------------------------------- | -------------------- |
| (+) Munkaidő-megtakarítás (90 ó × 4 400)  | +396 000             |
| (+) Beszerzési megtakarítás (720 × 1 400) | +1 008 000           |
| **Bruttó megtakarítás**                   | **1 404 000**        |
| (−) Futási költség                        | −232 000             |
| **Nettó megtakarítás**                    | **~1 172 000 Ft/év** |

### Három forgatókönyv

|                      | Konzervatív  | Bázis          | Optimista      |
| -------------------- | ------------ | -------------- | -------------- |
| Munkaidő             | 198 000      | 396 000        | 720 000        |
| Beszerzés            | 576 000      | 1 008 000      | 2 016 000      |
| **Bruttó**           | **774 000**  | **1 404 000**  | **2 736 000**  |
| Költség              | −276 000     | −232 000       | −200 000       |
| **Nettó**            | **~498 000** | **~1 172 000** | **~2 536 000** |
| Bevezetés (egyszeri) | 80 000       | 80 000         | 80 000         |
| **Megtérülés**       | ~2 hónap     | ~4 hét         | ~2 hét         |

---

## 7. Havi cash-flow (bázis)

```
        Bevétel-oldali hatás (megtakarítás)          Költség
        ─────────────────────────────────          ───────
Hó 1    0 (bevezetés)                               −80 000 (setup)
Hó 2–13 ~117 000/hó  (396k+1008k)/12               −19 000/hó (API+karb.)
```

Stabil üzemben **havi nettó ~98 000 Ft** — kb. **egy senior tervező 2 munkanapjának** belső költsége.

---

## 8. Mi NEM szerepel a hard ROI-ban?

Ezek valósak, de nehezebb forintosítani ([`brs-plantbase.md`](./brs-plantbase.md) soft ROI):

| Hatás                                                  | Miért számít                        |
| ------------------------------------------------------ | ----------------------------------- |
| Gyorsabb ajánlat → magasabb konverzió                  | Kevesebb „elment másikhoz”          |
| Kevesebb hibás rendelés (nincs raktáron / rossz méret) | Kevesebb csere, reklamáció          |
| Jobb illeszkedés (fény, állat, gyerek)                 | Kevesebb garanciális csere          |
| Naplózás (`logs/*.jsonl`)                              | Visszakövethető döntések, betanítás |

---

## 9. Korlátok és feltételezések (v1)

- A számítás a **v1 scope**-ra vonatkozik: read-only `products` katalógus, CLI ([`brs-plantbase.md`](./brs-plantbase.md)).
- A **720 szoba/év** feltételezi, hogy mind a 4 tervező havi ~5 növényes ügyfelet visz — ha kevesebb, arányosan csökken a megtakarítás.
- A beszerzési megtakarítás **csak akkor realizálódik**, ha a katalógus naprakész (ár, akció, raktár) — ehhez a beszállítói adat import kell.
- Az LLM-költség **nem skálázódik lineárisan** a csapatmérettel, ha megosztott katalógus és cache van.
- A **90 óra/év** csak a növénycsomag-fázisra vonatkozik, nem a teljes lakberendezési projektre.

---

## 10. Gyors kalkulátor (saját számokhoz)

```
nettó_éves = szobák_év × (perc_megtakarítás/60 × óradíj + ft_megtakarítás_kosáron)
           − (api_éves + karbantartás_éves)

ahol:
  szobák_év           = tervezők × 5 ügyfél × 3 szoba × 12
  perc_megtakarítás   = kézi_perc − 5   (BRS KPI)
  ft_megtakarítás     = tipikusan 800–2 800 Ft/szoba
```

**Példa (5 fős iroda, 4 tervező, saját óradíj 5 000 Ft):**

```
720 × (7,5/60 × 5 000 + 1 400) − 232 000
= 720 × (625 + 1 400) − 232 000
= 1 458 000 − 232 000
≈ 1 226 000 Ft/év nettó
```

---

## 11. Következtetés

Egy **5 fős lakberendező iroda** számára a Plantbase **konzervativ becsléssel is pozitív ROI-t** hoz már az első negyedévben:

1. **~90 óra/év** adminisztratív keresgélés helyett tervezésre vagy ügyfélre fordítható idő.
2. **~0,5–2,0 M Ft/év** beszerzési optimalizálás a katalógus akcióin és alternatíváin keresztül.
3. **~200–280 ezer Ft/év** teljes futási költség — az API és a katalógus-frissítés.

A **bázis nettó ~1,17 M Ft/év** reális cél, ha a csapat ténylegesen átveszi a CLI-t a napi csomag-összeállításban, és a beszállítói katalógus naprakész marad.

---

_Utolsó frissítés: 2026-07-04 — illeszkedik a BRS KPI-khoz és a v1 Plantbase scope-hoz._
